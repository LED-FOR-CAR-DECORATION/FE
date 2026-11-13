"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle, Clock } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SePayOrderPaymentCard from "@/features/order/components/SePayOrderPaymentCard";
import { useOrders } from "@/features/order/context/OrderContext";

function ResultContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") ?? "";
  const paymentCode = searchParams.get("paymentCode") ?? undefined;
  const isPaidParam = searchParams.get("paid") === "1";
  const { orders, refreshOrders } = useOrders();

  const order = orders.find((entry) => entry.id === orderId);
  const isPaid = isPaidParam || order?.paymentStatus === "Paid";

  return (
    <>
      <Header />
      <main className="flex flex-1 items-center justify-center bg-background px-4 py-10">
        {isPaid || !orderId ? (
          <div className="neo-box-no-hover w-full max-w-lg bg-white p-8 text-center">
            <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-50" />
              <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-black bg-primary text-black">
                <CheckCircle size={36} />
              </span>
            </div>
            <h1 className="text-2xl font-black uppercase">
              {isPaid ? "Thanh toán & Đặt hàng thành công!" : "Đặt hàng thành công!"}
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              {isPaid
                ? "Giao dịch SePay của bạn đã được xác nhận. Đơn hàng đang được hệ thống xử lý."
                : "Đơn hàng của bạn đã được ghi nhận trên hệ thống."}
            </p>
            {orderId && <p className="my-5 text-xl font-black text-primary-dark">#{orderId}</p>}
            <div className="flex flex-col gap-3">
              <Link href={orderId ? `/profile/orders/${orderId}` : "/profile/orders"} className="btn-primary">
                Xem chi tiết đơn hàng
              </Link>
              <Link href="/" className="btn-secondary">
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-3xl space-y-5">
            <div className="neo-box-no-hover bg-white p-6 text-center">
              <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                <Clock size={14} />
                Đơn hàng #{orderId} đang chờ thanh toán
              </div>
              <h1 className="text-2xl font-black uppercase">Hoàn tất thanh toán qua SePay VietQR</h1>
              <p className="mt-1.5 text-sm text-text-muted">
                Vui lòng quét mã QR bên dưới hoặc chuyển khoản đúng nội dung để hệ thống tự động xác nhận đơn hàng.
              </p>
            </div>

            <SePayOrderPaymentCard
              orderId={orderId}
              initialPaymentCode={paymentCode || order?.paymentCode}
              redirectOnSuccess
              onPaymentSuccess={() => {
                void refreshOrders();
              }}
            />

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href={`/profile/orders/${orderId}`} className="btn-secondary">
                Xem chi tiết đơn hàng
              </Link>
              <Link href="/profile/orders" className="btn-secondary">
                Về lịch sử đơn hàng
              </Link>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default function CheckoutResultPage() {
  return (
    <Suspense fallback={<main className="min-h-screen grid place-items-center">Đang tải kết quả...</main>}>
      <ResultContent />
    </Suspense>
  );
}
