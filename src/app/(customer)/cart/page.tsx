"use client";

import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/features/cart/context/CartContext";

export default function CartPage() {
  const { items, isLoading, updateQuantity, removeItem, clearItems, subtotal } = useCart();
  const shipping = items.some((item) => item.productType === "LED_MODEL") && subtotal > 0 ? 5 : 0;

  if (isLoading) return <><Header /><main className="flex-1 grid place-items-center p-20">Đang tải giỏ hàng...</main><Footer /></>;

  return (
    <>
      <Header />
      <main className="flex-1 bg-background py-10">
        <div className="container mx-auto min-h-[60vh] max-w-5xl px-4">
          <div className="mb-8 flex items-center gap-3"><ShoppingBag size={28} /><h1 className="text-3xl font-black uppercase">Giỏ hàng</h1></div>
          {items.length === 0 ? (
            <div className="neo-box-no-hover bg-white p-14 text-center">
              <ShoppingBag className="mx-auto mb-4 text-primary-dark" size={42} />
              <h2 className="mb-2 text-xl font-black">Giỏ hàng đang trống</h2>
              <Link href="/" className="btn-primary inline-block mt-4">Tiếp tục mua sắm</Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="neo-box-no-hover bg-white lg:col-span-2">
                {items.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center gap-4 border-b-2 border-gray-100 p-4 last:border-0">
                    <div className="grid h-20 w-20 place-items-center border-2 border-black bg-gray-100 text-xs font-bold">[IMG]</div>
                    <div className="min-w-40 flex-1"><h2 className="font-black">{item.name}</h2><p className="text-sm text-text-muted">${item.price.toFixed(2)} / sản phẩm</p></div>
                    <div className="flex h-9 border-2 border-black"><button onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="w-9 border-r-2 border-black disabled:opacity-40"><Minus size={14} className="mx-auto" /></button><span className="grid w-10 place-items-center font-bold">{item.quantity}</span><button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-9 border-l-2 border-black"><Plus size={14} className="mx-auto" /></button></div>
                    <strong className="w-20 text-right text-primary-dark">${(item.price * item.quantity).toFixed(2)}</strong>
                    <button onClick={() => removeItem(item.id)} className="p-2 text-red-600" aria-label={`Xóa ${item.name}`}><Trash2 size={17} /></button>
                  </div>
                ))}
                <button onClick={() => clearItems()} className="m-4 flex items-center gap-2 text-sm font-bold text-red-600 hover:underline"><Trash2 size={15} /> Xóa toàn bộ</button>
              </div>
              <div className="neo-box-no-hover h-fit bg-primary p-5">
                <h2 className="mb-4 border-b-2 border-black pb-3 text-lg font-black uppercase">Tóm tắt</h2>
                <div className="flex justify-between text-sm font-bold"><span>Tạm tính</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="mt-2 flex justify-between text-sm font-bold"><span>Vận chuyển</span><span>${shipping.toFixed(2)}</span></div>
                <div className="mt-4 flex justify-between border-t-2 border-black pt-3 text-xl font-black"><span>Tổng</span><span>${(subtotal + shipping).toFixed(2)}</span></div>
                <Link href="/checkout" className="btn-secondary mt-5 block w-full text-center">Tiến hành thanh toán</Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
