"use client";

import { useQueryClient } from "@tanstack/react-query";
import { fetchStoreProductDetailCached, STORE_STALE_MS } from "@/lib/query/store";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Clock,
  Crown,
  Infinity as InfinityIcon,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Pagination from "@/components/ui/Pagination";
import { scrollToTop, usePageParam } from "@/hooks/usePageParam";
import { useCart } from "@/features/cart/context/CartContext";
import { useGallery } from "@/features/character/context/GalleryContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/api/auth";
import { fetchPublicSubscriptionPlans } from "@/lib/api/subscriptions";
import type { CatalogProduct } from "@/features/cart/catalog";

const formatPrice = (price: number) => `${price.toLocaleString("vi-VN")} VNĐ`;

function useSubscriptionGridLayout(): {
  columns: 1 | 2 | 3;
  rows: number;
  pageSize: number;
  isDesktop: boolean;
  ready: boolean;
} {
  const [layout, setLayout] = useState<{
    columns: 1 | 2 | 3;
    rows: number;
    isDesktop: boolean;
    ready: boolean;
  }>({
    columns: 3,
    rows: 1,
    isDesktop: true,
    ready: false,
  });

  useEffect(() => {
    let timer: number | undefined;
    const compute = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isDesktop = width >= 1024;
      const columns: 1 | 2 | 3 = isDesktop ? 3 : width >= 768 ? 2 : 1;
      // Header (106px) + main py (24px) + top bar (52px) + pager (52px) + gaps (24px) = ~258px
      const chromeHeight = 264;
      const estimatedRowHeight = 380;
      const rowGap = 14;
      const rows = isDesktop
        ? Math.max(
            1,
            Math.min(
              2,
              Math.floor((Math.max(0, height - chromeHeight) + rowGap) / (estimatedRowHeight + rowGap)),
            ),
          )
        : columns === 2
          ? 2
          : 3;
      setLayout({ columns, rows, isDesktop, ready: true });
    };

    compute();
    const onResize = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(compute, 120);
    };
    window.addEventListener("resize", onResize);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return {
    columns: layout.columns,
    rows: layout.rows,
    pageSize: layout.columns * layout.rows,
    isDesktop: layout.isDesktop,
    ready: layout.ready,
  };
}

