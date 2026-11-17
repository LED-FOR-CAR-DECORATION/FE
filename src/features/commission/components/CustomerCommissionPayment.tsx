"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CustomerCommissionsService } from "@/api_client/services/CustomerCommissionsService";
import type { CustomerCommissionDetailResponse } from "@/api_client/models/CustomerCommissionDetailResponse";
import { useAuth } from "@/features/auth/hooks/useAuth";
import SePayOrderPaymentCard from "@/features/order/components/SePayOrderPaymentCard";
import { formatPrice } from "@/lib/currency";

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
  const router = useRouter();
  const redirectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const chatHref = `/commission/${commissionId}/chat`;

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

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
        <h1 className="text-2xl font-black text-[#155e59]">Thanh toán Commission</h1>
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
          {detail.status === "PAID" && (detail.totalPrice === 0 ? "Yêu cầu này không cần thanh toán." : "Đã thanh toán. Staff sẽ phân công designer.")}
        </div>
        {(detail.chatActive || detail.status === "COMPLETED") && !redirecting && (
          <Link href={chatHref} className="inline-flex min-h-11 items-center rounded-lg bg-[#155e59] px-4 font-semibold text-white hover:bg-[#0e4b47]">
            {detail.status === "COMPLETED" ? "Xem lại cuộc trò chuyện" : "Vào phòng chat với nhân viên"}
          </Link>
        )}
        {redirecting && <p role="status" className="font-semibold text-[#155e59]">Thanh toán thành công! Đang chuyển vào phòng chat…</p>}
      </section>
      {detail.activePaymentCode && (
        <SePayOrderPaymentCard key={detail.activePaymentCode} commissionId={commissionId} initialPaymentCode={detail.activePaymentCode}
          onPaymentSuccess={goToChat} />
      )}
    </div>
  );
}
