"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  History,
  Image as ImageIcon,
  Infinity as InfinityIcon,
  Loader2,
  RefreshCw,
  Smartphone,
  Sparkles,
  Tag,
} from "lucide-react";
import CustomerSidebar from "@/components/layout/CustomerSidebar";
import Header from "@/components/layout/Header";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ENTITLEMENTS_CHANGED_EVENT } from "@/features/character/services/entitlement.service";
import { ORDERS_CHANGED_EVENT } from "@/features/order/services/order.service";
import {
  fetchCustomerSubscriptionBenefits,
  formatOwnedCharactersError,
  type CustomerSubscriptionBenefits,
} from "@/lib/api/customerCharacters";
import { formatPrice } from "@/lib/currency";

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRemainingDaysLabel(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null;
  const end = Date.parse(expiresAt);
  if (Number.isNaN(end)) return null;
  const diffMs = end - Date.now();
  if (diffMs <= 0) return "Đã hết hạn";
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return `Còn ${days} ngày`;
}

export default function CustomerSubscriptionBenefitsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [benefits, setBenefits] = useState<CustomerSubscriptionBenefits | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBenefits = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role !== "CUSTOMER") {
      setBenefits(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCustomerSubscriptionBenefits();
      setBenefits(data);
    } catch (err) {
      setError(
        formatOwnedCharactersError(
          err,
          "Không thể tải thông tin quyền lợi gói hội viên của bạn.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated, user?.role]);

  useEffect(() => {
    void loadBenefits();
    window.addEventListener(ENTITLEMENTS_CHANGED_EVENT, loadBenefits);
    window.addEventListener(ORDERS_CHANGED_EVENT, loadBenefits);
    return () => {
      window.removeEventListener(ENTITLEMENTS_CHANGED_EVENT, loadBenefits);
      window.removeEventListener(ORDERS_CHANGED_EVENT, loadBenefits);
    };
  }, [loadBenefits]);

  const effectiveMobileProfiles = benefits?.maxMobileProfiles ?? 3;
  const defaultMobileProfiles = benefits?.defaultMobileProfiles ?? 3;
  const effectiveCommissionRevisions = benefits?.maxCommissionRevisions ?? 1;
  const defaultCommissionRevisions = benefits?.defaultCommissionRevisions ?? 1;
  const hasAllAccess = Boolean(benefits?.allAccessCharacters);
  const upgradeCredit = benefits?.upgradeCreditAvailable ?? 0;

  return (
    <>
      <Header />
      <main className="flex-1 bg-background py-6 text-text-main md:py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 lg:flex-row lg:items-start">
          <CustomerSidebar />

          <div className="min-w-0 flex-1 space-y-5">
            {/* Page Header */}
            <section className="neo-box-no-hover flex flex-wrap items-center justify-between gap-4 bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-black bg-primary text-black shadow-[2px_2px_0_0_#000]">
                  <Crown size={20} />
                </span>
                <div>
                  <h1 className="text-lg font-black uppercase tracking-wide text-black sm:text-xl">
                    Quyền lợi gói hội viên
                  </h1>
                  <p className="text-xs font-medium text-text-muted">
                    Xem toàn bộ đặc quyền đang hiệu lực, hạn mức tài khoản và lịch sử gói đã mua.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadBenefits()}
                  disabled={isLoading}
                  className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0_0_#000] disabled:opacity-50"
                >
                  <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
                  Làm mới
                </button>
                <Link
                  href="/subscriptions"
                  className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
                >
                  <Crown size={13} />
                  Xem các gói hội viên
                </Link>
              </div>
            </section>

            {/* Unauthenticated / Non-customer Guard */}
            {!authLoading && (!isAuthenticated || user?.role !== "CUSTOMER") ? (
              <section className="neo-box-no-hover bg-white p-8 text-center">
                <Crown size={36} className="mx-auto mb-3 text-primary-ink" />
                <h2 className="text-base font-black uppercase text-black">
                  Đăng nhập để xem quyền lợi gói hội viên
                </h2>
                <p className="mt-1.5 text-xs font-medium text-text-muted">
                  Vui lòng đăng nhập bằng tài khoản Khách hàng để xem trạng thái và quyền lợi các gói đã kích hoạt.
                </p>
                <Link
                  href="/login?returnUrl=/profile/subscription"
                  className="btn-primary mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
                >
                  Đăng nhập ngay <ArrowRight size={14} />
                </Link>
              </section>
            ) : isLoading ? (
              <section className="neo-box-no-hover flex flex-col items-center justify-center bg-white py-16 text-center">
                <Loader2 size={28} className="animate-spin text-primary-ink" />
                <p className="mt-3 text-xs font-black uppercase tracking-wider text-text-muted">
                  Đang tải quyền lợi gói hội viên...
                </p>
              </section>
            ) : error ? (
              <section
                role="alert"
                className="neo-box-no-hover border-red-600 bg-white p-8 text-center"
              >
                <AlertCircle className="mx-auto mb-3 text-red-600" size={34} />
                <h2 className="text-base font-black uppercase text-black">
                  Không thể tải quyền lợi hội viên
                </h2>
                <p className="mt-1.5 text-xs font-semibold text-red-700">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadBenefits()}
                  className="btn-primary mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
                >
                  <RefreshCw size={14} /> Thử lại
                </button>
              </section>
            ) : (
              <>
                {/* 3 Effective Benefit KPI Cards */}
                <section aria-label="Tổng hợp quyền lợi hiện tại" className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* Card 1: Character Library */}
                  <div className="neo-box-no-hover flex flex-col justify-between bg-white p-4">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex h-9 w-9 items-center justify-center border-2 border-black bg-primary/30 text-primary-ink shadow-[2px_2px_0_0_#000]">
                          <ImageIcon size={17} />
                        </span>
                        <span
                          className={`border border-black px-2 py-0.5 text-[10px] font-black uppercase ${
                            hasAllAccess ? "bg-primary text-black" : "bg-gray-100 text-text-muted"
                          }`}
                        >
                          {hasAllAccess ? "Đã mở khóa" : "Mặc định"}
                        </span>
                      </div>
                      <p className="mt-3 text-[11px] font-black uppercase tracking-wider text-text-muted">
                        Thư viện nhân vật
                      </p>
                      <p className="mt-1 text-lg font-black uppercase text-black">
                        {hasAllAccess ? "Toàn bộ nhân vật" : "Mua lẻ từng mẫu"}
                      </p>
                      <p className="mt-1 text-xs font-medium text-text-muted">
                        {hasAllAccess
                          ? "Sử dụng miễn phí toàn bộ nhân vật đang mở bán trên cửa hàng."
                          : "Sở hữu vĩnh viễn các nhân vật bạn đã mua hoặc nâng cấp gói mở khóa tất cả."}
                      </p>
                    </div>
                    <Link
                      href={hasAllAccess ? "/profile/gallery" : "/subscriptions"}
                      className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase text-primary-ink hover:underline"
                    >
                      {hasAllAccess ? "Mở thư viện nhân vật" : "Mở khóa toàn bộ"}
                      <ArrowRight size={13} />
                    </Link>
                  </div>

                  {/* Card 2: Mobile Text Profiles */}
                  <div className="neo-box-no-hover flex flex-col justify-between bg-white p-4">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex h-9 w-9 items-center justify-center border-2 border-black bg-[#e0e7ff] text-black shadow-[2px_2px_0_0_#000]">
                          <Smartphone size={17} />
                        </span>
                        <span
                          className={`border border-black px-2 py-0.5 text-[10px] font-black uppercase ${
                            effectiveMobileProfiles > defaultMobileProfiles
                              ? "bg-[#e0e7ff] text-black"
                              : "bg-gray-100 text-text-muted"
                          }`}
                        >
                          {effectiveMobileProfiles > defaultMobileProfiles
                            ? `Nâng từ ${defaultMobileProfiles}`
                            : "Mặc định"}
                        </span>
                      </div>
                      <p className="mt-3 text-[11px] font-black uppercase tracking-wider text-text-muted">
                        Profile chữ App Mobile
                      </p>
                      <p className="mt-1 text-lg font-black uppercase tabular-nums text-black">
                        Tối đa {effectiveMobileProfiles} profile
                      </p>
                      <p className="mt-1 text-xs font-medium text-text-muted">
                        Đồng bộ tự động sang ứng dụng Lumintra Mobile khi bạn mở màn hình Chạy chữ.
                      </p>
                    </div>
                    <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-text-muted">
                      Hạn mức tài khoản thường: {defaultMobileProfiles} profile
                    </span>
                  </div>

                  {/* Card 3: Free Commission Revisions */}
                  <div className="neo-box-no-hover flex flex-col justify-between bg-white p-4">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex h-9 w-9 items-center justify-center border-2 border-black bg-[#fef08a] text-black shadow-[2px_2px_0_0_#000]">
                          <Sparkles size={17} />
                        </span>
                        <span
                          className={`border border-black px-2 py-0.5 text-[10px] font-black uppercase ${
                            effectiveCommissionRevisions > defaultCommissionRevisions
                              ? "bg-[#fef08a] text-black"
                              : "bg-gray-100 text-text-muted"
                          }`}
                        >
                          {effectiveCommissionRevisions > defaultCommissionRevisions
                            ? `Nâng từ ${defaultCommissionRevisions}`
                            : "Mặc định"}
                        </span>
                      </div>
                      <p className="mt-3 text-[11px] font-black uppercase tracking-wider text-text-muted">
                        Chỉnh sửa thiết kế miễn phí
                      </p>
                      <p className="mt-1 text-lg font-black uppercase tabular-nums text-black">
                        {effectiveCommissionRevisions} lượt / mỗi đơn
                      </p>
                      <p className="mt-1 text-xs font-medium text-text-muted">
                        Áp dụng tự động cho từng yêu cầu thiết kế riêng (Commission) khi gói còn hiệu lực.
                      </p>
                    </div>
                    <Link
                      href="/commission/new"
                      className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase text-primary-ink hover:underline"
                    >
                      Đặt thiết kế riêng ngay <ArrowRight size={13} />
                    </Link>
                  </div>
                </section>

                {/* Upgrade Credit Callout */}
                {upgradeCredit > 0 && (
                  <section className="flex flex-wrap items-center justify-between gap-4 border-2 border-black bg-[#fef08a] px-5 py-4 shadow-[3px_3px_0_0_#000]">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-white text-black shadow-[2px_2px_0_0_#000]">
                        <Tag size={17} />
                      </span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-black">
                          Ưu đãi nâng cấp lên Gói VIP Ultimate Trọn Đời
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-black/80">
                          Bạn đang sở hữu gói Toàn bộ nhân vật — hệ thống sẽ tự động{" "}
                          <strong className="font-black text-black">
                            trừ trực tiếp {formatPrice(upgradeCredit)}
                          </strong>{" "}
                          khi bạn nâng cấp lên gói Ultimate (20 profile Mobile + 10 lượt chỉnh sửa miễn phí / đơn).
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/subscriptions"
                      className="btn-primary shrink-0 px-4 py-2 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
                    >
                      Nâng cấp ngay
                    </Link>
                  </section>
                )}

                {/* Active Subscriptions List */}
                <section className="neo-box-no-hover bg-white p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-primary-ink" />
                      <h2 className="text-sm font-black uppercase tracking-wider text-black">
                        Gói hội viên đang kích hoạt ({benefits?.activeSubscriptions.length ?? 0})
                      </h2>
                    </div>
                    <Link
                      href="/subscriptions"
                      className="text-xs font-black uppercase text-primary-ink hover:underline"
                    >
                      Nâng cấp / mua thêm gói →
                    </Link>
                  </div>

                  {!benefits || benefits.activeSubscriptions.length === 0 ? (
                    <div className="border-2 border-dashed border-black bg-gray-50 p-8 text-center">
                      <Crown size={32} className="mx-auto mb-2.5 text-primary-ink" />
                      <p className="text-sm font-black uppercase text-black">
                        Bạn chưa kích hoạt gói hội viên nào
                      </p>
                      <p className="mx-auto mt-1 max-w-md text-xs font-medium text-text-muted">
                        Tài khoản hiện đang dùng hạn mức mặc định ({defaultMobileProfiles} profile chữ trên Mobile và{" "}
                        {defaultCommissionRevisions} lượt chỉnh sửa miễn phí cho mỗi đơn thiết kế).
                      </p>
                      <Link
                        href="/subscriptions"
                        className="btn-primary mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
                      >
                        Khám phá các gói hội viên <ArrowRight size={14} />
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {benefits.activeSubscriptions.map((sub) => {
                        const remainingLabel = sub.isLifetime
                          ? "Không hết hạn"
                          : getRemainingDaysLabel(sub.expiresAt);
                        return (
                          <article
                            key={sub.subscriptionId}
                            className="border-2 border-black bg-[#f7fbf8] p-4 shadow-[3px_3px_0_0_#000]"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase text-black">
                                    Đang hiệu lực
                                  </span>
                                  <span
                                    className={`inline-flex items-center gap-1 border border-black px-2 py-0.5 text-[10px] font-black uppercase text-black ${
                                      sub.isLifetime ? "bg-[#e9d5ff]" : "bg-[#bae6fd]"
                                    }`}
                                  >
                                    {sub.isLifetime ? (
                                      <>
                                        <InfinityIcon size={11} /> Trọn đời
                                      </>
                                    ) : (
                                      <>
                                        <Clock size={11} /> {sub.durationDays ?? 30} ngày
                                        {remainingLabel ? ` · ${remainingLabel}` : ""}
                                      </>
                                    )}
                                  </span>
                                  {sub.planCode && (
                                    <span className="font-mono text-[11px] font-bold text-text-muted">
                                      {sub.planCode}
                                    </span>
                                  )}
                                </div>

                                <h3 className="mt-2 text-base font-black uppercase text-black">
                                  {sub.planName || sub.planCode || "Gói hội viên Lumintra"}
                                </h3>
                              </div>

                              <div className="text-left sm:text-right">
                                {sub.paidPrice != null && sub.paidPrice > 0 && (
                                  <p className="text-sm font-black tabular-nums text-primary-ink">
                                    {formatPrice(sub.paidPrice)}
                                  </p>
                                )}
                                {sub.orderId != null && (
                                  <Link
                                    href="/profile/orders"
                                    className="mt-0.5 inline-block text-[11px] font-bold text-text-muted hover:text-primary-ink hover:underline"
                                  >
                                    Đơn hàng #{sub.orderId}
                                  </Link>
                                )}
                              </div>
                            </div>

                            {/* Perks granted by this plan */}
                            <ul className="mt-3 flex flex-wrap gap-2 border-t-2 border-dashed border-black/20 pt-3">
                              {sub.allAccessCharacters && (
                                <li className="inline-flex items-center gap-1.5 border border-black bg-white px-2.5 py-1 text-xs font-bold text-black">
                                  <Sparkles size={13} className="text-primary-ink" />
                                  Mở khóa toàn bộ thư viện nhân vật
                                </li>
                              )}
                              {sub.maxMobileProfiles > 3 && (
                                <li className="inline-flex items-center gap-1.5 border border-black bg-white px-2.5 py-1 text-xs font-bold text-black">
                                  <Smartphone size={13} className="text-primary-ink" />
                                  Tối đa {sub.maxMobileProfiles} profile chữ Mobile
                                </li>
                              )}
                              {sub.maxCommissionRevisions > 0 && (
                                <li className="inline-flex items-center gap-1.5 border border-black bg-white px-2.5 py-1 text-xs font-bold text-black">
                                  <Sparkles size={13} className="text-primary-ink" />
                                  {sub.maxCommissionRevisions} lượt sửa miễn phí / đơn thiết kế
                                </li>
                              )}
                            </ul>

                            {/* Timestamps */}
                            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] font-semibold text-text-muted">
                              <span className="inline-flex items-center gap-1">
                                <Calendar size={12} /> Kích hoạt: {formatDateTime(sub.activatedAt)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock size={12} />{" "}
                                {sub.isLifetime
                                  ? "Hiệu lực: Vĩnh viễn"
                                  : `Hết hạn: ${formatDateTime(sub.expiresAt)}`}
                              </span>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Subscription History (Expired / Inactive) */}
                {benefits && benefits.subscriptionHistory.length > 0 && (
                  <section className="neo-box-no-hover bg-white p-5">
                    <div className="mb-4 flex items-center gap-2 border-b-2 border-black pb-3">
                      <History size={18} className="text-text-muted" />
                      <h2 className="text-sm font-black uppercase tracking-wider text-black">
                        Lịch sử gói trước đây ({benefits.subscriptionHistory.length})
                      </h2>
                    </div>

                    <div className="space-y-3">
                      {benefits.subscriptionHistory.map((item) => (
                        <div
                          key={item.subscriptionId}
                          className="flex flex-wrap items-center justify-between gap-3 border-2 border-black bg-gray-50 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="border border-black bg-gray-200 px-2 py-0.5 text-[10px] font-black uppercase text-gray-700">
                                {item.status === "EXPIRED" ? "Đã hết hạn" : item.status}
                              </span>
                              {item.planCode && (
                                <span className="font-mono text-[11px] font-bold text-text-muted">
                                  {item.planCode}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm font-black uppercase text-black">
                              {item.planName || item.planCode || "Gói hội viên"}
                            </p>
                            <p className="mt-0.5 text-[11px] font-medium text-text-muted">
                              Kích hoạt: {formatDateTime(item.activatedAt)}
                              {item.expiresAt ? ` · Hết hạn: ${formatDateTime(item.expiresAt)}` : ""}
                            </p>
                          </div>

                          <Link
                            href="/subscriptions"
                            className="btn-secondary shrink-0 px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
                          >
                            Gia hạn / Mua lại
                          </Link>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
