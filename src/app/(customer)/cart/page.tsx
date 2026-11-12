"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/features/cart/context/CartContext";
import { getOrderFulfillment } from "@/features/order/fulfillment";

import { formatPrice } from "@/lib/currency";

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    isLoading,
    updateQuantity,
    removeItem,
    clearItems,
    selectedIds,
    selectedItems,
    selectedSubtotal,
    isSelected,
    toggleSelect,
    toggleSelectAll,
  } = useCart();
  const [error, setError] = useState("");

  const selectedQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const shipping = getOrderFulfillment({ items: selectedItems }).requiresDelivery && selectedSubtotal > 0 ? (selectedSubtotal >= 500000 ? 0 : 30000) : 0;
  const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const goToCheckout = () => {
    if (!selectedItems.length) {
      setError("Vui lòng chọn ít nhất 1 sản phẩm để thanh toán.");
      return;
    }
    router.push("/checkout");
  };

  const removeSelected = () => {
    if (!selectedIds.length) return;
    clearItems(selectedIds);
  };

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
              <div className="neo-box-no-hover h-fit bg-white lg:col-span-2">
                {/* Thanh chọn tất cả */}
                <label className="flex cursor-pointer items-center gap-3 border-b-2 border-black bg-gray-50 px-4 py-3 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(element) => { if (element) element.indeterminate = someSelected; }}
                    onChange={() => { toggleSelectAll(); setError(""); }}
                    className="h-4 w-4 cursor-pointer accent-[#155e59]"
                    aria-label="Chọn tất cả sản phẩm"
                  />
                  <span>Chọn tất cả ({items.length} sản phẩm)</span>
                </label>

                {items.map((item) => {
                  const checked = isSelected(item.id);
                  return (
                    <div key={item.id} className={`flex flex-wrap items-center gap-4 border-b-2 border-gray-100 p-4 last:border-0 transition-colors ${checked ? "bg-[#f3faf5]" : ""}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => { toggleSelect(item.id); setError(""); }}
                        className="h-4 w-4 cursor-pointer accent-[#155e59]"
                        aria-label={`Chọn ${item.name} để thanh toán`}
                      />
                      <div className="relative h-20 w-20 overflow-hidden border-2 border-black bg-gray-100">
                        {item.previewUrl ? (
                          <Image src={item.previewUrl} alt={item.name} fill sizes="80px" className="object-contain p-1" />
                        ) : (
                          <span className="grid h-full place-items-center text-xs font-bold">[IMG]</span>
                        )}
                      </div>
                      <div className="min-w-40 flex-1"><h2 className="font-black">{item.name}</h2><p className="text-sm text-text-muted">{formatPrice(item.price)} / sản phẩm</p></div>
                      <div className="flex h-9 border-2 border-black"><button onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="w-9 border-r-2 border-black disabled:opacity-40" aria-label="Giảm số lượng"><Minus size={14} className="mx-auto" /></button><span className="grid w-10 place-items-center font-bold">{item.quantity}</span><button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-9 border-l-2 border-black" aria-label="Tăng số lượng"><Plus size={14} className="mx-auto" /></button></div>
                      <strong className="w-20 text-right text-primary-dark">{formatPrice(item.price * item.quantity)}</strong>
                      <button onClick={() => removeItem(item.id)} className="p-2 text-red-600" aria-label={`Xóa ${item.name}`}><Trash2 size={17} /></button>
                    </div>
                  );
                })}

                <div className="flex flex-wrap items-center gap-5 border-t-2 border-gray-100 px-4 py-3">
                  <button onClick={removeSelected} disabled={!selectedIds.length} className="flex items-center gap-2 text-sm font-bold text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={15} /> Xóa đã chọn ({selectedIds.length})</button>
                  <button onClick={() => clearItems()} className="flex items-center gap-2 text-sm font-bold text-red-600 hover:underline"><Trash2 size={15} /> Xóa toàn bộ</button>
                </div>
              </div>

              <div className="neo-box-no-hover h-fit bg-primary p-5 lg:sticky lg:top-28">
                <h2 className="mb-4 border-b-2 border-black pb-3 text-lg font-black uppercase">Tóm tắt</h2>
                <div className="mb-2 flex justify-between text-sm font-bold"><span>Đã chọn</span><span>{selectedItems.length} sản phẩm ({selectedQuantity} món)</span></div>
                <div className="flex justify-between text-sm font-bold"><span>Tạm tính</span><span>{formatPrice(selectedSubtotal)}</span></div>
                <div className="mt-2 flex justify-between text-sm font-bold"><span>Vận chuyển</span><span>{shipping === 0 ? "Miễn phí" : formatPrice(shipping)}</span></div>
                <div className="mt-4 flex justify-between border-t-2 border-black pt-3 text-xl font-black"><span>Tổng</span><span>{formatPrice(selectedSubtotal + shipping)}</span></div>
                {error && <p role="alert" className="mt-3 border-2 border-red-600 bg-red-50 p-2 text-xs font-bold text-red-700">{error}</p>}
                <button
                  type="button"
                  onClick={goToCheckout}
                  disabled={!selectedItems.length}
                  className="btn-secondary mt-5 block w-full text-center disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Mua hàng ({selectedItems.length})
                </button>
                {!selectedItems.length && <p className="mt-2 text-center text-xs font-semibold">Tick chọn sản phẩm để thanh toán</p>}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
