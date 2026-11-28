"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type { PaymentSessionResponse } from "@/api_client";
import { ENTITLEMENTS_CHANGED_EVENT } from "@/features/character/services/entitlement.service";
import { emitOrdersChanged } from "@/features/order/services/order.service";
import { fetchOrderDetail } from "@/lib/api/orders";
import { fetchPaymentSession, mockPaymentSuccess } from "@/lib/api/payments";
import { formatPrice } from "@/lib/currency";
import { isPageVisible } from "@/lib/polling";

type SePayOrderPaymentCardProps = {
  onPaymentSuccess?: (session: PaymentSessionResponse) => void;
  onAmountLoaded?: (amount: number) => void;
} & (
    | { orderId: string; initialPaymentCode?: string; redirectOnSuccess?: boolean; commissionId?: never }
    | { commissionId: number; initialPaymentCode: string; orderId?: never; redirectOnSuccess?: never }
  );

const POLL_INTERVAL_MS = 3000;
const REDIRECT_DELAY_MS = 1600;

function formatCountdown(expiresAt?: string | null, nowMs?: number): string | null {
  if (!expiresAt) return null;
  const target = new Date(expiresAt).getTime();
  if (!Number.isFinite(target)) return null;
  const diffSec = Math.max(0, Math.floor((target - (nowMs ?? Date.now())) / 1000));
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function SePayOrderPaymentCard({
  orderId,
  commissionId,
  initialPaymentCode,
  redirectOnSuccess = orderId !== undefined,
  onPaymentSuccess,
  onAmountLoaded,
}: SePayOrderPaymentCardProps) {
  const router = useRouter();
  const [resolvedCode, setResolvedCode] = useState(initialPaymentCode?.trim() || "");
  const [session, setSession] = useState<PaymentSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMocking, setIsMocking] = useState(false);
  const [error, setError] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [succeededState, setSucceededState] = useState(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handledSuccessRef = useRef(false);
  const onPaymentSuccessRef = useRef(onPaymentSuccess);
  onPaymentSuccessRef.current = onPaymentSuccess;
  const onAmountLoadedRef = useRef(onAmountLoaded);
  onAmountLoadedRef.current = onAmountLoaded;

  useEffect(() => {
    const rawAmount = Number(session?.amount);
    if (Number.isFinite(rawAmount) && rawAmount >= 0) {
      onAmountLoadedRef.current?.(rawAmount);
    }
  }, [session?.amount]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const handlePaymentSucceeded = useCallback(
    (latestSession: PaymentSessionResponse) => {
      if (handledSuccessRef.current) return;
      handledSuccessRef.current = true;
      stopPolling();
      setSession(latestSession);
      setSucceededState(true);
      setError("");

      if (orderId !== undefined && typeof window !== "undefined") {
        emitOrdersChanged(orderId);
        window.dispatchEvent(new CustomEvent(ENTITLEMENTS_CHANGED_EVENT));
      }
      onPaymentSuccessRef.current?.(latestSession);

      if (redirectOnSuccess && orderId !== undefined) {
        redirectTimeoutRef.current = setTimeout(() => {
          router.replace(`/checkout/result?orderId=${encodeURIComponent(orderId)}&paid=1`);
        }, REDIRECT_DELAY_MS);
      }
    },
    [orderId, redirectOnSuccess, router, stopPolling],
  );

  const resolveCodeForOrder = useCallback(async (): Promise<string> => {
    const trimmedInitial = initialPaymentCode?.trim();
    if (trimmedInitial) return trimmedInitial;
    if (orderId === undefined) throw new Error("Commission chưa có mã thanh toán.");

    const detail = await fetchOrderDetail(orderId);
    const codeFromDetail = detail?.payment?.paymentContent?.trim() || detail?.payment?.bankReferenceCode?.trim();
    if (codeFromDetail) return codeFromDetail;

    const numericId = Number(orderId);
    if (Number.isFinite(numericId) && numericId > 0) {
      return `LMT${numericId}`;
    }
    throw new Error("Không tìm thấy mã thanh toán cho đơn hàng này.");
  }, [initialPaymentCode, orderId]);

  const loadSession = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      try {
        const code = resolvedCode || (await resolveCodeForOrder());
        if (!resolvedCode) {
          setResolvedCode(code);
        }
        const data = await fetchPaymentSession(code);
        setSession(data);
        setError("");

        if (data.status === "SUCCEEDED") {
          handlePaymentSucceeded(data);
        } else if (data.status !== "PENDING") {
          stopPolling();
        }
      } catch (err) {
        if (!silent || !session) {
          setError(err instanceof Error ? err.message : "Không thể tải phiên thanh toán SePay.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [handlePaymentSucceeded, resolveCodeForOrder, resolvedCode, session, stopPolling],
  );

  // Initial load & 3-second polling lifecycle
  useEffect(() => {
    handledSuccessRef.current = false;
    setSucceededState(false);

    let cancelled = false;

    const initAndPoll = async () => {
      setLoading(true);
      try {
        const code = initialPaymentCode?.trim() || (await resolveCodeForOrder());
        if (cancelled) return;
        setResolvedCode(code);

        const initialData = await fetchPaymentSession(code);
        if (cancelled) return;

        setSession(initialData);
        setError("");
        setLoading(false);

        if (initialData.status === "SUCCEEDED") {
          handlePaymentSucceeded(initialData);
          return;
        }
        if (initialData.status !== "PENDING") {
          return;
        }

        stopPolling();
        pollIntervalRef.current = setInterval(async () => {
          if (!isPageVisible()) return;
          try {
            const polled = await fetchPaymentSession(code);
            if (cancelled) return;
            setSession(polled);
            setError("");

            if (polled.status === "SUCCEEDED") {
              handlePaymentSucceeded(polled);
            } else if (polled.status !== "PENDING") {
              stopPolling();
            }
          } catch {
            // Keep polling silently on transient network glitches during 3s interval
          }
        }, POLL_INTERVAL_MS);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Không thể khởi tạo phiên thanh toán SePay.");
          setLoading(false);
        }
      }
    };

    void initAndPoll();

    return () => {
      cancelled = true;
      stopPolling();
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [handlePaymentSucceeded, initialPaymentCode, orderId, resolveCodeForOrder, stopPolling]);

  // Countdown tick every second while pending
  useEffect(() => {
    if (!session || session.status !== "PENDING" || !session.expiresAt) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [session]);

  const handleCopy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => {
        setCopiedField((current) => (current === label ? null : current));
      }, 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleMockSuccess = async () => {
    if (!session?.paymentCode || isMocking) return;
    setIsMocking(true);
    try {
      const updated = await mockPaymentSuccess(session.paymentCode);
      handlePaymentSucceeded(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giả lập thanh toán thất bại.");
    } finally {
      setIsMocking(false);
    }
  };

  const countdown = formatCountdown(session?.expiresAt, nowMs);
  const isExpired =
    session?.status === "EXPIRED" ||
    (session?.status === "PENDING" && countdown === "00:00");
  const isCancelledOrFailed = session?.status === "CANCELLED" || session?.status === "FAILED";

  if (succeededState || session?.status === "SUCCEEDED") {
    return (
      <section
        id="sepay-payment"
        className="neo-box-no-hover relative overflow-hidden bg-white p-6 text-center"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border-2 border-black bg-primary text-black shadow-[3px_3px_0_0_#000]">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="text-xl font-black uppercase text-black">
          Thanh toán thành công!
        </h3>
        <p className="mt-2 text-sm font-semibold text-text-main">
          Hệ thống đã xác nhận giao dịch{" "}
          <span className="font-mono font-black text-black">{session?.paymentCode || resolvedCode}</span>{" "}
          với số tiền{" "}
          <span className="font-black text-primary-ink">
            {formatPrice(Number(session?.amount ?? 0))}
          </span>
          .
        </p>
        {redirectOnSuccess && (
          <p className="mt-4 inline-flex items-center gap-2 border-2 border-black bg-primary/15 px-3 py-1.5 text-xs font-black uppercase text-primary-ink">
            <Loader2 size={13} className="animate-spin" />
            Đang chuyển tới trang xác nhận đơn hàng...
          </p>
        )}
      </section>
    );
  }

  return (
    <section id="sepay-payment" className="neo-box-no-hover bg-white p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-3">
        <div className="flex items-center gap-2">
          <QrCode size={18} className="shrink-0 text-primary-ink" />
          <h2 className="text-base font-black uppercase tracking-tight">Thanh toán chuyển khoản SePay VietQR</h2>
        </div>
        {session?.status === "PENDING" && !isExpired && (
          <span className="inline-flex items-center gap-1.5 border-2 border-black bg-primary/15 px-2.5 py-1 text-[11px] font-black uppercase text-primary-ink">
            <span className="h-2 w-2 animate-pulse bg-primary-ink" aria-hidden="true" />
            Đang tự động kiểm tra (3s)
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm font-bold text-text-muted">
          <Loader2 size={28} className="animate-spin text-primary-ink" />
          <p>Đang khởi tạo mã QR thanh toán VietQR...</p>
        </div>
      ) : error && !session ? (
        <div className="border-2 border-red-600 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-start gap-2 font-bold">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadSession(false)}
            className="btn-secondary mt-3 inline-flex cursor-pointer items-center gap-1.5 text-xs font-black uppercase"
          >
            <RefreshCw size={13} /> Thử tải lại mã thanh toán
          </button>
        </div>
      ) : session ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
          {/* QR Box */}
          <div className="flex flex-col items-center justify-center border-2 border-black bg-background p-4 md:col-span-5">
            {session.qrUrl && !isExpired && !isCancelledOrFailed ? (
              <div className="overflow-hidden border-2 border-black bg-white p-2 shadow-[3px_3px_0_0_#000]">
                <Image
                  src={session.qrUrl}
                  alt={`Mã QR thanh toán ${commissionId === undefined ? `đơn hàng #${orderId}` : `Commission #${commissionId}`}`}
                  width={240}
                  height={240}
                  unoptimized
                  className="h-52 w-52 object-contain"
                />
              </div>
            ) : (
              <div className="flex h-52 w-52 flex-col items-center justify-center border-2 border-dashed border-black bg-gray-100 p-4 text-center text-xs font-bold text-text-muted">
                <AlertCircle size={28} className="mb-2 text-amber-700" />
                {isExpired
                  ? "Phiên thanh toán đã hết hạn."
                  : isCancelledOrFailed
                    ? "Phiên thanh toán đã bị hủy hoặc không khả dụng."
                    : "Chưa có hình ảnh mã QR."}
              </div>
            )}

            {countdown && session.status === "PENDING" && (
              <div
                className={`mt-3 inline-flex items-center gap-1.5 border-2 border-black px-2.5 py-1 text-xs font-black tabular-nums ${isExpired
                    ? "bg-red-100 text-red-800"
                    : "bg-amber-300 text-black"
                  }`}
              >
                <Clock size={13} />
                {isExpired ? "Đã hết hạn thanh toán" : `Hết hạn sau: ${countdown}`}
              </div>
            )}
          </div>

          {/* Bank Details */}
          <div className="flex flex-col justify-between gap-4 md:col-span-7">
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-2 border-b-2 border-dashed border-black/20 pb-2">
                <span className="font-semibold text-text-muted">Ngân hàng thụ hưởng</span>
                <span className="font-black text-black">{session.bankName}</span>
              </div>

              <div className="flex items-center justify-between gap-2 border-b-2 border-dashed border-black/20 pb-2">
                <span className="font-semibold text-text-muted">Chủ tài khoản</span>
                <span className="font-black uppercase text-black">{session.accountName}</span>
              </div>

              <div className="flex items-center justify-between gap-2 border-b-2 border-dashed border-black/20 pb-2">
                <span className="font-semibold text-text-muted">Số tài khoản</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-black">{session.accountNumber}</span>
                  <button
                    type="button"
                    onClick={() => void handleCopy("accountNumber", session.accountNumber)}
                    className="inline-flex cursor-pointer items-center gap-1 border-2 border-black bg-white px-2 py-0.5 text-[11px] font-black uppercase transition-colors hover:bg-primary/20"
                  >
                    {copiedField === "accountNumber" ? <Check size={11} /> : <Copy size={11} />}
                    {copiedField === "accountNumber" ? "Đã chép" : "Chép"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-b-2 border-dashed border-black/20 pb-2">
                <span className="font-semibold text-text-muted">Số tiền cần chuyển</span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black tabular-nums text-primary-ink">
                    {formatPrice(Number(session.amount ?? 0))}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopy("amount", String(Math.round(Number(session.amount ?? 0))))}
                    className="inline-flex cursor-pointer items-center gap-1 border-2 border-black bg-white px-2 py-0.5 text-[11px] font-black uppercase transition-colors hover:bg-primary/20"
                  >
                    {copiedField === "amount" ? <Check size={11} /> : <Copy size={11} />}
                    {copiedField === "amount" ? "Đã chép" : "Chép"}
                  </button>
                </div>
              </div>

              <div className="border-2 border-black bg-amber-100 p-3 shadow-[3px_3px_0_0_#000]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase text-black">
                    Nội dung chuyển khoản (Bắt buộc)
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopy("paymentCode", session.paymentCode)}
                    className="inline-flex cursor-pointer items-center gap-1 border-2 border-black bg-white px-2 py-0.5 text-[11px] font-black uppercase text-black transition-colors hover:bg-amber-300"
                  >
                    {copiedField === "paymentCode" ? <Check size={11} /> : <Copy size={11} />}
                    {copiedField === "paymentCode" ? "Đã chép" : "Chép mã"}
                  </button>
                </div>
                <p className="mt-1.5 font-mono text-base font-black tracking-wider text-black">
                  {session.paymentCode}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted">
                <ShieldCheck size={14} className="shrink-0 text-primary-ink" />
                Mở app ngân hàng quét mã QR, hệ thống tự xác nhận sau vài giây.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {/* Nút Test / Dev Mode */}
                {session.status === "PENDING" && (
                  <button
                    type="button"
                    disabled={isMocking || refreshing}
                    onClick={() => void handleMockSuccess()}
                    className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 border-2 border-black bg-primary px-3 py-1.5 text-xs font-black uppercase text-black shadow-[2px_2px_0_0_#000] transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                    title="Dành cho Dev/Test: Xác nhận thanh toán mô phỏng"
                  >
                    {isMocking ? (
                      <Loader2 size={12} className="animate-spin text-black" />
                    ) : (
                      <Zap size={12} className="text-black" />
                    )}

                  </button>
                )}
                <button
                  type="button"
                  disabled={refreshing || isMocking}
                  onClick={() => void loadSession(true)}
                  className="btn-secondary inline-flex min-h-9 cursor-pointer items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
                  Kiểm tra ngay
                </button>
              </div>
            </div>
            {error && (
              <p role="alert" className="border-2 border-red-600 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                {error}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

