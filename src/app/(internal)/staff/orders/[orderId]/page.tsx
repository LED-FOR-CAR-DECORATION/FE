"use client";

import Link from "next/link";
import { use, useState } from "react";
import { ArrowLeft, CheckCircle, Circle, Info, MapPin, Package, Truck } from "lucide-react";
import { useOrders } from "@/features/order/context/OrderContext";
import { getOrderFulfillment, isCharacterOnlyOrder } from "@/features/order/fulfillment";
import type { OrderStatus } from "@/features/order/types";

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  Pending: { label: "Đã tạo đơn", className: "bg-amber-100 text-amber-700 border-amber-400" },
  Confirmed: { label: "Đã nhận hàng", className: "bg-blue-100 text-blue-700 border-blue-400" },
  Shipping: { label: "Đang giao", className: "bg-green-100 text-green-700 border-green-400" },
  Delivered: { label: "Đã giao hàng", className: "bg-gray-100 text-gray-600 border-gray-400" },
  Cancelled: { label: "Đã hủy", className: "bg-red-100 text-red-700 border-red-400" },
};

function formatMoney(value: number) {
  return `${value.toLocaleString("vi-VN")} đ`;
}

export default function ManagerOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const { orders, updateOrderStatus, createDelivery } = useOrders();
  const [isCreatingDelivery, setIsCreatingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");
  const order = orders.find((entry) => entry.id === orderId);

  if (!order) return <div className="p-8 text-center"><p className="mb-4 text-xl font-black">Không tìm thấy đơn hàng</p><Link href="/staff/orders" className="btn-primary">← Về danh sách đơn</Link></div>;

  const requiresDelivery = getOrderFulfillment(order).requiresDelivery;
  const displayStatus = isCharacterOnlyOrder(order) && order.paymentStatus === "Paid" ? "Paid" : order.status;
  const canCreateDelivery = order.status === "Confirmed" && !order.delivery && requiresDelivery;
  const handleCreateDelivery = async () => {
    setIsCreatingDelivery(true);
    setDeliveryError("");
    try {
      await createDelivery(order.id);
    } catch (error) {
      setDeliveryError(error instanceof Error ? error.message : "Không thể tạo đơn vận chuyển.");
    } finally {
      setIsCreatingDelivery(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/staff/orders" className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs"><ArrowLeft size={14} /> Tất cả đơn hàng</Link>
          <div><h1 className="text-2xl font-black">Đơn hàng #{order.id}</h1><p className="text-xs text-text-muted">Đặt ngày {new Date(order.createdAt).toLocaleString("vi-VN")}</p></div>
          <span className={`border px-2.5 py-1 text-xs font-black ${displayStatus === "Paid" ? "bg-green-100 text-green-700 border-green-400" : STATUS_CONFIG[order.status].className}`}>{displayStatus === "Paid" ? "Đã thanh toán" : STATUS_CONFIG[order.status].label}</span>
        </div>
        {order.delivery && <Link href="/staff/deliveries" className="btn-secondary flex items-center gap-1.5 text-sm"><Truck size={15} /> Quản lý vận chuyển</Link>}
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,.95fr)]">
        <div className="flex flex-col gap-5">
          {requiresDelivery && <section className="neo-box-no-hover bg-white p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-3"><Package size={17} className="text-primary-dark" /><h2 className="font-black">Thông tin đơn hàng</h2></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div><p className="text-xs text-text-muted">Mã đơn hàng</p><p className="font-black">{order.id}</p></div>
              <div><p className="text-xs text-text-muted">Khách hàng</p><p className="font-bold">{order.customer.fullName}</p></div>
              <div><p className="text-xs text-text-muted">Phương thức thanh toán</p><p className="font-bold">{order.paymentMethod}</p></div>
              <div><p className="text-xs text-text-muted">Ngày đặt hàng</p><p className="font-bold">{new Date(order.createdAt).toLocaleString("vi-VN")}</p></div>
              <div><p className="text-xs text-text-muted">Số điện thoại</p><p className="font-bold">{order.address.phoneNumber}</p></div>
              <div><p className="text-xs text-text-muted">Trạng thái thanh toán</p><span className="mt-1 inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">{order.paymentStatus === "Paid" ? "Đã thanh toán" : "Chưa thanh toán"}</span></div>
            </div>
          </section>}

          <section className="neo-box-no-hover overflow-hidden bg-white">
            <div className="border-b border-gray-200 px-5 py-4"><h2 className="font-black">Danh sách sản phẩm</h2></div>
            <div className="divide-y divide-gray-100">
              {order.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="font-bold">{item.name}</p><p className="text-xs text-text-muted">{item.productType === "LED_MODEL" ? "Thiết bị LED" : "Character"} · Số lượng: {item.quantity}</p></div><div className="text-right"><p className="font-black">{formatMoney(item.price * item.quantity)}</p><p className="text-xs text-text-muted">{formatMoney(item.price)} / sản phẩm</p></div></div>)}
            </div>
            <div className="grid gap-1 bg-primary/10 px-5 py-4 text-sm sm:ml-auto sm:w-2/3"><div className="flex justify-between"><span>Tạm tính</span><strong>{formatMoney(order.subtotal)}</strong></div><div className="flex justify-between"><span>Phí vận chuyển</span><strong>{formatMoney(order.shipping)}</strong></div><div className="mt-2 flex justify-between border-t border-primary-dark/30 pt-2 text-base"><strong>Tổng cộng</strong><strong className="text-primary-dark">{formatMoney(order.total)}</strong></div></div>
          </section>

          {requiresDelivery && <section className="neo-box-no-hover bg-white p-5">
            <div className="mb-3 flex items-center gap-2"><MapPin size={17} className="text-primary-dark" /><h2 className="font-black">Địa chỉ giao hàng</h2></div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4"><p className="font-bold">{order.address.fullName} · {order.address.phoneNumber}</p><p className="mt-1 text-sm text-text-muted">{order.address.fullAddress}</p></div>
          </section>}
        </div>

        {requiresDelivery && <section className="neo-box-no-hover bg-white p-5">
          <div className="mb-4 flex items-center gap-2"><Truck size={19} className="text-primary-dark" /><h2 className="text-lg font-black">Tạo đơn vận chuyển</h2></div>
          <div className="mb-4 flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800"><Info size={16} className="mt-0.5 shrink-0" /><span><strong>Thông tin người nhận và địa chỉ giao hàng</strong> được lấy từ đơn hàng. Vui lòng kiểm tra lại trước khi tạo đơn.</span></div>
          <div className="flex flex-col gap-4">
            <label className="text-xs font-bold">Địa chỉ lấy hàng (kho)<select className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" defaultValue="Kho chính"><option>Kho chính</option><option>Kho phụ</option></select><span className="mt-1 block text-[11px] font-normal text-text-muted">Kho LED Controller, TP. Hồ Chí Minh</span></label>
            <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold">Thời gian lấy hàng<input type="date" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" defaultValue={new Date().toISOString().slice(0, 10)} /></label><label className="text-xs font-bold">Khung giờ<select className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" defaultValue="09:00 - 12:00"><option>09:00 - 12:00</option><option>13:00 - 17:00</option></select></label></div>
            <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold">Loại hàng hóa<select className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" defaultValue="Bưu kiện"><option>Bưu kiện</option><option>Thiết bị điện tử</option></select></label><label className="text-xs font-bold">Số lượng kiện<input type="number" min="1" defaultValue={1} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" /></label></div>
            <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold">Trọng lượng ước tính<input type="text" defaultValue={`${Math.max(0.5, order.items.length * 0.5)} kg`} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" /></label><label className="text-xs font-bold">Kích thước (cm)<input type="text" defaultValue="30 × 25 × 15" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" /></label></div>
            <label className="text-xs font-bold">Giá trị hàng hóa<input readOnly value={formatMoney(order.subtotal)} className="mt-1 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm" /></label>
            <label className="text-xs font-bold">Mô tả hàng hóa<textarea defaultValue={order.items.map((item) => `${item.name} × ${item.quantity}`).join(", ")} className="mt-1 min-h-20 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm" /></label>
            <label className="text-xs font-bold">Ghi chú cho tài xế<textarea placeholder="Ví dụ: Gọi trước khi giao hàng..." className="mt-1 min-h-16 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm" /></label>
            <div><p className="mb-2 text-xs font-bold">Người trả phí vận chuyển</p><div className="flex gap-5 text-sm"><label className="flex items-center gap-2"><input type="radio" name="payer" defaultChecked /> Người gửi</label><label className="flex items-center gap-2"><input type="radio" name="payer" /> Người nhận</label></div></div>
          </div>
          <div className="mt-5 rounded-lg border border-primary-dark/30 bg-primary/10 p-3"><div className="flex items-center justify-between"><span className="text-sm font-bold">Phí vận chuyển ước tính</span><strong className="text-lg text-primary-dark">{formatMoney(order.shipping)}</strong></div><p className="mt-1 text-[11px] text-text-muted">Phí chính xác có thể thay đổi theo thực tế giao hàng.</p></div>
          {deliveryError && <p role="alert" className="mt-3 text-xs font-semibold text-red-600">{deliveryError}</p>}
          {order.delivery ? <Link href="/staff/deliveries" className="btn-primary mt-4 flex w-full items-center justify-center gap-2 text-sm"><Truck size={16} /> Xem thông tin vận chuyển</Link> : <><button onClick={handleCreateDelivery} disabled={!canCreateDelivery || isCreatingDelivery} className="btn-primary mt-4 flex w-full items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"><Truck size={16} />{isCreatingDelivery ? "Đang tạo đơn..." : "Tạo đơn vận chuyển"}</button>{order.status === "Pending" && <button onClick={() => updateOrderStatus(order.id, "Confirmed")} className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-bold hover:bg-gray-50"><CheckCircle size={15} /> Đánh dấu đã nhận hàng</button>}</>}
        </section>}
      </div>
    </div>
  );
}
