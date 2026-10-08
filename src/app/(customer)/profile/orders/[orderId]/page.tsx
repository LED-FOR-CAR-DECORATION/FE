"use client";

import React from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Package, MapPin, Truck, Clock, CheckCircle,
  Circle, MessageCircle, Phone, Copy
} from "lucide-react";
import { MOCK_ORDERS } from "@/app/(customer)/profile/page";

const DEFAULT_STEPS = [
  { label: "Order placed",     time: "", done: false },
  { label: "Confirmed",        time: "", done: false },
  { label: "Picked up",        time: "", done: false },
  { label: "In transit",       time: "", done: false },
  { label: "Out for delivery", time: "", done: false },
  { label: "Delivered",        time: "", done: false },
];

const STATUS_CFG: Record<string, string> = {
  Pending:   "bg-amber-100 text-amber-700 border-amber-400",
  Confirmed: "bg-blue-100  text-blue-700  border-blue-400",
  Shipping:  "bg-green-100 text-green-700 border-green-400",
  Delivered: "bg-gray-100  text-gray-600  border-gray-400",
  Cancelled: "bg-red-100   text-red-700   border-red-400",
};

const STATUS_LABEL: Record<string, string> = { Pending: "Chờ xử lý", Confirmed: "Đã xác nhận", Shipping: "Đang giao", Delivered: "Đã giao", Cancelled: "Đã hủy" };

import { use } from "react";

export default function CustomerOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const order = MOCK_ORDERS.find(o => o.id === orderId);

  if (!order) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center py-24">
          <div className="text-center">
            <p className="text-2xl font-black mb-4">Không tìm thấy đơn hàng</p>
            <Link href="/profile" className="btn-primary text-sm px-6 py-2.5">← Về hồ sơ</Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const steps = order.shippingSteps ?? DEFAULT_STEPS;
  const lastDone = steps.filter(s => s.done).length - 1;

  return (
    <>
      <Header />
      <main className="flex-1 bg-background py-10">
        <div className="container mx-auto px-4 max-w-4xl">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6">
            <Link href="/profile" className="flex items-center gap-1.5 text-sm font-bold hover:text-primary-dark transition-colors">
              <ArrowLeft size={15} /> Profile
            </Link>
            <span className="text-text-muted">/</span>
              <span className="text-sm font-bold text-text-muted">Lịch sử đơn hàng</span>
            <span className="text-text-muted">/</span>
            <span className="text-sm font-black">#{order.id}</span>
          </div>

          {/* Title + status */}
          <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Đơn hàng #{order.id}</h1>
              <p className="text-sm text-text-muted mt-1 flex items-center gap-1.5">
                <Clock size={13} /> Đặt ngày {order.date}
              </p>
            </div>
            <span className={`border px-3 py-1.5 text-sm font-black rounded-sm ${STATUS_CFG[order.status]}`}>
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Left: timeline + items */}
            <div className="lg:col-span-3 flex flex-col gap-5">

              {/* Shipping Timeline */}
              <div className="neo-box-no-hover bg-white p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Truck size={17} />
                    <h2 className="font-black text-base uppercase">Trạng thái giao hàng</h2>
                  </div>
                  {"tracking" in order && order.tracking && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-text-muted">
                      <span>{String(order.tracking)}</span>
                      <button className="hover:text-black transition-colors" title="Copy">
                        <Copy size={12} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative pl-6">
                  <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gray-200" />
                  {steps.map((step, i) => {
                    const isActive = i === lastDone + 1 && lastDone < steps.length - 1;
                    return (
                      <div key={i} className="relative flex flex-col mb-5 last:mb-0">
                        <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 border-black flex items-center justify-center z-10
                          ${step.done ? "bg-primary" : isActive ? "bg-amber-300" : "bg-white"}`}>
                          {step.done ? <CheckCircle size={11} /> : isActive ? <Clock size={11} /> : <Circle size={11} className="text-gray-300" />}
                        </div>
                        <p className={`text-sm font-bold ${!step.done && !isActive ? "text-gray-400" : ""}`}>{step.label}</p>
                        {step.time && <p className="text-xs text-text-muted mt-0.5">{step.time}</p>}
                        {isActive && !step.time && <p className="text-xs text-amber-600 font-semibold mt-0.5">Đang xử lý…</p>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Items */}
              <div className="neo-box-no-hover bg-white p-6">
                <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-3">
                  <Package size={17} />
                  <h2 className="font-black text-base uppercase">Sản phẩm đã đặt</h2>
                </div>
                <div className="flex flex-col gap-3">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0">
                      <div className="w-14 h-14 bg-gray-200 border-2 border-black flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">[IMG]</div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{item.name}</p>
                        <p className="text-xs text-text-muted">Số lượng: {item.qty}</p>
                      </div>
                      <p className="font-black">${item.price}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: summary + address + support */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              <div className="neo-box-no-hover bg-white p-5">
                <h2 className="font-black text-base uppercase mb-4 border-b-2 border-black pb-2">Tóm tắt đơn hàng</h2>
                <div className="flex flex-col gap-2 text-sm font-bold">
                  <div className="flex justify-between"><span className="text-text-muted">Tạm tính</span><span>${order.subtotal}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Vận chuyển</span><span>${order.shipping}</span></div>
                  <div className="flex justify-between text-lg font-black border-t-2 border-dashed border-black pt-2 mt-1">
                    <span>Tổng cộng</span><span className="text-primary-dark">${order.total}</span>
                  </div>
                </div>
                <div className="mt-3 bg-gray-50 border-2 border-black px-3 py-2 text-xs font-semibold text-text-muted">
                  Dịch vụ: {order.service}
                </div>
              </div>

              <div className="neo-box-no-hover bg-white p-5">
                <div className="flex items-center gap-2 mb-3 border-b-2 border-black pb-2">
                  <MapPin size={15} /><h2 className="font-black text-sm uppercase">Địa chỉ giao hàng</h2>
                </div>
                <p className="font-bold text-sm">John Doe</p>
                <p className="text-xs text-text-muted">(+84) 123 456 789</p>
                <p className="text-sm mt-1">{order.address}</p>
              </div>

              <div className="neo-box-no-hover bg-white p-5">
                <h2 className="font-black text-sm uppercase mb-3 border-b-2 border-black pb-2">Cần hỗ trợ?</h2>
                <div className="flex flex-col gap-2">
                  <button className="btn-secondary text-xs py-2 flex items-center justify-center gap-1.5 w-full">
                    <MessageCircle size={13} /> Liên hệ hỗ trợ
                  </button>
                  <button className="btn-secondary text-xs py-2 flex items-center justify-center gap-1.5 w-full">
                    <Phone size={13} /> Gọi tổng đài
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
