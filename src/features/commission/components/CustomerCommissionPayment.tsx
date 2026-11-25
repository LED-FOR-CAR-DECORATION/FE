"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Grid,
  Loader2,
  MessageSquare,
  QrCode,
  XCircle,
} from "lucide-react";
import { CustomerCommissionsService } from "@/api_client/services/CustomerCommissionsService";
import type { CustomerCommissionDetailResponse } from "@/api_client/models/CustomerCommissionDetailResponse";
import { useAuth } from "@/features/auth/hooks/useAuth";
import SePayOrderPaymentCard from "@/features/order/components/SePayOrderPaymentCard";
import { formatPrice } from "@/lib/currency";
import { commissionErrorMessage } from "../errors";
import { cancelRevisionCheckout } from "../services/customer-commission.api";
import {
  STATUS_TONE_CLASS,
  formatCommissionDate,
  getStatusMeta,
  getTierLabel,
  isPaymentPendingStatus,
} from "../config/statusMeta";
import { scheduleVisiblePoll } from "@/lib/polling";

const PENDING_PAYMENT_MESSAGE = "Hệ thống đang chuẩn bị mã thanh toán. Vui lòng chờ.";
const CHAT_REDIRECT_DELAY_MS = 1600;

export default function CustomerCommissionPayment({ commissionId }: { commissionId: number }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Đang tải thông tin thanh toán">
        <div className="neo-box-no-hover h-44 animate-pulse bg-gray-100 p-5" />
        <div className="neo-box-no-hover h-64 animate-pulse bg-gray-100 p-5" />
      </div>
    );
  }
  if (user?.role !== "CUSTOMER") {
    return (
      <div className="neo-box-no-hover bg-white p-8 text-center">
        <p className="text-sm font-bold text-text-main">
          Đăng nhập bằng tài khoản khách hàng để xem thông tin thanh toán.
        </p>
        <Link
          href={`/login?returnUrl=${encodeURIComponent(`/commission/${commissionId}/payment`)}`}
          className="btn-primary mt-4 inline-flex min-h-11 items-center text-xs font-black uppercase"
        >
          Đăng nhập ngay
        </Link>
      </div>
    );
  }
  return <PaymentDetails key={`${user.userId}:${commissionId}`} commissionId={commissionId} />;
}

