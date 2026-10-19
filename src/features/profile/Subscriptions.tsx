"use client";

import Link from "next/link";
import { useState } from "react";
import { CreditCard, Info, X } from "lucide-react";

type Subscription = { id: string; name: string; date: string; amount: number; completed: boolean };

// Preview data for the existing subscriptions wireframe. No recurring billing
// or subscription API is connected to this frontend yet.
const subscriptions: Subscription[] = [
  { id: "SUB-001", name: "Gói thiết kế Character 01", date: "19/11/2026", amount: 20, completed: false },
  { id: "SUB-002", name: "Gói thiết kế Character 02", date: "19/12/2026", amount: 20, completed: false },
  { id: "SUB-003", name: "Gói thiết kế Character 03", date: "19/01/2027", amount: 20, completed: false },
  { id: "PAY-001", name: "Gói thiết kế Character 01", date: "19/10/2026", amount: -20, completed: true },
  { id: "PAY-002", name: "Gói thiết kế Character 02", date: "19/09/2026", amount: -20, completed: true },
  { id: "PAY-003", name: "Gói thiết kế Character 03", date: "19/08/2026", amount: -20, completed: true },
];

export default function Subscriptions() {
  const [selected, setSelected] = useState<Subscription | null>(null);

  function renderRow(subscription: Subscription) {
    return <li key={subscription.id} className="flex items-center gap-3 border border-[#c8d8cd] bg-[#eeeeec] p-3 sm:gap-4">
      <div aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded bg-white sm:h-20 sm:w-24"><CreditCard size={28} strokeWidth={1.5} className="text-primary-dark" /></div>
      <div className="min-w-0 flex-1"><h3 className="text-sm font-black sm:text-base">{subscription.name}</h3><p className="mt-1 text-xs text-text-muted sm:text-sm">{subscription.completed ? "Ngày thanh toán" : "Ngày thanh toán tiếp theo"}: {subscription.date}</p></div>
      <strong className="shrink-0 text-sm">{subscription.amount < 0 ? "−" : ""}${Math.abs(subscription.amount)}</strong>
      {!subscription.completed && <button type="button" aria-label={`Chi tiết ${subscription.name}`} onClick={() => setSelected(subscription)} className="grid h-8 w-8 shrink-0 place-items-center border border-green-700 bg-primary/50 hover:bg-primary"><Info size={17} /></button>}
    </li>;
  }

  return <div className="mx-auto max-w-4xl">
    <h1 className="text-3xl font-black">Đăng ký của tôi</h1>
    <p className="mt-2 text-sm text-text-muted">Theo dõi các gói đăng ký và lịch sử thanh toán.</p>
    <p className="mt-4 text-xs text-text-muted">Dữ liệu minh họa theo wireframe · Chưa kết nối dịch vụ đăng ký và thanh toán định kỳ.</p>
    <section className="mt-6 overflow-hidden border-2 border-[#6d9a73] bg-white shadow-[4px_4px_0_#c8d8cd]">
      <div aria-hidden="true" className="flex h-7 items-center justify-between border-b border-[#6d9a73] bg-primary px-3"><span className="h-3 w-3 rounded-full border border-green-900 bg-white" /><span className="flex gap-1"><span className="h-3 w-4 border border-green-900" /><span className="h-3 w-4 border border-green-900" /></span></div>
      <div className="space-y-5 p-3 sm:p-5">
        <section aria-labelledby="active-subscriptions"><h2 id="active-subscriptions" className="mb-3 text-lg font-black">Gói đăng ký đang hoạt động</h2><ul className="space-y-2">{subscriptions.filter(item => !item.completed).map(renderRow)}</ul></section>
        <section aria-labelledby="completed-subscriptions"><h2 id="completed-subscriptions" className="mb-3 text-lg font-black">Yêu cầu đã hoàn tất</h2><ul className="space-y-2">{subscriptions.filter(item => item.completed).map(renderRow)}</ul></section>
      </div>
    </section>
    <div className="mt-6 text-center"><Link href="/about#support" className="btn-secondary inline-block min-w-48">Liên hệ hỗ trợ</Link></div>
    {selected && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4" onKeyDown={event => { if (event.key === "Escape") setSelected(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="subscription-title" className="w-full max-w-md border-2 border-black bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4"><h2 id="subscription-title" className="text-xl font-black">{selected.name}</h2><button autoFocus aria-label="Đóng chi tiết" onClick={() => setSelected(null)}><X size={22} /></button></div>
        <dl className="mt-5 space-y-3 text-sm"><div><dt className="text-text-muted">Mã đăng ký</dt><dd className="font-bold">{selected.id}</dd></div><div><dt className="text-text-muted">Ngày thanh toán tiếp theo</dt><dd className="font-bold">{selected.date}</dd></div><div><dt className="text-text-muted">Số tiền</dt><dd className="font-bold">${selected.amount}</dd></div></dl>
        <p className="mt-5 text-xs text-text-muted">Thông tin minh họa, không phát sinh khoản thu thực tế.</p>
        <button onClick={() => setSelected(null)} className="btn-primary mt-5 w-full">Đóng</button>
      </section>
    </div>}
  </div>;
}
