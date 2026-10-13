import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ShoppingBag } from "lucide-react";
import { PRODUCTS } from "@/features/cart/catalog";

export default function ProductsPage() {
  return <><Header /><main className="flex-1 bg-background py-10"><div className="container mx-auto max-w-6xl px-4"><div className="mb-8"><p className="text-sm font-bold text-primary-dark">MIRAGE STORE</p><h1 className="text-3xl font-black uppercase">Sản phẩm</h1><p className="mt-2 text-text-muted">Chọn bảng LED và sprite phù hợp cho thiết kế của bạn.</p></div><div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">{PRODUCTS.map((product) => <article key={product.id} className="neo-box bg-white transition-transform hover:-translate-y-1"><Link href={`/products/${product.id}`}><div className="grid aspect-square place-items-center border-b-2 border-black bg-gray-100 text-xs font-bold text-gray-500">[Ảnh sản phẩm]</div><div className="p-4"><h2 className="font-black">{product.name}</h2><p className="mt-2 min-h-10 text-sm text-text-muted">{product.description}</p><div className="mt-4 flex items-center justify-between"><strong className="text-xl text-primary-dark">${product.price.toFixed(2)}</strong><span className="rounded-full bg-primary/20 p-2"><ShoppingBag size={16} /></span></div></div></Link></article>)}</div></div></main><Footer /></>;
}
