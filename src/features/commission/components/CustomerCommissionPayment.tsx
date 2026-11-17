"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CustomerCommissionsService } from "@/api_client/services/CustomerCommissionsService";
import type { CustomerCommissionDetailResponse } from "@/api_client/models/CustomerCommissionDetailResponse";
import { useAuth } from "@/features/auth/hooks/useAuth";
import SePayOrderPaymentCard from "@/features/order/components/SePayOrderPaymentCard";
import { formatPrice } from "@/lib/currency";

const pendingPaymentMessage = "Hệ thống đang chuẩn bị mã thanh toán. Vui lòng chờ.";

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
      </section>
      {detail.activePaymentCode && (
        <SePayOrderPaymentCard key={detail.activePaymentCode} commissionId={commissionId} initialPaymentCode={detail.activePaymentCode} />
      )}
    </div>
  );
}
