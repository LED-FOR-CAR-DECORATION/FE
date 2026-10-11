"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/features/cart/context/CartContext";
import { getProductById } from "@/features/cart/catalog";

export default function ProductDetailPage() {
  const params = useParams<{ productId: string }>();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const item = getProductById(params.productId);
  if (!item) {
    return <><Header /><main className="flex-1 grid place-items-center p-16"><div className="text-center"><h1 className="text-2xl font-black">Không tìm thấy sản phẩm</h1><Link href="/" className="btn-primary mt-4 inline-block">Quay lại trang chủ</Link></div></main><Footer /></>;
  }
  const add = () => { addItem(item, quantity); setAdded(true); };

  return <><Header /><main className="flex-1 bg-background py-10"><div className="container mx-auto max-w-5xl px-4">
    <div className="mb-6 flex gap-2 text-sm font-bold text-text-muted"><Link href="/products">Sản phẩm</Link><span>/</span><span className="text-black">{item.name}</span></div>
    <div className="neo-box bg-white flex flex-col overflow-hidden md:flex-row">
      <div className="grid min-h-96 flex-1 place-items-center border-b-2 border-black bg-gray-100 text-sm font-bold text-gray-500 md:border-b-0 md:border-r-2">[Ảnh sản phẩm]</div>
      <div className="flex flex-1 flex-col p-8"><h1 className="text-3xl font-black">{item.name}</h1><p className="mt-4 text-3xl font-black text-primary-dark">${item.price.toFixed(2)}</p><p className="mt-5 leading-relaxed text-text-muted">{item.description} Có thể kết nối Bluetooth và điều khiển bằng ứng dụng.</p>
        <div className="mt-auto pt-8"><div className="mb-4 flex h-11 w-fit border-2 border-black"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-11 border-r-2 border-black"><Minus size={16} className="mx-auto" /></button><span className="grid w-14 place-items-center font-bold">{quantity}</span><button onClick={() => setQuantity(quantity + 1)} className="w-11 border-l-2 border-black"><Plus size={16} className="mx-auto" /></button></div><button onClick={add} className="btn-primary flex w-full items-center justify-center gap-2 py-3">{added ? "Đã thêm vào giỏ" : "Thêm vào giỏ"} <ShoppingBag size={17} /></button>{added && <Link href="/cart" className="mt-3 block text-center text-sm font-bold text-primary-dark underline">Xem giỏ hàng</Link>}</div>
      </div>
    </div>
  </div></main><Footer /></>;
}
