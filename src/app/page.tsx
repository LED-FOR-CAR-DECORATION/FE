"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Check,
  Grid2X2,
  Heart,
  Monitor,
  PawPrint,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import type { CatalogProduct } from "@/features/cart/catalog";
import type { ProductType } from "@/features/cart/types";
import { useCart } from "@/features/cart/context/CartContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/api/auth";
import { fetchStoreProducts } from "@/lib/api/products";

const formatPrice = (price: number) => `${price.toLocaleString("vi-VN")} đ`;
const PRODUCTS_PER_PAGE = 12;
const ALL_PRODUCT_TYPES: ProductType[] = ["LED_MODEL", "CHARACTER", "BUNDLE", "SUBSCRIPTION"];

const slideUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const gridContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

const cardItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const cardHover = { y: -5, boxShadow: "0 14px 28px rgba(38,53,47,0.16)" };
const buttonTap = { scale: 0.95 };

const HERO_SLIDES = [
  {
    id: "mirage",
    tag: "MIRAGE COLLECTION",
    title: "Nhân vật pixel cho không gian của bạn",
    desc: "Khám phá bộ sưu tập Character và thiết bị LED để tạo nên không gian sáng tạo mang dấu ấn riêng.",
    bg: "bg-[#dcebd4] border-[#cfe3d0]",
    circle: "bg-[#c4dfbd]",
    emoji: "🐱",
  },
  {
    id: "led",
    tag: "LED MATRIX",
    title: "Bảng LED sống động cho mọi góc nhìn",
    desc: "Các mẫu bảng LED matrix nhiều kích thước, dễ lắp đặt và điều khiển chỉ với vài thao tác.",
    bg: "bg-[#d6e8f0] border-[#bfd9e6]",
    circle: "bg-[#bcd8e6]",
    emoji: "🎮",
  },
  {
    id: "bundle",
    tag: "COMBO ƯU ĐÃI",
    title: "Gói sản phẩm tiết kiệm hơn",
    desc: "Kết hợp thiết bị LED và nhân vật pixel trong một gói duy nhất với mức giá hấp dẫn.",
    bg: "bg-[#f3e3d3] border-[#ead3bb]",
    circle: "bg-[#ebd0b3]",
    emoji: "✨",
  },
];

