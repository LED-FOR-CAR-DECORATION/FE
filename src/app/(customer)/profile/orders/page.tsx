"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle, Circle, Clock, Eye, Package, Truck, X } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useOrders } from "@/features/order/context/OrderContext";
import type { OrderStatus } from "@/features/order/types";

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string; icon: React.ReactNode }> = {
  Pending: { label: "Chờ xử lý", className: "bg-amber-100 text-amber-700 border-amber-400", icon: <Circle size={12} /> },
  Confirmed: { label: "Đã xác nhận", className: "bg-blue-100 text-blue-700 border-blue-400", icon: <CheckCircle size={12} /> },
  Shipping: { label: "Đang giao", className: "bg-green-100 text-green-700 border-green-400", icon: <Truck size={12} /> },
  Delivered: { label: "Đã giao", className: "bg-gray-100 text-gray-600 border-gray-400", icon: <CheckCircle size={12} /> },
  Cancelled: { label: "Đã hủy", className: "bg-red-100 text-red-700 border-red-400", icon: <X size={12} /> },
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const config = STATUS_CONFIG[status];
  return <span className={`inline-flex items-center gap-1 border px-2 py-1 text-[11px] font-bold rounded-sm ${config.className}`}>{config.icon} {config.label}</span>;
}

export default function OrderHistoryPage() {
  const { user } = useAuth();
  const { orders } = useOrders();
  const customerOrders = orders.filter((order) => order.customer.userId === user?.userId);

  return (
    <>
      <Header />
      <main className="profile-page flex-1 bg-background py-7 md:py-10">
        <div className="container relative z-10 mx-auto max-w-3xl px-4">
          <div className="profile-enter mb-5 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <Link href="/profile" className="mb-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary-dark hover:underline"><ArrowLeft size={15} /> Hồ sơ của tôi</Link>
              <div className="flex items-center gap-3"><span className="profile-section-icon"><Package size={19} /></span><div><h1 className="text-3xl font-black tracking-tight">Lịch sử đơn hàng</h1><p className="text-sm text-text-muted">Theo dõi các đơn hàng bạn đã đặt.</p></div></div>
            </div>
            <span className="rounded-full border border-primary bg-primary/20 px-3 py-1 text-xs font-bold">{customerOrders.length} đơn hàng</span>
          </div>
          <div className="profile-card profile-enter profile-enter-delay-1 p-0 overflow-hidden">
            {customerOrders.length === 0 ? <div className="p-12 text-center text-sm font-semibold text-text-muted">Bạn chưa có đơn hàng nào.</div> : <div className="divide-y divide-primary-light">
              {customerOrders.map((order) => <article key={order.id} className="p-5 transition-colors hover:bg-green-50/60">
                <div className="mb-3 flex items-start justify-between gap-3 flex-wrap"><div><p className="font-black text-primary-dark">#{order.id}</p><p className="mt-1 flex items-center gap-1 text-xs text-text-muted"><Clock size={11} /> {new Date(order.createdAt).toLocaleDateString("vi-VN")} · {order.service}</p></div><StatusBadge status={order.status} /></div>
                <div className="mb-4 flex flex-col gap-1">{order.items.map((item) => <p key={`${order.id}-${item.id}`} className="text-sm font-medium">{item.name} <span className="text-text-muted">× {item.quantity}</span></p>)}</div>
                <div className="flex items-center justify-between gap-3"><p className="text-sm font-black">Tổng cộng: <span className="text-primary-dark">${order.total.toFixed(2)}</span></p><Link href={`/profile/orders/${order.id}`} className="inline-flex items-center gap-1.5 rounded-sm border border-black px-3 py-1.5 text-xs font-bold transition-colors hover:bg-primary/20"><Eye size={13} /> Xem chi tiết</Link></div>
              </article>)}
            </div>}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
