"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Check,
  ChevronDown,
  Grid2X2,
  Heart,
  Monitor,
  PawPrint,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Tag,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { PRODUCTS, type CatalogProduct } from "@/features/cart/catalog";
import { useCart } from "@/features/cart/context/CartContext";

const formatPrice = (price: number) => `${(price * 24500).toLocaleString("vi-VN")} đ`;

function ProductArtwork({ product }: { product: CatalogProduct }) {
  if (product.previewUrl) {
    return <Image src={product.previewUrl} alt={product.name} fill className="object-contain p-5" />;
  }

  return (
    <div className="grid h-full place-items-center bg-gradient-to-br from-[#e8ead4] via-[#f6f1dc] to-[#d8e5d4]">
      {product.id === "controller-box" ? (
        <Monitor size={76} strokeWidth={1.2} className="text-[#126356]" />
      ) : (
        <div className="relative rounded-md border-8 border-[#252b2b] bg-[#18201f] p-3 shadow-lg">
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: 25 }, (_, index) => <span key={index} className={`h-2 w-2 rounded-sm ${index % 4 === 0 ? "bg-orange-400" : index % 3 === 0 ? "bg-cyan-300" : "bg-gray-700"}`} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, onAdd }: { product: CatalogProduct; onAdd: (product: CatalogProduct) => void }) {
  const isCharacter = product.productType === "CHARACTER";
  return (
    <article className="group overflow-hidden rounded border border-[#dbe2d7] bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#126356] hover:shadow-md">
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative aspect-[1.15] overflow-hidden bg-[#e7e8d3]">
          {product.id === "matrix-32" && <span className="absolute left-2 top-2 z-10 rounded bg-[#126356] px-2 py-1 text-[11px] font-bold text-white">Bán chạy</span>}
          {isCharacter && product.id === "character-cat-hero" && <span className="absolute left-2 top-2 z-10 rounded bg-red-500 px-2 py-1 text-[11px] font-bold text-white">Mới</span>}
          <ProductArtwork product={product} />
          <button type="button" onClick={(event) => event.preventDefault()} className="absolute right-2 top-2 rounded-full bg-white/80 p-1.5 text-gray-500 opacity-0 transition group-hover:opacity-100" aria-label="Yêu thích"><Heart size={15} /></button>
        </div>
        <div className="p-3">
          <p className="text-[11px] font-semibold text-gray-500">{isCharacter ? "Character" : "Thiết bị LED"}</p>
          <h2 className="mt-1 min-h-10 text-sm font-black text-[#173c35]">{product.name}</h2>
          <div className="mt-2 flex items-center justify-between gap-2">
            <strong className="text-sm font-black text-red-600">{formatPrice(product.price)}</strong>
            <button type="button" onClick={(event) => { event.preventDefault(); onAdd(product); }} className="rounded border border-[#126356] p-1.5 text-[#126356] hover:bg-[#e3f2e9]" aria-label={`Thêm ${product.name} vào giỏ`}><ShoppingCart size={16} /></button>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default function Home() {
  const { addItem } = useCart();
  const [activeCategory, setActiveCategory] = useState<"all" | "LED_MODEL" | "CHARACTER">("all");
  const [sort, setSort] = useState("Phổ biến");
  const [notice, setNotice] = useState("");
  const filteredProducts = PRODUCTS.filter((product) => activeCategory === "all" || product.productType === activeCategory);
  const sortedProducts = [...filteredProducts].sort((a, b) => sort === "Giá thấp" ? a.price - b.price : sort === "Giá cao" ? b.price - a.price : 0);

  const addProduct = (product: CatalogProduct) => {
    addItem(product);
    setNotice(`${product.name} đã được thêm vào giỏ hàng`);
    window.setTimeout(() => setNotice(""), 2500);
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-[#fbfaf3] py-5 text-[#173c35]">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="mb-4 flex items-center gap-2 text-xs text-gray-500"><Link href="/" className="hover:text-[#126356]">Trang chủ</Link><span>›</span><span className="font-bold text-gray-700">Sản phẩm</span></div>
          <div className="grid gap-5 lg:grid-cols-[195px_1fr]">
            <aside className="hidden h-fit rounded border border-[#e0e5da] bg-white p-3 lg:block">
              <h2 className="mb-3 text-sm font-black">Danh mục</h2>
              {[
                { label: "Tất cả sản phẩm", count: PRODUCTS.length, value: "all" as const, icon: <Grid2X2 size={17} /> },
                { label: "Thiết bị LED", count: PRODUCTS.filter((p) => p.productType === "LED_MODEL").length, value: "LED_MODEL" as const, icon: <Monitor size={17} /> },
                { label: "Character", count: PRODUCTS.filter((p) => p.productType === "CHARACTER").length, value: "CHARACTER" as const, icon: <PawPrint size={17} /> },
              ].map((category) => <button key={category.value} onClick={() => setActiveCategory(category.value)} className={`mb-1 flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs font-semibold ${activeCategory === category.value ? "bg-[#e4efdc] text-[#126356]" : "hover:bg-gray-50"}`}>{category.icon}<span className="flex-1">{category.label}</span><span className="text-gray-400">({category.count})</span></button>)}
              <hr className="my-4 border-[#e6e9e0]" />
              <h2 className="mb-3 flex items-center gap-2 text-sm font-black"><SlidersHorizontal size={15} />Bộ lọc</h2>
              <p className="text-xs font-bold">Khoảng giá</p>
              <div className="mt-2 flex gap-1"><input placeholder="Từ" className="w-1/2 rounded border border-gray-300 px-2 py-1 text-xs" /><input placeholder="Đến" className="w-1/2 rounded border border-gray-300 px-2 py-1 text-xs" /></div>
              <button className="mt-2 w-full rounded bg-[#126356] py-1.5 text-xs font-bold text-white">Áp dụng</button>
              <p className="mb-2 mt-4 text-xs font-bold">Loại sản phẩm</p>
              {["Thiết bị LED", "Character"].map((label) => <label key={label} className="mb-2 flex items-center gap-2 text-xs"><input type="checkbox" className="accent-[#126356]" />{label}</label>)}
              <p className="mb-2 mt-4 text-xs font-bold">Trạng thái</p>
              {["Còn hàng", "Hết hàng"].map((label, index) => <label key={label} className="mb-2 flex items-center gap-2 text-xs"><input type="checkbox" defaultChecked={index === 0} className="accent-[#126356]" />{label} ({index === 0 ? PRODUCTS.length : 0})</label>)}
            </aside>

            <div>
              <section className="relative mb-3 min-h-[158px] overflow-hidden rounded bg-[#dcebd4] px-8 py-6 shadow-sm">
                <div className="absolute -right-8 -top-12 h-48 w-48 rounded-full bg-[#c4dfbd]" />
                <Sparkles className="absolute right-56 top-8 text-white" size={20} />
                <div className="relative max-w-lg">
                  <p className="text-[11px] font-bold tracking-[0.3em] text-[#126356]">PIXEL HUB</p>
                  <h1 className="mt-1 text-2xl font-black uppercase leading-tight text-[#126356] md:text-3xl">Nhân vật Pixel<br />cho không gian của bạn</h1>
                  <p className="mt-2 max-w-md text-xs text-gray-600">Khám phá bộ sưu tập Character và thiết bị LED để tạo nên không gian sáng tạo và sống động hơn.</p>
                </div>
                <div className="absolute bottom-3 right-16 text-6xl">🐱</div>
              </section>
              <div className="mb-4 grid grid-cols-3 overflow-hidden rounded border border-[#e0e5da] bg-white sm:grid-cols-5">
                {[
                  { label: "Tất cả sản phẩm", icon: <Grid2X2 size={20} />, value: "all" as const },
                  { label: "Thiết bị LED", icon: <Monitor size={20} />, value: "LED_MODEL" as const },
                  { label: "Character", icon: <PawPrint size={20} />, value: "CHARACTER" as const },
                  { label: "Bộ sưu tập", icon: <Sparkles size={20} />, value: "all" as const },
                  { label: "Khuyến mãi", icon: <Tag size={20} />, value: "all" as const },
                ].map((tab) => <button key={tab.label} onClick={() => setActiveCategory(tab.value)} className={`flex flex-col items-center gap-1 border-r border-[#e0e5da] px-2 py-3 text-[11px] font-bold last:border-0 ${activeCategory === tab.value && tab.label !== "Bộ sưu tập" && tab.label !== "Khuyến mãi" ? "text-[#126356]" : "text-gray-700 hover:bg-[#f3f8ef]"}`}>{tab.icon}{tab.label}</button>)}
              </div>
              <div className="mb-3 flex items-center justify-between"><p className="text-sm font-black">{sortedProducts.length} sản phẩm</p><label className="flex items-center gap-2 text-xs">Sắp xếp:<select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded border border-gray-300 bg-white px-2 py-1"><option>Phổ biến</option><option>Giá thấp</option><option>Giá cao</option></select></label></div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{sortedProducts.map((product) => <ProductCard key={product.id} product={product} onAdd={addProduct} />)}</div>
              <div className="mt-5 flex items-center justify-center gap-2 rounded border border-[#dbe2d7] bg-white p-3 text-xs text-gray-500"><Check size={16} className="text-[#126356]" />Sản phẩm được chọn lọc cho hệ sinh thái Pixel Hub</div>
            </div>
          </div>
        </div>
        {notice && <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded bg-[#126356] px-5 py-3 text-sm font-bold text-white shadow-lg">{notice}</div>}
      </main>
      <Footer />
    </>
  );
}
