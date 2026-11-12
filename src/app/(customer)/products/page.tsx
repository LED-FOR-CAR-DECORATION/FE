"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { PRODUCTS } from "@/features/cart/catalog";

const formatPrice = (price: number) => `${price.toLocaleString("vi-VN")} đ`;
const PRODUCTS_PER_PAGE = 12;

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const pageCount = Math.ceil(PRODUCTS.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = PRODUCTS.slice((page - 1) * PRODUCTS_PER_PAGE, page * PRODUCTS_PER_PAGE);

  return <><Header /><main className="flex-1 bg-background py-10"><div className="container mx-auto max-w-6xl px-4"><div className="mb-8"><p className="text-sm font-bold text-primary-dark">MIRAGE STORE</p><h1 className="text-3xl font-black uppercase">Sản phẩm</h1><p className="mt-2 text-text-muted">Chọn bảng LED và sprite phù hợp cho thiết kế của bạn.</p></div><div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">{paginatedProducts.map((product) => <article key={product.id} className="neo-box bg-white transition-transform hover:-translate-y-1"><Link href={`/products/${product.id}`}><div className="relative aspect-square overflow-hidden border-b-2 border-black bg-transparent">{product.previewUrl ? <Image src={product.previewUrl} alt={product.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover" /> : <div className="grid h-full place-items-center text-xs font-bold text-gray-500">[Ảnh sản phẩm]</div>}</div><div className="p-4"><h2 className="font-black">{product.name}</h2><p className="mt-2 min-h-10 text-sm text-text-muted">{product.description}</p><div className="mt-4 flex items-center justify-between"><strong className="text-xl text-primary-dark">{formatPrice(product.price)}</strong><span className="rounded-full bg-primary/20 p-2"><ShoppingBag size={16} /></span></div></div></Link></article>)}</div><div className="mt-6 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-text-muted">Hiển thị {(page - 1) * PRODUCTS_PER_PAGE + 1} - {Math.min(page * PRODUCTS_PER_PAGE, PRODUCTS.length)} / {PRODUCTS.length} sản phẩm</p><div className="flex items-center gap-1"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="border border-gray-300 p-2 disabled:opacity-40" aria-label="Trang trước"><ChevronLeft size={16} /></button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} className={`min-w-8 border px-2 py-1 text-xs font-bold ${page === pageNumber ? "border-primary-dark bg-primary/20 text-primary-dark" : "border-gray-300"}`}>{pageNumber}</button>)}<button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount} className="border border-gray-300 p-2 disabled:opacity-40" aria-label="Trang sau"><ChevronRight size={16} /></button></div></div></div></main><Footer /></>;
}
