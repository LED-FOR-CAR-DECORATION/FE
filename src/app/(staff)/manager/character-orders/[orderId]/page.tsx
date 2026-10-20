"use client";

import Link from "next/link";
import { use } from "react";
import { ArrowLeft, CheckCircle, Image as ImageIcon, Package, WalletCards } from "lucide-react";
import { useOrders } from "@/features/order/context/OrderContext";
import { getCharacterOrderComposition, getCharacterRevenue, getCharacterSaleItems } from "@/features/order/character-orders";

export default function CharacterOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const { orders } = useOrders();
  const order = orders.find((entry) => entry.id === orderId);

  if (!order) return <div className="mx-auto max-w-3xl py-12 text-center"><p className="mb-4 text-xl font-black">Không tìm thấy đơn Character</p><Link href="/manager/character-orders" className="btn-primary">← Về quản lý đơn Character</Link></div>;

  const characters = getCharacterSaleItems(order);
  const revenue = getCharacterRevenue(order);

  return <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5">
    <Link href="/manager/character-orders" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-dark hover:underline"><ArrowLeft size={15} /> Quản lý đơn Character</Link>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-black">Đơn Character #{order.id}</h1><p className="mt-1 text-sm text-text-muted">{new Date(order.createdAt).toLocaleString("vi-VN")} · {getCharacterOrderComposition(order)}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-bold ${order.paymentStatus === "Paid" ? "border-green-300 bg-green-50 text-green-700" : "border-amber-300 bg-amber-50 text-amber-700"}`}>{order.paymentStatus === "Paid" ? "Đã thanh toán" : "Chưa thanh toán"}</span></div>
    <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
      <div className="flex flex-col gap-5">
        <section className="neo-box-no-hover bg-white p-5"><div className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-3"><Package size={17} /><h2 className="font-black">Thông tin đơn hàng</h2></div><div className="grid gap-4 text-sm sm:grid-cols-2"><div><p className="text-xs text-text-muted">Khách hàng</p><p className="font-bold">{order.customer.fullName}</p><p className="text-xs text-text-muted">{order.customer.email}</p></div><div><p className="text-xs text-text-muted">Phương thức thanh toán</p><p className="font-bold">{order.paymentMethod}</p></div><div><p className="text-xs text-text-muted">Trạng thái thanh toán</p><p className="font-bold">{order.paymentStatus}</p></div><div><p className="text-xs text-text-muted">Mã giao dịch</p><p className="font-bold text-text-muted">Chưa có trong dữ liệu mock</p></div></div></section>
        <section className="neo-box-no-hover overflow-hidden bg-white"><div className="border-b border-gray-200 px-5 py-4"><h2 className="font-black">Character đã mua</h2></div><div className="divide-y divide-gray-100">{characters.map((item) => <div key={item.id} className="flex items-center gap-3 px-5 py-4"><span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden border-2 border-black bg-primary/10">{item.previewUrl ? <img src={item.previewUrl} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={17} />}</span><div className="min-w-0 flex-1"><p className="font-bold">{item.name}</p><p className="text-xs text-text-muted">Số lượng: {item.quantity} · Giá ghi nhận: ${item.unitPrice.toFixed(2)}{item.fromBundle ? " · Trong Bundle" : ""}</p></div><p className="font-black">${item.subtotal.toFixed(2)}</p></div>)}</div></section>
      </div>
      <div className="flex flex-col gap-5">
        <section className="neo-box-no-hover bg-white p-5"><div className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-3"><WalletCards size={17} /><h2 className="font-black">Tài chính Character</h2></div><div className="flex justify-between text-sm font-bold"><span>Giá trị Character</span><span>{revenue === null ? "Chưa phân bổ" : `$${revenue.toFixed(2)}`}</span></div><p className="mt-3 text-xs text-text-muted">{revenue === null ? "Bundle có cả LED và Character nên hệ thống không tự phân bổ toàn bộ giá Bundle cho Character." : "Giá được lấy từ giá đã ghi nhận trong đơn hàng."}</p></section>
        <section className="neo-box-no-hover bg-green-50 p-5"><div className="mb-4 flex items-center gap-2 border-b border-green-200 pb-3"><CheckCircle size={17} className="text-green-600" /><h2 className="font-black">Cấp Character tự động</h2></div><p className="text-sm font-bold text-green-800">Sau khi thanh toán thành công, Character được tự động cấp vào tài khoản Customer.</p><p className="mt-2 text-xs text-green-700">Manager không cần xác nhận hoặc cấp quyền thủ công.</p></section>
        {getCharacterOrderComposition(order) !== "Character-only" && <section className="neo-box-no-hover bg-primary/10 p-5"><h2 className="font-black">Đơn có sản phẩm LED</h2><p className="mt-2 text-xs text-text-muted">Thông tin LED và giao hàng được quản lý độc lập trong quy trình đơn hàng vật lý. Trang này chỉ theo dõi phần Character.</p></section>}
      </div>
    </div>
  </div>;
}
