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
} from "lucide-react";
import type { PaymentSessionResponse } from "@/api_client";
import { ORDERS_CHANGED_EVENT } from "@/features/order/services/order.service";
import { fetchOrderDetail } from "@/lib/api/orders";
import { fetchPaymentSession } from "@/lib/api/payments";
import { formatPrice } from "@/lib/currency";

interface SePayOrderPaymentCardProps {
  orderId: string;
  initialPaymentCode?: string;
  redirectOnSuccess?: boolean;
  onPaymentSuccess?: (session: PaymentSessionResponse) => void;
}

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
  initialPaymentCode,
  redirectOnSuccess = true,
  onPaymentSuccess,
}: SePayOrderPaymentCardProps) {
  const router = useRouter();
  const [resolvedCode, setResolvedCode] = useState(initialPaymentCode?.trim() || "");
  const [session, setSession] = useState<PaymentSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [succeededState, setSucceededState] = useState(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handledSuccessRef = useRef(false);
  const onPaymentSuccessRef = useRef(onPaymentSuccess);
  onPaymentSuccessRef.current = onPaymentSuccess;

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

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(ORDERS_CHANGED_EVENT));
      }
      onPaymentSuccessRef.current?.(latestSession);

      if (redirectOnSuccess) {
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

  const countdown = formatCountdown(session?.expiresAt, nowMs);
  const isExpired =
    session?.status === "EXPIRED" ||
    (session?.status === "PENDING" && countdown === "00:00");
  const isCancelledOrFailed = session?.status === "CANCELLED" || session?.status === "FAILED";

  if (succeededState || session?.status === "SUCCEEDED") {
    return (
      <section
        id="sepay-payment"
        className="neo-box-no-hover relative overflow-hidden border-2 border-emerald-600 bg-emerald-50 p-6 text-center"
      >
        <div className="mx-auto mb-4 relative flex h-20 w-20 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
          <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-700 bg-emerald-500 text-white shadow-md">
            <CheckCircle2 size={36} />
          </span>
        </div>
        <h3 className="text-xl font-black uppercase text-emerald-900">
          Thanh toán thành công!
        </h3>
        <p className="mt-2 text-sm font-semibold text-emerald-800">
          Hệ thống đã xác nhận giao dịch{" "}
          <span className="font-mono font-black">{session?.paymentCode || resolvedCode}</span>{" "}
          với số tiền{" "}
          <span className="font-black">
            {formatPrice(Number(session?.amount ?? 0))}
          </span>
          .
        </p>
        {redirectOnSuccess && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-600 bg-white px-3 py-1 text-xs font-bold text-emerald-800">
            <Loader2 size={13} className="animate-spin" />
            Đang chuyển tới trang xác nhận đơn hàng...
          </p>
        )}
      </section>
    );
  }

  return (
    <section id="sepay-payment" className="neo-box-no-hover bg-white p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-3">
        <div className="flex items-center gap-2">
          <QrCode size={18} className="text-primary-dark" />
          <h2 className="font-black uppercase">Thanh toán chuyển khoản SePay VietQR</h2>
        </div>
        {session?.status === "PENDING" && !isExpired && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-600" />
            Đang tự động kiểm tra (3s)
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm font-bold text-text-muted">
          <Loader2 size={28} className="animate-spin text-primary-dark" />
          <p>Đang khởi tạo mã QR thanh toán VietQR...</p>
        </div>
      ) : error && !session ? (
        <div className="border-2 border-red-500 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-start gap-2 font-bold">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadSession(false)}
            className="btn-secondary mt-3 inline-flex items-center gap-1.5 text-xs"
          >
            <RefreshCw size={13} /> Thử tải lại mã thanh toán
          </button>
        </div>
      ) : session ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
          {/* QR Box */}
          <div className="flex flex-col items-center justify-center rounded-sm border-2 border-black bg-emerald-50/40 p-4 md:col-span-2">
            {session.qrUrl && !isExpired && !isCancelledOrFailed ? (
              <div className="overflow-hidden rounded-sm border-2 border-black bg-white p-2 shadow-sm">
                <Image
                  src={session.qrUrl}
                  alt={`Mã QR thanh toán đơn hàng #${orderId}`}
                  width={240}
                  height={240}
                  unoptimized
                  className="h-56 w-56 object-contain"
                />
              </div>
            ) : (
              <div className="flex h-56 w-56 flex-col items-center justify-center border-2 border-dashed border-gray-400 bg-gray-100 p-4 text-center text-xs font-bold text-gray-600">
                <AlertCircle size={28} className="mb-2 text-amber-600" />
                {isExpired
                  ? "Phiên thanh toán đã hết hạn."
                  : isCancelledOrFailed
                    ? "Phiên thanh toán đã bị hủy hoặc không khả dụng."
                    : "Chưa có hình ảnh mã QR."}
              </div>
            )}

            {countdown && session.status === "PENDING" && (
              <div
                className={`mt-3 inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-black ${
                  isExpired
                    ? "border-red-400 bg-red-100 text-red-800"
                    : "border-amber-400 bg-amber-100 text-amber-900"
                }`}
              >
                <Clock size={13} />
                {isExpired ? "Đã hết hạn thanh toán" : `Hết hạn sau: ${countdown}`}
              </div>
            )}
          </div>

          {/* Bank Details */}
          <div className="flex flex-col justify-between gap-4 md:col-span-3">
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-2">
                <span className="text-text-muted">Ngân hàng thụ hưởng</span>
                <span className="font-black">{session.bankName}</span>
              </div>

              <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-2">
                <span className="text-text-muted">Chủ tài khoản</span>
                <span className="font-black uppercase">{session.accountName}</span>
              </div>

              <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-2">
                <span className="text-text-muted">Số tài khoản</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-black">{session.accountNumber}</span>
                  <button
                    type="button"
                    onClick={() => void handleCopy("accountNumber", session.accountNumber)}
                    className="inline-flex items-center gap-1 rounded border border-black px-2 py-0.5 text-[11px] font-bold hover:bg-primary/20"
                  >
                    {copiedField === "accountNumber" ? <Check size={11} /> : <Copy size={11} />}
                    {copiedField === "accountNumber" ? "Đã chép" : "Chép"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-2">
                <span className="text-text-muted">Số tiền cần chuyển</span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-primary-dark">
                    {formatPrice(Number(session.amount ?? 0))}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopy("amount", String(Math.round(Number(session.amount ?? 0))))}
                    className="inline-flex items-center gap-1 rounded border border-black px-2 py-0.5 text-[11px] font-bold hover:bg-primary/20"
                  >
                    {copiedField === "amount" ? <Check size={11} /> : <Copy size={11} />}
                    {copiedField === "amount" ? "Đã chép" : "Chép"}
                  </button>
                </div>
              </div>

              <div className="rounded-sm border-2 border-amber-500 bg-amber-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase text-amber-900">
                    Nội dung chuyển khoản (Bắt buộc)
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopy("paymentCode", session.paymentCode)}
                    className="inline-flex items-center gap-1 rounded border border-amber-700 bg-white px-2 py-0.5 text-[11px] font-black text-amber-900 hover:bg-amber-100"
                  >
                    {copiedField === "paymentCode" ? <Check size={11} /> : <Copy size={11} />}
                    {copiedField === "paymentCode" ? "Đã chép" : "Chép mã"}
                  </button>
                </div>
                <p className="mt-1 font-mono text-base font-black tracking-wider text-black">
                  {session.paymentCode}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted">
                <ShieldCheck size={14} className="text-emerald-700" />
                Mở app ngân hàng quét mã QR, hệ thống tự xác nhận sau vài giây.
              </p>
              <button
                type="button"
                disabled={refreshing}
                onClick={() => void loadSession(true)}
                className="inline-flex items-center gap-1.5 rounded-sm border border-black px-3 py-1.5 text-xs font-bold hover:bg-primary/20 disabled:opacity-60"
              >
                <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
                Kiểm tra ngay
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

