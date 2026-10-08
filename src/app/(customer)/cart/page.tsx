import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ShoppingBag, Trash2 } from "lucide-react";

export default function CartPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background py-10">
        <div className="container mx-auto px-4 max-w-4xl flex flex-col min-h-[60vh]">
          
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-white border-2 border-black rounded-md">
              <ShoppingBag size={28} />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Giỏ hàng</h1>
          </div>

          {/* Cart Items Box */}
          <div className="neo-box-no-hover bg-white flex flex-col mb-8 overflow-hidden">
            {/* Header row */}
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b-2 border-black font-bold uppercase text-sm bg-gray-50">
              <div className="col-span-1 flex items-center justify-center">
                <input type="checkbox" className="w-5 h-5 border-2 border-black rounded-none appearance-none checked:bg-primary checked:after:content-['✓'] flex items-center justify-center text-black font-bold" />
              </div>
              <div className="col-span-5">Sản phẩm</div>
              <div className="col-span-2 text-center">Đơn giá</div>
              <div className="col-span-2 text-center">Số lượng</div>
              <div className="col-span-2 text-right">Thành tiền</div>
            </div>

            {/* Item 1 */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b-2 border-black items-center group">
              <div className="col-span-12 md:col-span-1 flex items-center justify-start md:justify-center mb-4 md:mb-0">
                <input type="checkbox" className="w-5 h-5 border-2 border-black rounded-none appearance-none checked:bg-primary checked:after:content-['✓'] flex items-center justify-center text-black font-bold" />
              </div>
              <div className="col-span-12 md:col-span-5 flex gap-4">
                <div className="w-24 h-24 bg-gray-200 border-2 border-black flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-500 uppercase">
                  [Img]
                </div>
                <div className="flex flex-col justify-center">
                  <h4 className="font-bold text-base leading-tight uppercase line-clamp-2">32x32 Matrix Panel</h4>
                  <p className="text-sm font-medium text-text-muted mt-1">Phân loại: Mặc định</p>
                </div>
              </div>
              <div className="col-span-4 md:col-span-2 text-left md:text-center font-bold">
                <span className="md:hidden text-xs text-gray-500 uppercase block mb-1">Đơn giá</span>
                $20.00
              </div>
              <div className="col-span-4 md:col-span-2 flex justify-center">
                <span className="md:hidden text-xs text-gray-500 uppercase block mb-1">Số lượng</span>
                <div className="flex border-2 border-black w-24 h-8 bg-white">
                  <button className="flex-1 hover:bg-gray-100 font-bold border-r-2 border-black">-</button>
                  <div className="flex-1 flex items-center justify-center font-bold text-sm">2</div>
                  <button className="flex-1 hover:bg-gray-100 font-bold border-l-2 border-black">+</button>
                </div>
              </div>
              <div className="col-span-4 md:col-span-2 text-right font-black text-primary-dark">
                <span className="md:hidden text-xs text-gray-500 uppercase block mb-1">Total</span>
                $40.00
              </div>
            </div>

            {/* Item 2 */}
            <div className="grid grid-cols-12 gap-4 p-4 items-center group">
              <div className="col-span-12 md:col-span-1 flex items-center justify-start md:justify-center mb-4 md:mb-0">
                <input type="checkbox" className="w-5 h-5 border-2 border-black rounded-none appearance-none checked:bg-primary checked:after:content-['✓'] flex items-center justify-center text-black font-bold" />
              </div>
              <div className="col-span-12 md:col-span-5 flex gap-4">
                <div className="w-24 h-24 bg-gray-200 border-2 border-black flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-500 uppercase">
                  [Img]
                </div>
                <div className="flex flex-col justify-center">
                  <h4 className="font-bold text-base leading-tight uppercase line-clamp-2">Character Sprite Pack A</h4>
                  <p className="text-sm font-medium text-text-muted mt-1">Tải xuống kỹ thuật số</p>
                </div>
              </div>
              <div className="col-span-4 md:col-span-2 text-left md:text-center font-bold">
                <span className="md:hidden text-xs text-gray-500 uppercase block mb-1">Đơn giá</span>
                $5.00
              </div>
              <div className="col-span-4 md:col-span-2 flex justify-center">
                <span className="md:hidden text-xs text-gray-500 uppercase block mb-1">Số lượng</span>
                <div className="flex border-2 border-black w-24 h-8 bg-white">
                  <button className="flex-1 hover:bg-gray-100 font-bold border-r-2 border-black">-</button>
                  <div className="flex-1 flex items-center justify-center font-bold text-sm">1</div>
                  <button className="flex-1 hover:bg-gray-100 font-bold border-l-2 border-black">+</button>
                </div>
              </div>
              <div className="col-span-4 md:col-span-2 text-right font-black text-primary-dark">
                <span className="md:hidden text-xs text-gray-500 uppercase block mb-1">Thành tiền</span>
                $5.00
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-auto neo-box-no-hover bg-primary p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-start">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 border-2 border-black rounded-none appearance-none checked:bg-white checked:after:content-['✓'] flex items-center justify-center text-black font-bold" />
                <span className="font-bold uppercase text-sm">Chọn tất cả (2)</span>
              </label>
              
              <button className="flex items-center gap-1 text-sm font-bold uppercase hover:underline">
                <Trash2 size={16} /> Xóa
              </button>
            </div>

            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase text-sm">Tổng tiền:</span>
                <span className="text-3xl font-black text-white drop-shadow-md">$45.00</span>
              </div>
              <Link href="/checkout" className="btn-secondary py-3 px-8 text-lg bg-white">
                Thanh toán
              </Link>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
