"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Check,
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
import type { ProductType } from "@/features/cart/types";
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
  const [selectedTypes, setSelectedTypes] = useState<ProductType[]>(["LED_MODEL", "CHARACTER"]);
  const [selectedStatuses, setSelectedStatuses] = useState<("IN_STOCK" | "OUT_OF_STOCK")[]>(["IN_STOCK"]);
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [priceError, setPriceError] = useState("");
  const toggleType = (type: ProductType) => {
    setSelectedTypes((current) => current.includes(type) ? current.filter((value) => value !== type) : [...current, type]);
  };
  const toggleStatus = (status: "IN_STOCK" | "OUT_OF_STOCK") => {
    setSelectedStatuses((current) => current.includes(status) ? current.filter((value) => value !== status) : [...current, status]);
  };
  const applyPriceFilter = () => {
    const nextMin = minPriceInput === "" ? null : Number(minPriceInput);
    const nextMax = maxPriceInput === "" ? null : Number(maxPriceInput);
    if ((nextMin !== null && (!Number.isFinite(nextMin) || nextMin < 0)) ||
      (nextMax !== null && (!Number.isFinite(nextMax) || nextMax < 0)) ||
      (nextMin !== null && nextMax !== null && nextMin > nextMax)) {
      setPriceError("Vui lòng nhập khoảng giá hợp lệ.");
      return;
    }
    setPriceError("");
    setMinPrice(nextMin);
    setMaxPrice(nextMax);
  };
  const clearFilters = () => {
    setActiveCategory("all");
    setSelectedTypes(["LED_MODEL", "CHARACTER"]);
    setSelectedStatuses(["IN_STOCK"]);
    setMinPriceInput("");
    setMaxPriceInput("");
    setMinPrice(null);
    setMaxPrice(null);
    setPriceError("");
  };
  const filteredProducts = PRODUCTS.filter((product) => {
    const matchesCategory = activeCategory === "all" || product.productType === activeCategory;
    const matchesType = selectedTypes.includes(product.productType);
    const isInStock = true;
    const matchesStatus = (isInStock && selectedStatuses.includes("IN_STOCK")) || (!isInStock && selectedStatuses.includes("OUT_OF_STOCK"));
    const matchesMinPrice = minPrice === null || product.price >= minPrice;
    const matchesMaxPrice = maxPrice === null || product.price <= maxPrice;
    return matchesCategory && matchesType && matchesStatus && matchesMinPrice && matchesMaxPrice;
  });
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
              ].map((category) => <button key={category.value} onClick={() => { setActiveCategory(category.value); if (category.value === "all") setSelectedTypes(["LED_MODEL", "CHARACTER"]); else setSelectedTypes([category.value]); }} className={`mb-1 flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs font-semibold ${activeCategory === category.value ? "bg-[#e4efdc] text-[#126356]" : "hover:bg-gray-50"}`}>{category.icon}<span className="flex-1">{category.label}</span><span className="text-gray-400">({category.count})</span></button>)}
              <hr className="my-4 border-[#e6e9e0]" />
              <h2 className="mb-3 flex items-center gap-2 text-sm font-black"><SlidersHorizontal size={15} />Bộ lọc</h2>
              <p className="text-xs font-bold">Khoảng giá</p>
              <div className="mt-2 flex gap-1"><input type="number" min="0" value={minPriceInput} onChange={(event) => setMinPriceInput(event.target.value)} placeholder="Từ ($)" className="w-1/2 rounded border border-gray-300 px-2 py-1 text-xs" /><input type="number" min="0" value={maxPriceInput} onChange={(event) => setMaxPriceInput(event.target.value)} placeholder="Đến ($)" className="w-1/2 rounded border border-gray-300 px-2 py-1 text-xs" /></div>
              {priceError && <p className="mt-1 text-[11px] text-red-600">{priceError}</p>}
              <button onClick={applyPriceFilter} className="mt-2 w-full rounded bg-[#126356] py-1.5 text-xs font-bold text-white">Áp dụng</button>
              <p className="mb-2 mt-4 text-xs font-bold">Loại sản phẩm</p>
              {[["Thiết bị LED", "LED_MODEL"], ["Character", "CHARACTER"]].map(([label, type]) => <label key={label} className="mb-2 flex cursor-pointer items-center gap-2 text-xs"><input type="checkbox" checked={selectedTypes.includes(type as ProductType)} onChange={() => { toggleType(type as ProductType); setActiveCategory("all"); }} className="accent-[#126356]" />{label} ({PRODUCTS.filter((product) => product.productType === type).length})</label>)}
              <p className="mb-2 mt-4 text-xs font-bold">Trạng thái</p>
              {[["Còn hàng", "IN_STOCK", PRODUCTS.length], ["Hết hàng", "OUT_OF_STOCK", 0] as const].map(([label, status, count]) => <label key={label} className={`mb-2 flex items-center gap-2 text-xs ${count === 0 ? "text-gray-400" : "cursor-pointer"}`}><input type="checkbox" checked={selectedStatuses.includes(status as "IN_STOCK" | "OUT_OF_STOCK")} onChange={() => toggleStatus(status as "IN_STOCK" | "OUT_OF_STOCK")} className="accent-[#126356]" />{label} ({count})</label>)}
              <button onClick={clearFilters} className="mt-3 w-full text-right text-[11px] font-bold text-[#126356] hover:underline">Xóa tất cả bộ lọc</button>
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
                ].map((tab) => <button key={tab.label} onClick={() => { setActiveCategory(tab.value); if (tab.value === "all") setSelectedTypes(["LED_MODEL", "CHARACTER"]); else setSelectedTypes([tab.value]); }} className={`flex flex-col items-center gap-1 border-r border-[#e0e5da] px-2 py-3 text-[11px] font-bold last:border-0 ${activeCategory === tab.value && tab.label !== "Bộ sưu tập" && tab.label !== "Khuyến mãi" ? "text-[#126356]" : "text-gray-700 hover:bg-[#f3f8ef]"}`}>{tab.icon}{tab.label}</button>)}
              </div>
              <div className="mb-3 flex items-center justify-between"><p className="text-sm font-black">{sortedProducts.length} sản phẩm</p><label className="flex items-center gap-2 text-xs">Sắp xếp:<select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded border border-gray-300 bg-white px-2 py-1"><option>Phổ biến</option><option>Giá thấp</option><option>Giá cao</option></select></label></div>
              {sortedProducts.length > 0 ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{sortedProducts.map((product) => <ProductCard key={product.id} product={product} onAdd={addProduct} />)}</div> : <div className="rounded border border-dashed border-[#b8cbb8] bg-white p-10 text-center text-sm text-gray-500">Không có sản phẩm phù hợp với bộ lọc hiện tại.<button onClick={clearFilters} className="ml-1 font-bold text-[#126356] underline">Xóa bộ lọc</button></div>}
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