export default function SubscriptionsStorePage() {
  const router = useRouter();
  const { items: cartItems, addItem } = useCart();
  const {
    activeSubscriptions,
    hasAllAccessCharacters,
    maxCommissionRevisions,
    maxMobileProfiles,
    ownedAllAccessOnlyPrice,
  } = useGallery();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [plans, setPlans] = useState<CatalogProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { rows, pageSize, isDesktop, ready } = useSubscriptionGridLayout();
  const [page, setPage] = usePageParam();
  const gridRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    // Danh sách gói + chi tiết từng gói (BE chưa trả quyền lợi trong danh sách) đều qua cache 5 phút.
    queryClient
      .fetchQuery({
        queryKey: ["store", "subscription-plans"],
        queryFn: () =>
          fetchPublicSubscriptionPlans({
            loadDetail: (productId) => fetchStoreProductDetailCached(queryClient, productId),
          }),
        staleTime: STORE_STALE_MS,
      })
      .then((list) => {
        if (!cancelled) setPlans(list);
      })
      .catch(() => {
        if (!cancelled) setPlans([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  const totalPages = Math.max(1, Math.ceil(plans.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedPlans = useMemo(
    () => plans.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [plans, currentPage, pageSize],
  );

  // Clamp out-of-range URL page when resize increases pageSize
  useEffect(() => {
    if (!isLoading && ready && page > totalPages) {
      setPage(totalPages);
    }
  }, [isLoading, ready, page, totalPages, setPage]);

  const changePage = (next: number) => {
    setPage(next);
    if (!isDesktop) {
      scrollToTop(gridRef.current);
    }
  };

  const handleAddToCart = async (plan: CatalogProduct) => {
    setActionError(null);
    if (!isAuthenticated && !authLoading) {
      router.push("/login?redirect=/subscriptions");
      return;
    }

    const numericId = Number(plan.id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      setActionError("Mã sản phẩm gói hội viên không hợp lệ.");
      return;
    }

    const alreadyInCart = cartItems.some(
      (c) => c.productId === numericId || String(c.id) === String(plan.id),
    );

    if (alreadyInCart) {
      return;
    }

    setBusyId(plan.id);
    try {
      await addItem(plan, 1);
      setAddedId(plan.id);
      setTimeout(() => setAddedId((prev) => (prev === plan.id ? null : prev)), 3000);
    } catch (err) {
      setActionError(
        getApiErrorMessage(err, "Không thể thêm gói hội viên vào giỏ hàng."),
      );
    } finally {
      setBusyId(null);
    }
  };

  const activeBenefitsSummary = [
    hasAllAccessCharacters ? "Mở khóa toàn bộ thư viện nhân vật" : null,
    maxMobileProfiles > 3 ? `Tối đa ${maxMobileProfiles} profile chữ Mobile` : null,
    maxCommissionRevisions > 0 ? `${maxCommissionRevisions} lượt sửa miễn phí/đơn` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <Header />
      <main className="flex-1 bg-[#f7fbf8] py-5 lg:h-[calc(100dvh-106px)] lg:flex-none lg:overflow-hidden lg:py-3">
        <div className="container mx-auto flex max-w-6xl flex-col gap-3 px-4 lg:h-full lg:min-h-0">
          {/* Compact Membership Header Bar */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-2.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 border-2 border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                  <Crown size={12} /> LUMINTRA MEMBERSHIP
                </span>
                <h1 className="text-xl font-black uppercase tracking-tight text-[#155e59] sm:text-2xl">
                  Gói Hội Viên Pixel Art
                </h1>
              </div>
              <p className="mt-0.5 line-clamp-1 text-xs font-medium text-[#4a6658]">
                Mở khóa kho nhân vật Pixel Art độc quyền, đồng bộ lên màn hình LED và nhận thêm quyền lợi thành viên.
              </p>
            </div>

            {activeSubscriptions.length > 0 && (
              <div
                title={activeBenefitsSummary || undefined}
                className="flex flex-wrap items-center gap-2 border-2 border-[#155e59] bg-[#e3f5e9] px-2.5 py-1.5 text-xs text-[#155e59]"
              >
                <span className="inline-flex items-center gap-1.5 font-black">
                  <Crown size={14} className="shrink-0" />
                  Đang dùng:{" "}
                  {activeSubscriptions
                    .map((sub) => sub.planName || sub.planCode || "Hội viên VIP")
                    .join(" · ")}
                </span>
                <div className="flex items-center gap-1.5">
                  <Link
                    href="/profile/subscription"
                    className="inline-flex h-7 items-center border border-[#155e59] bg-white px-2 text-[11px] font-black uppercase text-[#155e59] hover:bg-[#f4fbf6]"
                  >
                    Quyền lợi
                  </Link>
                  {hasAllAccessCharacters && (
                    <Link
                      href="/profile/gallery"
                      className="btn-primary inline-flex h-7 items-center px-2! py-0! text-[11px] font-black uppercase"
                    >
                      Thư viện
                    </Link>
                  )}
                  {maxCommissionRevisions > 0 && (
                    <Link
                      href="/commission/new"
                      className="inline-flex h-7 items-center border border-[#155e59] bg-white px-2 text-[11px] font-black uppercase text-[#155e59] hover:bg-[#f4fbf6]"
                    >
                      Đặt Commission
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {actionError && (
            <div className="flex shrink-0 items-start gap-2 border-2 border-red-600 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {isLoading || !ready ? (
            <div
              aria-busy="true"
              className="grid min-h-0 flex-1 grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3"
              style={isDesktop ? { gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` } : undefined}
            >
              <span className="sr-only" role="status">
                Đang tải các gói hội viên...
              </span>
              {Array.from({ length: ready ? pageSize : 3 }).map((_, idx) => (
                <div
                  key={idx}
                  aria-hidden="true"
                  className="neo-box-no-hover flex h-full min-h-[280px] animate-pulse flex-col justify-between bg-white p-4"
                >
                  <div className="space-y-3">
                    <div className="h-5 w-24 bg-gray-200" />
                    <div className="h-24 w-full bg-gray-100" />
                    <div className="h-5 w-2/3 bg-gray-200" />
                    <div className="h-7 w-1/2 bg-gray-200" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-3">
                    <div className="h-9 bg-gray-100" />
                    <div className="h-9 bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="neo-box-no-hover flex flex-1 flex-col items-center justify-center bg-white p-10 text-center">
              <Crown size={36} className="mx-auto mb-3 text-[#8fc7a0]" />
              <p className="text-base font-black text-[#155e59]">
                Hiện chưa có gói hội viên nào được mở bán
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Vui lòng quay lại sau hoặc khám phá các sản phẩm khác tại cửa hàng.
              </p>
              <Link
                href="/products"
                className="btn-primary mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold"
              >
                Xem cửa hàng sản phẩm
              </Link>
            </div>
          ) : (
            <>
              <div
                ref={gridRef}
                className="grid min-h-0 flex-1 grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3"
                style={
                  isDesktop && pagedPlans.length > 0
                    ? { gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }
                    : undefined
                }
              >
                {pagedPlans.map((plan) => {
                  const sub = plan.subscriptionDetails;
                  const isLifetime = Boolean(sub?.isLifetime);
                  const durationDays = sub?.durationDays;
                  const allAccess = Boolean(sub?.allAccessCharacters);
                  const planCommissionRevisions = Number(sub?.maxCommissionRevisions ?? 0);
                  const planMobileProfiles = Number(sub?.maxMobileProfiles ?? 3);
                  const isBusy = busyId === plan.id;
                  const isAdded = addedId === plan.id;
                  const inCart = cartItems.some(
                    (c) => c.productId === Number(plan.id) || String(c.id) === String(plan.id),
                  );
                  const isDirectActivePlan = activeSubscriptions.some(
                    (active) =>
                      active.productId === Number(plan.id) ||
                      (sub?.planCode != null && active.planCode === sub.planCode),
                  );
                  const isAllAccessOnlyPlan =
                    allAccess && planMobileProfiles <= 3 && planCommissionRevisions <= 0;
                  const isAllAccessUpgradePlan =
                    allAccess && (planMobileProfiles > 3 || planCommissionRevisions > 0);
                  const isCoveredByHigherAllAccess = isAllAccessOnlyPlan && hasAllAccessCharacters;
                  const isCurrentActivePlan = isDirectActivePlan || isCoveredByHigherAllAccess;

                  const upgradeDeduction =
                    !isCurrentActivePlan &&
                    isAllAccessUpgradePlan &&
                    ownedAllAccessOnlyPrice != null &&
                    ownedAllAccessOnlyPrice > 0
                      ? ownedAllAccessOnlyPrice
                      : 0;
                  const effectivePrice = Math.max(0, plan.price - upgradeDeduction);
                  const disableBuy = isBusy || inCart || isCurrentActivePlan;

                  return (
                    <article
                      key={plan.id}
                      className={`neo-box flex h-full min-h-0 flex-col justify-between bg-white p-4 transition-transform hover:-translate-y-0.5 ${
                        isAllAccessUpgradePlan ? "ring-2 ring-[#155e59]" : ""
                      }`}
                    >
                      <div className="flex min-h-0 flex-1 flex-col">
                        <div className="flex shrink-0 items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase ${
                              isLifetime
                                ? "bg-[#155e59] text-white"
                                : "bg-[#e3f5e9] text-[#155e59]"
                            }`}
                          >
                            {isLifetime ? (
                              <>
                                <InfinityIcon size={12} /> Trọn đời
                              </>
                            ) : (
                              <>
                                <Clock size={12} /> {durationDays ?? 30} ngày
                              </>
                            )}
                          </span>
                          {sub?.planCode && (
                            <span className="font-mono text-[11px] font-bold text-[#66736b]">
                              {sub.planCode}
                            </span>
                          )}
                        </div>

                        {plan.previewUrl && (
                          <div
                            className={`mt-2.5 w-full overflow-hidden rounded-lg border-2 border-black bg-[#f4fbf6] ${
                              isDesktop ? "min-h-[68px] flex-1" : "h-32"
                            }`}
                          >
                            <img
                              src={plan.previewUrl}
                              alt={plan.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}

                        <h2
                          title={sub?.planName || plan.name}
                          className="mt-2.5 line-clamp-1 shrink-0 text-base font-black text-[#155e59] sm:text-lg"
                        >
                          {sub?.planName || plan.name}
                        </h2>

                        <div className="mt-1 shrink-0">
                          {upgradeDeduction > 0 && (
                            <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-bold text-text-muted line-through">
                                {formatPrice(plan.price)}
                              </span>
                              <span className="rounded bg-[#e3f5e9] px-1.5 py-0.5 text-[10px] font-black text-[#155e59]">
                                Đã trừ {formatPrice(upgradeDeduction)} gói Full nhân vật
                              </span>
                            </div>
                          )}
                          <div className="flex items-baseline gap-1.5">
                            <strong className="text-2xl font-black tabular-nums text-[#1f432b]">
                              {formatPrice(effectivePrice)}
                            </strong>
                            <span className="text-[11px] font-semibold text-text-muted">
                              {isLifetime ? "/ vĩnh viễn" : `/ ${durationDays ?? 30} ngày`}
                            </span>
                          </div>
                        </div>

                        <ul className="mt-2.5 shrink-0 space-y-1.5 border-t border-[#e5efe7] pt-2.5 text-xs text-[#26352f]">
                          {allAccess && (
                            <li className="flex items-start gap-1.5">
                              <Sparkles size={14} className="mt-0.5 shrink-0 text-[#2d6a4f]" />
                              <span className="line-clamp-1 font-semibold">
                                Mở khóa toàn bộ thư viện nhân vật
                              </span>
                            </li>
                          )}
                          {planMobileProfiles > 3 && (
                            <li className="flex items-start gap-1.5">
                              <Sparkles size={14} className="mt-0.5 shrink-0 text-[#2d6a4f]" />
                              <span className="line-clamp-1 font-semibold">
                                Tối đa {planMobileProfiles} profile chữ trên ứng dụng Mobile
                              </span>
                            </li>
                          )}
                          {planCommissionRevisions > 0 && (
                            <li className="flex items-start gap-1.5">
                              <Sparkles size={14} className="mt-0.5 shrink-0 text-[#2d6a4f]" />
                              <span className="line-clamp-1 font-semibold">
                                {planCommissionRevisions} lượt chỉnh sửa miễn phí cho mỗi đơn thiết kế
                              </span>
                            </li>
                          )}
                        </ul>
                      </div>

                      <div className="mt-3 shrink-0 space-y-2 pt-1">
                        {isCurrentActivePlan && (
                          <Link
                            href={allAccess ? "/profile/gallery" : "/commission/new"}
                            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border-2 border-black bg-[#e3f5e9] text-xs font-black text-[#155e59]"
                          >
                            <Check size={14} />
                            {isDirectActivePlan ? "Đang sử dụng gói này" : "Đã bao gồm trong gói hiện tại"}
                          </Link>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={disableBuy}
                            onClick={() => handleAddToCart({ ...plan, price: effectivePrice })}
                            className="btn-secondary flex h-9 items-center justify-center gap-1.5 py-0! text-xs font-bold disabled:opacity-60"
                          >
                            <ShoppingBag size={13} />
                            {isCurrentActivePlan
                              ? "Đã kích hoạt"
                              : inCart || isAdded
                                ? "Đã trong giỏ"
                                : upgradeDeduction > 0
                                  ? "Nâng cấp ngay"
                                  : "Thêm vào giỏ"}
                          </button>
                          <Link
                            href={`/products/${plan.id}`}
                            className="flex h-9 items-center justify-center rounded-lg border-2 border-black bg-white text-xs font-bold text-[#155e59] hover:bg-gray-50"
                          >
                            Xem chi tiết
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <Pagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={changePage}
                totalItems={plans.length}
                pageSize={pageSize}
                itemLabel="gói hội viên"
                ariaLabel="Phân trang gói hội viên"
                variant="neo"
                alwaysShow
                className="mt-auto shrink-0 py-2!"
              />
            </>
          )}
        </div>
      </main>
    </>
  );
}