function HeroCarousel({ onExplore }: { onExplore: () => void }) {
  return (
    <Swiper
      modules={[Autoplay, Pagination]}
      autoplay={{ delay: 4000, disableOnInteraction: false }}
      loop
      pagination={{ clickable: true }}
      className="mb-5 overflow-hidden rounded-2xl shadow-sm"
    >
      {HERO_SLIDES.map((slide) => (
        <SwiperSlide key={slide.id}>
          <section className={`relative min-h-[210px] overflow-hidden rounded-2xl border px-7 py-7 pb-10 md:px-10 ${slide.bg}`}>
            <div className={`absolute -right-8 -top-12 h-48 w-48 rounded-full ${slide.circle}`} />
            <Sparkles className="absolute right-56 top-8 text-white" size={20} />
            <div className="relative max-w-lg">
              <p className="text-xs font-bold tracking-[0.25em] text-[#155e59]">{slide.tag}</p>
              <h1 className="mt-2 max-w-xl text-3xl font-black leading-tight text-[#155e59] md:text-4xl">{slide.title}</h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-[#66736b]">{slide.desc}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <motion.button whileTap={buttonTap} type="button" onClick={onExplore} className="rounded-lg bg-[#155e59] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0e4b47]">Khám phá sản phẩm</motion.button>
                <motion.div whileTap={buttonTap} className="inline-block">
                  <Link href="/commission" className="block rounded-lg border border-[#155e59] bg-white px-4 py-2.5 text-sm font-bold text-[#155e59] shadow-sm transition hover:bg-[#f3f8ef]">Yêu cầu thiết kế</Link>
                </motion.div>
              </div>
            </div>
            <div className="absolute bottom-3 right-16 text-6xl">{slide.emoji}</div>
          </section>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}

function ProductArtwork({ product }: { product: CatalogProduct }) {
  if (product.previewUrl) {
    return <Image src={product.previewUrl} alt={product.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-contain p-3 [image-rendering:pixelated]" />;
  }

  return (
    <div className="grid h-full place-items-center bg-gradient-to-br from-[#e8ead4] via-[#f6f1dc] to-[#d8e5d4]">
      <Monitor size={76} strokeWidth={1.2} className="text-[#126356]" />
    </div>
  );
}

function ProductCard({ product, onAdd, canBuy }: { product: CatalogProduct; onAdd: (product: CatalogProduct) => void; canBuy: boolean }) {
  const isCharacter = product.productType === "CHARACTER";
  const isBundle = product.productType === "BUNDLE";
  const isSubscription = product.productType === "SUBSCRIPTION";
  const typeLabel = isSubscription ? "Gói thành viên" : isBundle ? "Gói sản phẩm" : isCharacter ? "Nhân vật" : "Thiết bị LED";
  return (
    <motion.article variants={cardItem} whileHover={cardHover} className="group overflow-hidden rounded-xl border border-[#e2e4db] bg-white shadow-[0_4px_14px_rgba(38,53,47,0.05)] transition-colors hover:border-[#8fc7a0]">
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-[#f8f7ef]">
          <ProductArtwork product={product} />
          <button type="button" onClick={(event) => event.preventDefault()} className="absolute right-2 top-2 rounded-full bg-white/80 p-1.5 text-gray-500 opacity-0 transition group-hover:opacity-100" aria-label="Yêu thích"><Heart size={15} /></button>
        </div>
        <div className="p-3">
          <p className="text-xs font-semibold text-[#66736b]">{typeLabel}</p>
          <h2 className="mt-1 min-h-10 text-[15px] font-black leading-5 text-[#26352f]">{product.name}</h2>
          <div className="mt-2 flex items-center justify-between gap-2">
            <strong className="text-sm font-black text-[#155e59]">{formatPrice(product.price)}</strong>
            <button type="button" disabled={!canBuy} title={canBuy ? undefined : "Vui lòng đăng nhập để thêm vào giỏ hàng"} onClick={(event) => { event.preventDefault(); if (canBuy) onAdd(product); }} className="rounded-lg border border-[#155e59] p-1.5 text-[#155e59] transition hover:bg-[#dcebd4] focus:outline-none focus:ring-2 focus:ring-[#8fc7a0] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent" aria-label={`Thêm ${product.name} vào giỏ`}><ShoppingCart size={16} /></button>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

export default function Home() {
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [activeCategory, setActiveCategory] = useState<"all" | ProductType>("all");
  const [sort, setSort] = useState("Phổ biến");
  const [notice, setNotice] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<ProductType[]>(ALL_PRODUCT_TYPES);
  const [selectedStatuses, setSelectedStatuses] = useState<("IN_STOCK" | "OUT_OF_STOCK")[]>(["IN_STOCK"]);
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [priceError, setPriceError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoadingProducts(true);
    fetchStoreProducts({ page: 0, size: 100 })
      .then((res) => {
        if (!cancelled) setProducts(res.items);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    setSelectedTypes(ALL_PRODUCT_TYPES);
    setSelectedStatuses(["IN_STOCK"]);
    setMinPriceInput("");
    setMaxPriceInput("");
    setMinPrice(null);
    setMaxPrice(null);
    setPriceError("");
  };
  const filteredProducts = products.filter((product) => {
    const matchesCategory = activeCategory === "all" || product.productType === activeCategory;
    const matchesType = selectedTypes.includes(product.productType);
    const isInStock = true;
    const matchesStatus = (isInStock && selectedStatuses.includes("IN_STOCK")) || (!isInStock && selectedStatuses.includes("OUT_OF_STOCK"));
    const matchesMinPrice = minPrice === null || product.price >= minPrice;
    const matchesMaxPrice = maxPrice === null || product.price <= maxPrice;
    return matchesCategory && matchesType && matchesStatus && matchesMinPrice && matchesMaxPrice;
  });
  const sortedProducts = [...filteredProducts].sort((a, b) => sort === "Giá thấp" ? a.price - b.price : sort === "Giá cao" ? b.price - a.price : 0);
  const pageCount = Math.max(1, Math.ceil(sortedProducts.length / PRODUCTS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const paginatedProducts = sortedProducts.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [activeCategory, maxPrice, minPrice, selectedStatuses, selectedTypes, sort]);

  const addProduct = async (product: CatalogProduct) => {
    try {
      await addItem(product);
      setNotice(`${product.name} đã được thêm vào giỏ hàng`);
    } catch (err) {
      setNotice(getApiErrorMessage(err, "Không thể thêm sản phẩm vào giỏ hàng."));
    }
    window.setTimeout(() => setNotice(""), 2500);
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-[#f8f7ef] py-7 text-[#26352f]">
        <div className="mx-auto w-full max-w-[1320px] px-4 lg:px-8">
          <div className="mb-5 flex items-center gap-2 text-sm text-[#66736b]"><Link href="/" className="hover:text-[#155e59]">Trang chủ</Link><span>›</span><span className="font-bold text-[#26352f]">Sản phẩm</span></div>
          <div className="grid gap-6 lg:grid-cols-[232px_minmax(0,1fr)]">
            <motion.aside variants={slideUp} initial="hidden" animate="visible" className="h-fit rounded-xl border border-[#e2e4db] bg-white p-5 shadow-sm lg:sticky lg:top-24">
              <h2 className="mb-4 text-base font-black text-[#155e59]">Danh mục</h2>
              {[
                { label: "Tất cả sản phẩm", count: products.length, value: "all" as const, icon: <Grid2X2 size={17} /> },
                { label: "Thiết bị LED", count: products.filter((p) => p.productType === "LED_MODEL").length, value: "LED_MODEL" as const, icon: <Monitor size={17} /> },
                { label: "Nhân vật", count: products.filter((p) => p.productType === "CHARACTER").length, value: "CHARACTER" as const, icon: <PawPrint size={17} /> },
                { label: "Gói sản phẩm", count: products.filter((p) => p.productType === "BUNDLE").length, value: "BUNDLE" as const, icon: <Sparkles size={17} /> },
              ].map((category) => <button key={category.value} onClick={() => { setActiveCategory(category.value); if (category.value === "all") setSelectedTypes(ALL_PRODUCT_TYPES); else setSelectedTypes([category.value]); }} className={`mb-1 flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs font-semibold ${activeCategory === category.value ? "bg-[#e4efdc] text-[#126356]" : "hover:bg-gray-50"}`}>{category.icon}<span className="flex-1">{category.label}</span><span className="text-gray-400">({category.count})</span></button>)}
              <hr className="my-5 border-[#e2e4db]" />
              <h2 className="mb-4 flex items-center gap-2 text-base font-black text-[#155e59]"><SlidersHorizontal size={16} />Bộ lọc</h2>
              <p className="text-sm font-bold">Khoảng giá (VND)</p>
              <div className="mt-2 flex gap-2"><input type="number" min="0" value={minPriceInput} onChange={(event) => setMinPriceInput(event.target.value)} placeholder="Từ" className="w-1/2 rounded-lg border border-[#d4ddd5] px-2 py-2 text-xs outline-none focus:border-[#155e59] focus:ring-2 focus:ring-[#dcebd4]" /><input type="number" min="0" value={maxPriceInput} onChange={(event) => setMaxPriceInput(event.target.value)} placeholder="Đến" className="w-1/2 rounded-lg border border-[#d4ddd5] px-2 py-2 text-xs outline-none focus:border-[#155e59] focus:ring-2 focus:ring-[#dcebd4]" /></div>
              {priceError && <p className="mt-1 text-[11px] text-red-600">{priceError}</p>}
              <button onClick={applyPriceFilter} className="mt-3 w-full rounded-lg bg-[#155e59] py-2 text-sm font-bold text-white transition hover:bg-[#0e4b47] focus:outline-none focus:ring-2 focus:ring-[#8fc7a0]">Áp dụng</button>
              <p className="mb-3 mt-5 text-sm font-bold">Loại sản phẩm</p>
              {[["Thiết bị LED", "LED_MODEL"], ["Character", "CHARACTER"], ["Bundle", "BUNDLE"], ["Subscription", "SUBSCRIPTION"]].map(([label, type]) => <label key={label} className="mb-2 flex cursor-pointer items-center gap-2 text-xs"><input type="checkbox" checked={selectedTypes.includes(type as ProductType)} onChange={() => { toggleType(type as ProductType); setActiveCategory("all"); }} className="accent-[#126356]" />{label} ({products.filter((product) => product.productType === type).length})</label>)}
              <p className="mb-3 mt-5 text-sm font-bold">Trạng thái</p>
              {[["Còn hàng", "IN_STOCK", products.length], ["Hết hàng", "OUT_OF_STOCK", 0] as const].map(([label, status, count]) => <label key={label} className={`mb-2 flex items-center gap-2 text-xs ${count === 0 ? "text-gray-400" : "cursor-pointer"}`}><input type="checkbox" checked={selectedStatuses.includes(status as "IN_STOCK" | "OUT_OF_STOCK")} onChange={() => toggleStatus(status as "IN_STOCK" | "OUT_OF_STOCK")} className="accent-[#126356]" />{label} ({count})</label>)}
              <button onClick={clearFilters} className="mt-4 w-full text-right text-xs font-bold text-[#155e59] hover:underline">Xóa tất cả bộ lọc</button>
            </motion.aside>

            <motion.div variants={slideUp} initial="hidden" animate="visible">
              <HeroCarousel onExplore={() => { setActiveCategory("all"); setSelectedTypes(ALL_PRODUCT_TYPES); }} />
              <div className="mb-5 grid grid-cols-2 overflow-hidden rounded-xl border border-[#e2e4db] bg-white sm:grid-cols-5">
                {[
                  { label: "Tất cả sản phẩm", icon: <Grid2X2 size={20} />, value: "all" as const },
                  { label: "Thiết bị LED", icon: <Monitor size={20} />, value: "LED_MODEL" as const },
                  { label: "Character", icon: <PawPrint size={20} />, value: "CHARACTER" as const },
                  { label: "Bundle", icon: <Sparkles size={20} />, value: "BUNDLE" as const },
                  { label: "Subscription", icon: <Sparkles size={20} />, value: "SUBSCRIPTION" as const },
                ].map((tab) => <button key={tab.label} onClick={() => { setActiveCategory(tab.value); if (tab.value === "all") setSelectedTypes(ALL_PRODUCT_TYPES); else setSelectedTypes([tab.value]); }} className={`flex flex-col items-center gap-1 border-r border-[#e0e5da] px-2 py-3 text-[11px] font-bold last:border-0 ${activeCategory === tab.value ? "text-[#126356]" : "text-gray-700 hover:bg-[#f3f8ef]"}`}>{tab.icon}{tab.label}</button>)}
              </div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black text-[#155e59]">Khám phá sản phẩm</h2><p className="mt-1 text-sm text-[#66736b]">{loadingProducts ? "Đang tải sản phẩm từ hệ thống..." : `${sortedProducts.length} sản phẩm`}</p></div><label className="flex items-center gap-2 text-sm font-semibold text-[#66736b]">Sắp xếp:<select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-lg border border-[#d4ddd5] bg-white px-3 py-2 text-sm text-[#26352f] outline-none focus:border-[#155e59]"><option>Phổ biến</option><option>Giá thấp</option><option>Giá cao</option></select></label></div>
              {loadingProducts ? (
                <div className="rounded border border-dashed border-[#b8cbb8] bg-white p-10 text-center text-sm text-gray-500">Đang tải danh sách sản phẩm từ máy chủ...</div>
              ) : sortedProducts.length > 0 ? <><motion.div variants={gridContainer} initial="hidden" animate="visible" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{paginatedProducts.map((product) => <ProductCard key={product.id} product={product} onAdd={addProduct} canBuy={isAuthenticated} />)}</motion.div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded border border-[#dbe2d7] bg-white p-3"><p className="text-xs text-gray-500">Hiển thị {(currentPage - 1) * PRODUCTS_PER_PAGE + 1} - {Math.min(currentPage * PRODUCTS_PER_PAGE, sortedProducts.length)} / {sortedProducts.length} sản phẩm</p><div className="flex items-center gap-1"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1} className="rounded border border-gray-300 p-1.5 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Trang trước"><ChevronLeft size={16} /></button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} className={`min-w-8 rounded border px-2 py-1 text-xs font-bold ${currentPage === pageNumber ? "border-[#126356] bg-[#e4efdc] text-[#126356]" : "border-gray-300 hover:bg-[#f3f8ef]"}`} aria-label={`Trang ${pageNumber}`}>{pageNumber}</button>)}<button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={currentPage === pageCount} className="rounded border border-gray-300 p-1.5 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Trang sau"><ChevronRight size={16} /></button></div></div></> : <div className="rounded border border-dashed border-[#b8cbb8] bg-white p-10 text-center text-sm text-gray-500">Không có sản phẩm phù hợp với bộ lọc hiện tại.<button onClick={clearFilters} className="ml-1 font-bold text-[#126356] underline">Xóa bộ lọc</button></div>}
              <div className="mt-5 flex items-center justify-center gap-2 rounded border border-[#dbe2d7] bg-white p-3 text-xs text-gray-500"><Check size={16} className="text-[#126356]" />Sản phẩm được chọn lọc cho hệ sinh thái Mirage</div>
            </motion.div>
          </div>
        </div>
        {notice && <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded bg-[#126356] px-5 py-3 text-sm font-bold text-white shadow-lg">{notice}</div>}
      </main>
      <Footer />
    </>
  );
}
