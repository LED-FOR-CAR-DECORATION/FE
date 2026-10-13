"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Check,
  ChevronRight,
  Download,
  Heart,
  Minus,
  Monitor,
  Plus,
  ShoppingBag,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/features/cart/context/CartContext";
import { getProductById, PRODUCTS } from "@/features/cart/catalog";

const formatPrice = (price: number) => `${(price * 24500).toLocaleString("vi-VN")} đ`;

export default function ProductDetailPage() {
  const params = useParams<{ productId: string }>();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeMedia, setActiveMedia] = useState(0);
  const item = getProductById(params.productId);

  if (!item) {
    return <><Header /><main className="flex-1 grid place-items-center p-16"><div className="text-center"><h1 className="text-2xl font-black">Không tìm thấy sản phẩm</h1><Link href="/products" className="btn-primary mt-4 inline-block">Quay lại sản phẩm</Link></div></main><Footer /></>;
  }

  const isCharacter = item.productType === "CHARACTER";
  const productTypeLabel = isCharacter ? "Character" : "Thiết bị LED";
  const relatedProducts = PRODUCTS.filter((product) => product.id !== item.id && product.productType === item.productType).slice(0, 6);
  const specifications = [
    ["Tên sản phẩm", item.name],
    ["Định dạng tệp", item.format ?? "Thiết bị phần cứng"],
    ["Độ phân giải", isCharacter ? "32 × 32 pixel" : item.name.match(/\d+\s*×\s*\d+/)?.[0] ?? "Tùy thiết bị"],
    ["Số khung hình", item.animationType === "LOOP" ? "12 khung hình" : "1 khung hình"],
    ["Thời lượng vòng lặp", item.animationType === "LOOP" ? "Khoảng 3 giây" : "Không áp dụng"],
    ["Dung lượng tệp", isCharacter ? "Khoảng 500 KB" : "Không áp dụng"],
    ["Màu sắc", isCharacter ? "Cam, trắng, nâu, đen" : "Theo mẫu thiết bị"],
    ["Tương thích", isCharacter ? "Các thiết bị LED hỗ trợ 8×8 trở lên" : "Bluetooth và ứng dụng điều khiển"],
  ];

  const add = () => {
    addItem(item, quantity);
    setAdded(true);
  };

  return <><Header /><main className="flex-1 bg-[#fbfaf3] py-5 text-[#173c35]">
    <div className="container mx-auto max-w-7xl px-4">
      <nav className="mb-4 flex items-center gap-1 text-xs text-gray-500">
        <Link href="/" className="hover:text-primary-dark">Trang chủ</Link><ChevronRight size={13} />
        <Link href="/products" className="hover:text-primary-dark">{productTypeLabel}</Link><ChevronRight size={13} />
        <span className="font-semibold text-gray-700">{item.name}</span>
      </nav>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_1.1fr_0.72fr]">
        <div className="flex gap-3">
          <div className="flex w-14 flex-col gap-2">
            {[item.previewUrl, item.previewUrl, item.previewUrl, item.previewUrl].map((image, index) => (
              <button key={index} onClick={() => setActiveMedia(index)} className={`relative aspect-square overflow-hidden rounded border-2 bg-[#e4e3c8] ${activeMedia === index ? "border-[#126356]" : "border-transparent"}`} aria-label={`Xem ảnh ${index + 1}`}>
                {image ? <Image src={image} alt="" fill sizes="56px" className="object-contain p-1" /> : <Sparkles size={18} className="m-auto text-[#126356]" />}
              </button>
            ))}
            <button className="grid aspect-square place-items-center rounded border-2 border-transparent bg-[#e4e3c8] text-[#126356]" aria-label="Xem video"><Monitor size={18} /></button>
          </div>
          <div className="relative min-h-[330px] flex-1 overflow-hidden rounded bg-[#d9d8b4]">
            {item.previewUrl ? <Image src={item.previewUrl} alt={`Ảnh sản phẩm ${item.name}`} fill sizes="(max-width: 1024px) 100vw, 45vw" priority className="object-contain p-8" /> : <div className="grid h-full place-items-center text-sm font-bold text-gray-500">Ảnh sản phẩm</div>}
            <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 bg-black/60 px-4 py-3 text-white">
              <button className="grid h-7 w-7 place-items-center rounded-full bg-white text-[#126356]" aria-label="Phát xem trước">▶</button>
              <div className="h-1 flex-1 rounded-full bg-white/40"><div className="h-full w-1/3 rounded-full bg-white" /></div>
              <span className="text-xs">0:01 / 0:03</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex gap-2 text-xs font-bold">
            <span className="rounded-full border border-[#126356] bg-[#e3f2e9] px-3 py-1"><Monitor size={12} className="mr-1 inline" />{productTypeLabel}</span>
            <span className="rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-orange-700">🔥 Bán chạy</span>
          </div>
          <h1 className="mt-3 text-2xl font-black text-gray-900 md:text-3xl">{item.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm"><span className="flex text-amber-400">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={15} fill="currentColor" />)}</span><span className="text-gray-600">4.8 (128 đánh giá)</span></div>
          <p className="mt-2 text-2xl font-black text-[#126356]">{formatPrice(item.price)}</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.description} {isCharacter ? "Hiển thị rõ nét trên bảng LED và phù hợp cho nhiều phong cách pixel art." : "Thiết kế nhỏ gọn, dễ lắp đặt và điều khiển bằng ứng dụng."}</p>
          <p className="mt-5 text-xs font-bold text-gray-700">Số lượng</p>
          <div className="mt-2 flex h-9 w-fit border border-gray-300 bg-white">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-9 border-r border-gray-300" aria-label="Giảm số lượng"><Minus size={14} className="mx-auto" /></button>
            <span className="grid w-12 place-items-center text-sm">{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)} className="w-9 border-l border-gray-300" aria-label="Tăng số lượng"><Plus size={14} className="mx-auto" /></button>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={add} className="flex flex-1 items-center justify-center gap-2 rounded bg-[#126356] px-4 py-3 text-sm font-bold text-white hover:bg-[#0d4c42]"><ShoppingBag size={16} />{added ? "Đã thêm vào giỏ" : "Thêm vào giỏ hàng"}</button>
            <button className="rounded border border-[#126356] px-4 py-3 text-sm font-bold text-[#126356] hover:bg-[#e3f2e9]"><Zap size={16} className="mr-1 inline" />Mua ngay</button>
          </div>
          {added && <Link href="/cart" className="mt-2 text-center text-sm font-bold text-[#126356] underline">Xem giỏ hàng</Link>}
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-gray-200 pt-4 text-center text-[11px] text-gray-600">
            <div><Download size={17} className="mx-auto mb-1 text-[#126356]" /><b>Sản phẩm số</b><br />Nhận file ngay sau thanh toán</div>
            <div><Check size={17} className="mx-auto mb-1 text-[#126356]" /><b>Sử dụng trọn đời</b><br />Không giới hạn thời gian</div>
            <div><Monitor size={17} className="mx-auto mb-1 text-[#126356]" /><b>Tương thích nhiều thiết bị</b><br />8×8, 16×16, 32×32...</div>
          </div>
        </div>

        <aside className="h-fit rounded border border-gray-200 bg-white p-4 text-sm">
          <h2 className="font-black text-gray-900"><Monitor size={16} className="mr-2 inline text-[#126356]" />Tương thích thiết bị</h2>
          <p className="mt-3 text-xs leading-relaxed text-gray-500">Hoạt động tốt trên các thiết bị LED hỗ trợ độ phân giải từ 8×8 trở lên.</p>
          <ul className="mt-3 space-y-2 text-xs font-semibold text-gray-700">
            {["Mirage Mini 8×8", "Mirage Matrix 16×16", "Mirage Matrix 32×32", "Mirage Matrix Pro 64×32", "Mirage Dock"].map((device) => <li key={device}><Check size={14} className="mr-2 inline rounded-full bg-[#126356] p-0.5 text-white" />{device}</li>)}
          </ul>
          <p className="mt-3 text-xs font-semibold text-gray-600"><Check size={14} className="mr-2 inline rounded-full bg-[#126356] p-0.5 text-white" />Các thiết bị tương thích khác</p>
        </aside>
      </section>

      <section className="mt-6 overflow-hidden rounded border border-gray-200 bg-white">
        <div className="flex flex-wrap border-b border-gray-200 text-sm font-bold">
          {["Tổng quan", "Thông số kỹ thuật", "Hướng dẫn cài đặt", "Đánh giá (128)"].map((tab, index) => <a key={tab} href={index === 0 ? "#overview" : index === 1 ? "#specifications" : "#overview"} className={`px-5 py-3 hover:text-[#126356] ${index === 0 ? "border-b-2 border-[#126356] text-[#126356]" : "text-gray-700"}`}>{tab}</a>)}
        </div>
        <div id="overview" className="grid gap-8 p-5 lg:grid-cols-[1.25fr_0.9fr]">
          <div>
            <h2 className="text-lg font-black text-gray-900"><Sparkles size={18} className="mr-2 inline text-[#126356]" />Giới thiệu {productTypeLabel}</h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">{item.description} Sản phẩm được tối ưu cho trải nghiệm hiển thị pixel rõ ràng, màu sắc nổi bật và thao tác cài đặt đơn giản. Phù hợp cho người mới bắt đầu cũng như người yêu thích thiết kế pixel art.</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {[["Đẹp mắt", "Phù hợp mọi không gian"], ["Hoạt ảnh mượt mà", "Hiển thị êm và sống động"], ["Tương thích rộng", "Nhiều thiết bị LED"], ["Tải về ngay", "Sau khi thanh toán"]].map(([title, text], index) => <div key={title} className="rounded border border-gray-200 p-3 text-xs"><Heart size={16} className={`mr-2 inline ${index === 0 ? "text-red-500" : "text-[#126356]"}`} /><b className="text-gray-800">{title}</b><p className="mt-1 pl-6 text-gray-500">{text}</p></div>)}
            </div>
          </div>
          <div id="specifications">
            <h2 className="text-lg font-black text-gray-900"><Sparkles size={18} className="mr-2 inline text-[#126356]" />Thông số kỹ thuật</h2>
            <dl className="mt-3 divide-y divide-gray-200 rounded border border-gray-200 text-xs">
              {specifications.map(([label, value]) => <div key={label} className="grid grid-cols-[1fr_1.2fr] gap-3 px-3 py-2"><dt className="text-gray-500">{label}</dt><dd className="font-semibold text-gray-700">{value}</dd></div>)}
            </dl>
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 && <section className="mt-6">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black">Các {isCharacter ? "Character" : "thiết bị LED"} khác</h2><Link href="/products" className="text-xs font-bold text-[#126356] hover:underline">Xem tất cả <ChevronRight size={13} className="inline" /></Link></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{relatedProducts.map((product) => <Link key={product.id} href={`/products/${product.id}`} className="rounded border border-gray-200 bg-white p-2 transition hover:-translate-y-1 hover:border-[#126356]"><div className="relative aspect-square rounded bg-[#e4e3c8]">{product.previewUrl ? <Image src={product.previewUrl} alt={product.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw" className="object-contain p-2" /> : <Monitor size={24} className="absolute inset-0 m-auto text-[#126356]" />}</div><p className="mt-2 truncate text-xs font-bold text-gray-800">{product.name}</p><p className="text-xs font-black text-[#126356]">{formatPrice(product.price)}</p></Link>)}</div>
      </section>}
    </div>
  </main><Footer /></>;
}
