"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Clock,
  Crown,
  Infinity as InfinityIcon,
  Loader2,
  ShoppingBag,
  Sparkles,
  Zap,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/features/cart/context/CartContext";
import { useGallery } from "@/features/character/context/GalleryContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/api/auth";
import { fetchPublicSubscriptionPlans } from "@/lib/api/subscriptions";
import type { CatalogProduct } from "@/features/cart/catalog";

const formatPrice = (price: number) => `${price.toLocaleString("vi-VN")} VNĐ`;

export default function SubscriptionsStorePage() {
  const router = useRouter();
  const { items: cartItems, addItem } = useCart();
  const { activeSubscription } = useGallery();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [plans, setPlans] = useState<CatalogProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchPublicSubscriptionPlans()
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
  }, []);

  const handleBuyOrAdd = async (plan: CatalogProduct, redirectToCheckout: boolean) => {
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

    if (alreadyInCart && redirectToCheckout) {
      router.push("/checkout");
      return;
    }

    setBusyId(plan.id);
    try {
      await addItem(plan, 1);
      if (redirectToCheckout) {
        router.push("/checkout");
      } else {
        setAddedId(plan.id);
        setTimeout(() => setAddedId((prev) => (prev === plan.id ? null : prev)), 3000);
      }
    } catch (err) {
      setActionError(
        getApiErrorMessage(err, "Không thể thêm gói hội viên vào giỏ hàng."),
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-[#f7fbf8] py-12">
        <div className="container mx-auto max-w-6xl px-4">
          {/* Hero */}
          <div className="mb-10 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#155e59] bg-[#e3f5e9] px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#155e59]">
              <Crown size={14} /> LUMINTRA MEMBERSHIP
            </span>
            <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-[#155e59] sm:text-4xl">
              Gói Hội Viên Pixel Art
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-[#4a6658] sm:text-base">
              Nâng cấp tài khoản để mở khóa kho nhân vật Pixel Art độc quyền, đồng bộ trực tiếp lên
              màn hình LED của bạn và tận hưởng quyền lợi không giới hạn.
            </p>
          </div>

          {activeSubscription && (
            <div className="mx-auto mb-6 flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-[#155e59] bg-[#e3f5e9] p-4 text-sm text-[#155e59]">
              <div className="flex items-start gap-2.5">
                <Crown size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-black">
                    Bạn đang kích hoạt gói:{" "}
                    {activeSubscription.planName || activeSubscription.planCode || "Hội viên VIP"}
                  </p>
                  <p className="text-xs font-medium text-[#2d6a4f]">
                    {activeSubscription.allAccessCharacters
                      ? "Toàn bộ nhân vật trên cửa hàng đã được mở khóa trong Thư viện nhân vật của bạn."
                      : "Gói hội viên hiện tại đang có hiệu lực."}
                  </p>
                </div>
              </div>
              {activeSubscription.allAccessCharacters && (
                <Link
                  href="/profile/gallery"
                  className="btn-primary px-4 py-2 text-xs font-black uppercase"
                >
                  Mở thư viện nhân vật
                </Link>
              )}
            </div>
          )}

          {actionError && (
            <div className="mx-auto mb-6 flex max-w-2xl items-start gap-2.5 rounded-xl border-2 border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {isLoading ? (
            <div className="neo-box-no-hover bg-white p-12 text-center text-sm font-bold text-text-muted">
              Đang tải các gói hội viên...
            </div>
          ) : plans.length === 0 ? (
            <div className="neo-box-no-hover bg-white p-12 text-center">
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => {
                const sub = plan.subscriptionDetails;
                const isLifetime = Boolean(sub?.isLifetime);
                const durationDays = sub?.durationDays;
                const allAccess = Boolean(sub?.allAccessCharacters ?? true);
                const isBusy = busyId === plan.id;
                const isAdded = addedId === plan.id;
                const inCart = cartItems.some(
                  (c) => c.productId === Number(plan.id) || String(c.id) === String(plan.id),
                );
                const isCurrentActivePlan =
                  activeSubscription != null &&
                  (activeSubscription.productId === Number(plan.id) ||
                    (sub?.planCode != null && activeSubscription.planCode === sub.planCode));
                const hasAnyActivePlan = activeSubscription != null;

                return (
                  <article
                    key={plan.id}
                    className={`neo-box flex flex-col justify-between bg-white p-6 transition-transform hover:-translate-y-1 ${
                      isLifetime ? "ring-2 ring-[#155e59]" : ""
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black uppercase ${
                            isLifetime
                              ? "bg-[#155e59] text-white"
                              : "bg-[#e3f5e9] text-[#155e59]"
                          }`}
                        >
                          {isLifetime ? (
                            <>
                              <InfinityIcon size={13} /> Trọn đời
                            </>
                          ) : (
                            <>
                              <Clock size={13} /> {durationDays ?? 30} ngày
                            </>
                          )}
                        </span>
                        {sub?.planCode && (
                          <span className="font-mono text-xs font-bold text-[#66736b]">
                            {sub.planCode}
                          </span>
                        )}
                      </div>

                      {plan.previewUrl && (
                        <div className="mt-4 h-36 w-full overflow-hidden rounded-lg border-2 border-black bg-[#f4fbf6]">
                          <img
                            src={plan.previewUrl}
                            alt={plan.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}

                      <h2 className="mt-4 text-xl font-black text-[#155e59]">
                        {sub?.planName || plan.name}
                      </h2>

                      <div className="mt-3 flex items-baseline gap-1.5">
                        <strong className="text-3xl font-black text-[#1f432b]">
                          {formatPrice(plan.price)}
                        </strong>
                        <span className="text-xs font-semibold text-text-muted">
                          {isLifetime ? "/ vĩnh viễn" : `/ ${durationDays ?? 30} ngày`}
                        </span>
                      </div>

                      <p className="mt-3 min-h-[40px] text-sm text-text-muted">
                        {plan.description ||
                          "Truy cập và tải xuống các nhân vật Pixel Art bản quyền cho thiết bị LED."}
                      </p>

                      <ul className="mt-5 space-y-2.5 border-t border-[#e5efe7] pt-4 text-sm text-[#26352f]">
                        {allAccess && (
                          <li className="flex items-start gap-2">
                            <Sparkles size={16} className="mt-0.5 shrink-0 text-[#2d6a4f]" />
                            <span className="font-semibold">
                              Mở khóa toàn bộ thư viện Character Pixel Art
                            </span>
                          </li>
                        )}
                        <li className="flex items-start gap-2">
                          <Check size={16} className="mt-0.5 shrink-0 text-[#2d6a4f]" />
                          <span>Đồng bộ không giới hạn lên thiết bị LED Lumintra</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={16} className="mt-0.5 shrink-0 text-[#2d6a4f]" />
                          <span>
                            {isLifetime
                              ? "Thanh toán 1 lần, sở hữu quyền lợi vĩnh viễn"
                              : `Hiệu lực ngay sau khi thanh toán trong ${durationDays ?? 30} ngày`}
                          </span>
                        </li>
                      </ul>
                    </div>

                    <div className="mt-6 space-y-2.5 pt-2">
                      {hasAnyActivePlan ? (
                        <Link
                          href={activeSubscription?.allAccessCharacters ? "/profile/gallery" : `/products/${plan.id}`}
                          className={`flex w-full items-center justify-center gap-2 rounded-lg border-2 border-black py-2.5 text-sm font-black ${
                            isCurrentActivePlan
                              ? "bg-[#e3f5e9] text-[#155e59]"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <Check size={16} />
                          {isCurrentActivePlan ? "Đang sử dụng gói này" : "Tài khoản đã có gói hội viên"}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleBuyOrAdd(plan, true)}
                          className="btn-primary flex w-full items-center justify-center gap-2 py-2.5 text-sm font-black disabled:opacity-50"
                        >
                          {isBusy ? (
                            <>
                              <Loader2 size={16} className="animate-spin" /> Đang xử lý...
                            </>
                          ) : (
                            <>
                              <Zap size={16} /> {inCart ? "Thanh toán ngay" : "Mua gói ngay"}
                            </>
                          )}
                        </button>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={isBusy || inCart || hasAnyActivePlan}
                          onClick={() => handleBuyOrAdd(plan, false)}
                          className="btn-secondary flex items-center justify-center gap-1.5 py-2 text-xs font-bold disabled:opacity-60"
                        >
                          <ShoppingBag size={14} />
                          {hasAnyActivePlan
                            ? isCurrentActivePlan
                              ? "Đã kích hoạt"
                              : "Đã có gói"
                            : inCart || isAdded
                              ? "Đã trong giỏ"
                              : "Thêm vào giỏ"}
                        </button>
                        <Link
                          href={`/products/${plan.id}`}
                          className="flex items-center justify-center rounded-lg border-2 border-black bg-white py-2 text-xs font-bold text-[#155e59] hover:bg-gray-50"
                        >
                          Xem chi tiết
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
