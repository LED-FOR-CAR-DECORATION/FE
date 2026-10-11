"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

function ResultContent() {
  const orderId = useSearchParams().get("orderId") ?? "MOCK-ORDER";
  return <><Header /><main className="flex flex-1 items-center justify-center bg-background px-4 py-16"><div className="neo-box-no-hover w-full max-w-lg bg-white p-8 text-center"><CheckCircle size={56} className="mx-auto mb-4 text-primary-dark" /><h1 className="text-2xl font-black">Thanh toán thành công!</h1><p className="mt-2 text-sm text-text-muted">Đơn hàng mock đã được tạo thành công.</p><p className="my-5 text-xl font-black text-primary-dark">#{orderId}</p><div className="flex flex-col gap-3"><Link href="/profile/orders" className="btn-primary">Xem lịch sử đơn hàng</Link><Link href="/" className="btn-secondary">Tiếp tục mua sắm</Link></div></div></main><Footer /></>;
}

export default function CheckoutResultPage() {
  return <Suspense fallback={<main className="min-h-screen grid place-items-center">Đang tải kết quả...</main>}><ResultContent /></Suspense>;
}
