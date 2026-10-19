import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ShoppingBag } from "lucide-react";
import { PRODUCTS } from "@/features/cart/catalog";
import { Suspense } from "react";

type CatalogParams = Promise<{ q?: string | string[]; category?: string | string[] }>;

async function Catalog({ searchParams }: { searchParams: CatalogParams }) {
  const params = await searchParams;
  const query = params.q;
  const q = (Array.isArray(query) ? query[0] : query)?.trim() ?? "";
  const selectedCategory = Array.isArray(params.category) ? params.category[0] : params.category;
  const category = selectedCategory === "CHARACTER" || selectedCategory === "LED_MODEL" ? selectedCategory : "";
  const products = PRODUCTS.filter(product => (!category || product.productType === category) && `${product.name} ${product.description}`.toLocaleLowerCase("vi").includes(q.toLocaleLowerCase("vi")));
  return <><form action="/products" className="mb-6 flex flex-wrap gap-3"><input aria-label="Từ khóa sản phẩm" name="q" defaultValue={q} placeholder="Tìm sản phẩm..." className="min-w-0 flex-1 rounded border border-green-200 bg-white p-3" /><select aria-label="Danh mục sản phẩm" name="category" defaultValue={category} className="rounded border border-green-200 bg-white px-3 py-2"><option value="">Tất cả sản phẩm</option><option value="CHARACTER">Character</option><option value="LED_MODEL">Thiết bị LED</option></select><button className="btn-primary">Tìm kiếm</button></form>{q && <p className="mb-5 text-sm text-text-muted">{products.length} kết quả cho “{q}” · <Link href={category ? `/products?category=${category}` : "/products"} className="font-bold underline">Xóa tìm kiếm</Link></p>}<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.map(product => <article key={product.id} className="neo-box bg-white transition-transform hover:-translate-y-1"><Link href={`/products/${product.id}`}><div className="grid aspect-square place-items-center overflow-hidden border-b-2 border-black bg-primary/10">{product.previewUrl ? <img src={product.previewUrl} alt={product.name} className="h-full w-full object-contain p-5" /> : <ShoppingBag size={65} strokeWidth={1} className="text-green-800" />}</div><div className="p-4"><h2 className="font-black">{product.name}</h2><p className="mt-2 min-h-10 text-sm text-text-muted">{product.description}</p><div className="mt-4 flex items-center justify-between"><strong className="text-xl text-primary-dark">${product.price.toFixed(2)}</strong><span className="rounded-full bg-primary/20 p-2"><ShoppingBag size={16} /></span></div></div></Link></article>)}</div>{!products.length && <section className="rounded-xl border border-green-200 bg-white p-12 text-center"><h2 className="text-xl font-black">Không tìm thấy sản phẩm</h2><p className="mt-3 text-sm text-text-muted">Thử từ khóa khác hoặc xem toàn bộ danh mục.</p><Link href="/products" className="btn-primary mt-5 inline-block">Xem tất cả sản phẩm</Link></section>}</>;
}
export default function ProductsPage({ searchParams }: { searchParams: CatalogParams }) { return <><Header /><main className="flex-1 bg-background py-10"><div className="container mx-auto max-w-6xl px-4"><div className="mb-8"><p className="text-sm font-bold text-primary-dark">MIRAGE STORE</p><h1 className="text-3xl font-black uppercase">Sản phẩm</h1><p className="mt-2 text-text-muted">Chọn bảng LED và sprite phù hợp cho thiết kế của bạn.</p></div><Suspense fallback={<p role="status">Đang tải sản phẩm...</p>}><Catalog searchParams={searchParams} /></Suspense></div></main><Footer /></>; }