function PaymentDetails({ commissionId }: { commissionId: number }) {
  const [detail, setDetail] = useState<CustomerCommissionDetailResponse>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [redirecting, setRedirecting] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const router = useRouter();
  const redirectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const chatHref = `/messages?commissionId=${commissionId}`;

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  /** CMS-22: hủy phiên thanh toán phí chỉnh sửa → commission quay về chờ khách phản hồi bản xem trước. */
  async function cancelExtraPayment() {
    if (cancelling) return;
    setCancelling(true);
    setCancelError("");
    try {
      await cancelRevisionCheckout(commissionId);
      router.replace(chatHref);
    } catch (failure) {
      setCancelError(commissionErrorMessage(failure, "Không hủy được thanh toán phí chỉnh sửa."));
      setCancelling(false);
      setConfirmCancel(false);
      setAttempt((current) => current + 1);
    }
  }

  /** Thanh toán thành công → chuyển vào phòng chat; phòng chat tự chờ nếu webhook cập nhật trạng thái chậm. */
  function goToChat() {
    if (redirecting) return;
    setRedirecting(true);
    redirectTimer.current = setTimeout(() => router.replace(chatHref), CHAT_REDIRECT_DELAY_MS);
  }

  useEffect(() => {
    let active = true;
    let cancelPoll: (() => void) | undefined;
    let request: ReturnType<typeof CustomerCommissionsService.getMyCommissionDetail>;

    function refresh() {
      request = CustomerCommissionsService.getMyCommissionDetail(commissionId);
      request
        .then(({ data }) => {
          if (!active) return;
          if (!data) throw new Error("Missing commission");
          setDetail(data);
          setFailed(false);
          if (
            data.status === "PENDING_REVIEW" ||
            ((data.status === "PENDING_PAYMENT" || data.status === "AWAITING_EXTRA_PAYMENT") &&
              !data.activePaymentCode)
          ) {
            cancelPoll = scheduleVisiblePoll(refresh, 8000);
          }
        })
        .catch(() => {
          if (active) {
            setDetail(undefined);
            setFailed(true);
          }
        });
    }

    refresh();
    return () => {
      active = false;
      cancelPoll?.();
      request?.cancel();
    };
  }, [attempt, commissionId]);

  if (failed) {
    return (
      <div role="alert" className="neo-box-no-hover space-y-3 border-l-8 border-l-red-600 bg-white p-5">
        <div className="flex items-start gap-2 text-sm font-bold text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>Không tải được thông tin thanh toán yêu cầu thiết kế riêng.</p>
        </div>
        <button
          type="button"
          className="btn-secondary min-h-11 text-xs font-black uppercase"
          onClick={() => {
            setFailed(false);
            setAttempt((current) => current + 1);
          }}
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-4" role="status" aria-label="Đang tải thông tin thanh toán">
        <div className="neo-box-no-hover h-44 animate-pulse bg-gray-100 p-5" />
        <div className="neo-box-no-hover h-64 animate-pulse bg-gray-100 p-5" />
      </div>
    );
  }

  const statusMeta = getStatusMeta(detail.status);
  const paymentPending = isPaymentPendingStatus(detail.status);
  const isTerminated = detail.status === "CANCELLED" || detail.status === "EXPIRED";

  const heading =
    detail.status === "PENDING_REVIEW"
      ? "Yêu cầu đang chờ duyệt"
      : detail.status === "AWAITING_EXTRA_PAYMENT"
        ? "Thanh toán phí chỉnh sửa"
        : paymentPending
          ? "Thanh toán thiết kế riêng"
          : "Trạng thái yêu cầu thiết kế";

  const HeaderIcon =
    detail.status === "PENDING_REVIEW"
      ? Clock
      : isTerminated
        ? XCircle
        : paymentPending
          ? QrCode
          : CheckCircle2;

  return (
    <div className="space-y-6">
      <section className="neo-box-no-hover space-y-4 bg-white p-5 sm:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-3">
          <div className="flex items-center gap-2.5">
            <HeaderIcon size={24} className="shrink-0 text-primary-ink" />
            <h1 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">{heading}</h1>
          </div>
          <span
            className={`inline-flex items-center border-2 px-2.5 py-1 text-xs font-black uppercase ${
              STATUS_TONE_CLASS[statusMeta.tone]
            }`}
          >
            {statusMeta.label}
          </span>
        </div>

        {/* Summary Metadata */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="border border-black bg-gray-100 px-2 py-0.5 font-black tabular-nums">
                #{detail.commissionId}
              </span>
              <span className="border border-black bg-white px-2 py-0.5 text-[11px] font-black uppercase">
                {getTierLabel(detail.tierCode)}
              </span>
              {detail.targetMatrixDimensions && (
                <span className="inline-flex items-center gap-1 font-semibold text-text-muted">
                  <Grid size={13} className="text-primary-ink" />
                  LED {detail.targetMatrixDimensions}
                </span>
              )}
            </div>
            <p className="break-words text-lg font-black uppercase text-black">{detail.title}</p>
          </div>

          <div className="shrink-0 sm:text-right">
            <p className="text-xs font-bold uppercase text-text-muted">Tổng giá trị</p>
            <p className="whitespace-nowrap text-2xl font-black tabular-nums text-primary-ink">
              {formatPrice(detail.totalPrice)}
            </p>
          </div>
        </div>

        {/* Contextual Status Notice */}
        {detail.status === "PENDING_REVIEW" && (
          <div role="status" className="flex items-start gap-2.5 border-2 border-amber-600 bg-amber-50 p-3.5 text-xs font-semibold text-amber-900">
            <Clock size={16} className="mt-0.5 shrink-0" />
            <span>
              Yêu cầu đã được gửi và đang chờ nhân viên kiểm duyệt. Sau khi duyệt, mã QR thanh toán sẽ tự động hiển thị tại đây.
            </span>
          </div>
        )}

        {isTerminated && (
          <div role="status" className="flex items-start gap-2.5 border-2 border-red-600 bg-red-50 p-3.5 text-xs font-bold text-red-700">
            <XCircle size={16} className="mt-0.5 shrink-0" />
            <span>
              {detail.status === "EXPIRED" ? "Phiên thanh toán đã hết hạn." : "Yêu cầu đã bị hủy."}
            </span>
          </div>
        )}

        {paymentPending && !detail.activePaymentCode && (
          <div role="status" className="flex items-center gap-2 border-2 border-black bg-gray-50 p-3.5 text-xs font-bold text-text-main">
            <Loader2 size={16} className="shrink-0 animate-spin text-primary-ink" />
            <span>{PENDING_PAYMENT_MESSAGE}</span>
          </div>
        )}

        {detail.status === "AWAITING_EXTRA_PAYMENT" && detail.activePaymentCode && (
          <div role="status" className="flex items-start gap-2.5 border-2 border-amber-600 bg-amber-50 p-3.5 text-xs font-semibold text-amber-900">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>
              Bạn đã dùng hết lượt chỉnh sửa miễn phí. Thanh toán phí chỉnh sửa để họa sĩ bắt đầu thực hiện bản sửa mới.
            </span>
          </div>
        )}

        {detail.status === "PENDING_PAYMENT" && detail.quoteExpiresAt && (
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
            <Clock size={14} />
            <span>Hạn thanh toán báo giá: {formatCommissionDate(detail.quoteExpiresAt, true)}</span>
          </div>
        )}

        {detail.status === "PAID" && !redirecting && (
          <div role="status" className="flex items-start gap-2.5 border-2 border-black bg-primary/15 p-3.5 text-xs font-bold text-primary-ink">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            <span>
              {detail.totalPrice === 0
                ? "Yêu cầu này không cần thanh toán. Phòng trao đổi đã sẵn sàng."
                : "Đã thanh toán thành công! Nhân viên sẽ phân công họa sĩ phụ trách."}
            </span>
          </div>
        )}

        {redirecting && (
          <div role="status" className="flex items-center gap-2 border-2 border-black bg-primary/20 p-3.5 text-sm font-black text-primary-ink">
            <Loader2 size={16} className="shrink-0 animate-spin" />
            <span>Thanh toán thành công! Đang chuyển vào phòng trao đổi…</span>
          </div>
        )}

        {(detail.chatActive || detail.status === "COMPLETED") && !redirecting && (
          <div className="pt-1">
            <Link
              href={chatHref}
              className="btn-primary inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase"
            >
              <MessageSquare size={15} />
              {detail.status === "COMPLETED" ? "Xem lại trao đổi" : "Vào phòng trao đổi với họa sĩ"}
            </Link>
          </div>
        )}

        {/* Cancel Extra Payment */}
        {detail.status === "AWAITING_EXTRA_PAYMENT" && detail.activePaymentCode && !redirecting && (
          <div className="space-y-3 border-t-2 border-dashed border-black pt-4">
            {cancelError && (
              <p role="alert" className="border-2 border-red-600 bg-red-50 p-3 text-xs font-bold text-red-700">
                {cancelError}
              </p>
            )}
            {confirmCancel ? (
              <div className="space-y-3 border-2 border-red-600 bg-red-50 p-4">
                <p className="text-xs font-semibold text-red-900">
                  Hủy thanh toán sẽ đưa yêu cầu về trạng thái chờ bạn phản hồi bản xem trước. Bạn vẫn có thể xác nhận lại yêu cầu chỉnh sửa sau.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={() => void cancelExtraPayment()}
                    className="btn-danger min-h-11 text-xs font-black uppercase"
                  >
                    {cancelling ? "Đang hủy…" : "Xác nhận hủy thanh toán"}
                  </button>
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={() => setConfirmCancel(false)}
                    className="btn-secondary min-h-11 text-xs font-black uppercase"
                  >
                    Giữ lại
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="min-h-11 cursor-pointer text-xs font-bold text-red-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                Không muốn chỉnh sửa nữa? Hủy yêu cầu thanh toán phí sửa
              </button>
            )}
          </div>
        )}
      </section>

      {detail.activePaymentCode && (
        <SePayOrderPaymentCard
          key={detail.activePaymentCode}
          commissionId={commissionId}
          initialPaymentCode={detail.activePaymentCode}
          onPaymentSuccess={goToChat}
        />
      )}
    </div>
  );
}
