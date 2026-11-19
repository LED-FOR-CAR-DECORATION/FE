"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CustomerCommissionsService } from "@/api_client/services/CustomerCommissionsService";
import type { CustomerCommissionDetailResponse } from "@/api_client/models/CustomerCommissionDetailResponse";
import { useAuth } from "@/features/auth/hooks/useAuth";
import SePayOrderPaymentCard from "@/features/order/components/SePayOrderPaymentCard";
import { formatPrice } from "@/lib/currency";
import { commissionErrorMessage } from "../errors";
import { cancelRevisionCheckout } from "../services/customer-commission.api";

const pendingPaymentMessage = "Hệ thống đang chuẩn bị mã thanh toán. Vui lòng chờ.";
const CHAT_REDIRECT_DELAY_MS = 1600;

export default function CustomerCommissionPayment({ commissionId }: { commissionId: number }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p role="status">Đang tải thông tin thanh toán…</p>;
  if (user?.role !== "CUSTOMER") return <p>Đăng nhập bằng tài khoản khách hàng để xem thông tin thanh toán.</p>;
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
  const chatHref = `/commission/${commissionId}/chat`;

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
    let timer: ReturnType<typeof setTimeout>;
    let request: ReturnType<typeof CustomerCommissionsService.getMyCommissionDetail>;

    function refresh() {
      request = CustomerCommissionsService.getMyCommissionDetail(commissionId);
      request.then(({ data }) => {
        if (!active) return;
        if (!data) throw new Error("Missing commission");
        setDetail(data);
        setFailed(false);
        if (data.status === "PENDING_REVIEW" ||
          ((data.status === "PENDING_PAYMENT" || data.status === "AWAITING_EXTRA_PAYMENT") && !data.activePaymentCode)) {
          timer = setTimeout(refresh, 8000);
        }
      }).catch(() => {
        if (active) {
          setDetail(undefined);
          setFailed(true);
        }
      });
    }

    refresh();
    return () => {
      active = false;
      clearTimeout(timer);
      request?.cancel();
    };
  }, [attempt, commissionId]);

  if (failed) return (
    <div className="space-y-3">
      <p role="alert">Không tải được thông tin thanh toán Commission.</p>
      <button type="button" className="font-semibold text-[#155e59] underline" onClick={() => {
        setFailed(false);
        setAttempt((current) => current + 1);
      }}>Thử lại</button>
    </div>
  );
  if (!detail) return <p role="status">Đang tải thông tin thanh toán…</p>;

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-xl border border-[#cfe3d0] bg-white p-5">
        <h1 className="text-2xl font-black text-[#155e59]">
          {detail.status === "AWAITING_EXTRA_PAYMENT" ? "Thanh toán phí chỉnh sửa" : "Thanh toán Commission"}
        </h1>
        <p className="break-words font-semibold">{detail.title} · #{detail.commissionId}</p>
        <dl className="flex flex-wrap justify-between gap-2 border-t border-[#cfe3d0] pt-3">
          <dt>Tổng giá trị Commission</dt>
          <dd className="font-bold text-[#155e59]">{formatPrice(detail.totalPrice)}</dd>
        </dl>
        <div role="status" className="text-sm text-[#526159]">
          {detail.status === "PENDING_REVIEW" && "Yêu cầu đang chờ nhân viên duyệt. Mã QR sẽ tự hiện khi có thể thanh toán."}
          {detail.status === "EXPIRED" && "Phiên thanh toán đã hết hạn."}
          {detail.status === "CANCELLED" && "Yêu cầu đã bị hủy."}
          {(detail.status === "PENDING_PAYMENT" || detail.status === "AWAITING_EXTRA_PAYMENT") && !detail.activePaymentCode && pendingPaymentMessage}
          {detail.status === "AWAITING_EXTRA_PAYMENT" && detail.activePaymentCode &&
            "Bạn đã dùng hết lượt chỉnh sửa miễn phí. Thanh toán phí chỉnh sửa để designer bắt đầu sửa theo yêu cầu."}
          {detail.status === "PAID" && (detail.totalPrice === 0 ? "Yêu cầu này không cần thanh toán." : "Đã thanh toán. Staff sẽ phân công designer.")}
        </div>
        {(detail.chatActive || detail.status === "COMPLETED") && !redirecting && (
          <Link href={chatHref} className="inline-flex min-h-11 items-center rounded-lg bg-[#155e59] px-4 font-semibold text-white hover:bg-[#0e4b47]">
            {detail.status === "COMPLETED" ? "Xem lại cuộc trò chuyện" : "Vào phòng chat với nhân viên"}
          </Link>
        )}
        {redirecting && <p role="status" className="font-semibold text-[#155e59]">Thanh toán thành công! Đang chuyển vào phòng chat…</p>}
        {detail.status === "AWAITING_EXTRA_PAYMENT" && detail.activePaymentCode && !redirecting && (
          <div className="space-y-2 border-t border-[#cfe3d0] pt-3">
            {cancelError && <p role="alert" className="text-sm text-red-700">{cancelError}</p>}
            {confirmCancel ? (
              <>
                <p className="text-sm">Hủy thanh toán sẽ đưa commission về trạng thái chờ bạn phản hồi bản xem trước. Bạn có thể xác nhận lại yêu cầu chỉnh sửa sau.</p>
                <div className="flex flex-wrap gap-3">
                  <button type="button" disabled={cancelling} onClick={() => void cancelExtraPayment()}
                    className="min-h-11 rounded-lg bg-red-700 px-4 font-semibold text-white hover:bg-red-800 disabled:opacity-50">
                    {cancelling ? "Đang hủy…" : "Hủy thanh toán"}
                  </button>
                  <button type="button" disabled={cancelling} onClick={() => setConfirmCancel(false)}
                    className="min-h-11 px-2 font-semibold text-[#155e59] underline">Giữ lại</button>
                </div>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmCancel(true)} className="min-h-11 font-semibold text-red-700 underline">
                Không muốn chỉnh sửa nữa? Hủy yêu cầu
              </button>
            )}
          </div>
        )}
      </section>
      {detail.activePaymentCode && (
        <SePayOrderPaymentCard key={detail.activePaymentCode} commissionId={commissionId} initialPaymentCode={detail.activePaymentCode}
          onPaymentSuccess={goToChat} />
      )}
    </div>
  );
}
