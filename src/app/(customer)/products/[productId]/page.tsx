import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Plus, Minus, Heart, Share2 } from "lucide-react";

export default function ProductDetailPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background py-10">
        <div className="container mx-auto px-4">
          
          {/* Breadcrumb */}
          <div className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2 text-gray-500">
            <Link href="/" className="hover:text-black hover:underline">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-black hover:underline">Products</Link>
            <span>/</span>
            <span className="text-black">32x32 Matrix Panel</span>
          </div>

          <div className="neo-box bg-white flex flex-col md:flex-row mb-12">
            {/* Left: Images */}
            <div className="w-full md:w-1/2 border-b-2 md:border-b-0 md:border-r-2 border-black flex flex-col">
              <div className="w-full aspect-square bg-gray-200 flex items-center justify-center text-gray-500 font-bold uppercase tracking-widest border-b-2 border-black relative">
                [Main Product Image Placeholder]
              </div>
              <div className="grid grid-cols-4 gap-0">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`aspect-square bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 ${i !== 4 ? 'border-r-2 border-black' : ''} cursor-pointer hover:bg-gray-300 transition-colors`}>
                    [Img {i}]
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Info */}
            <div className="w-full md:w-1/2 p-8 flex flex-col">
              <div className="mb-6">
                <h1 className="text-4xl font-black uppercase tracking-tight mb-4">32 x 32 Matrix Panels</h1>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-4xl font-black tracking-tighter text-primary-dark">$20.00</span>
                  <span className="bg-primary px-2 py-1 text-xs font-bold border-2 border-black">CÒN HÀNG</span>
                </div>
                <p className="font-medium text-text-muted leading-relaxed">
                  These 32x32 LEDs matrix panels can help you display crisp pixel art sprite of your choosing.
                  They are flexible and can be attached to your car's window using transparent adhesive coating,
                  they are also easily removable preventing unwanted damages.
                </p>
                <p className="font-medium text-text-muted leading-relaxed mt-4">
                  Using our mobile app, you can change and adjust brightness, change your character sprite and even create your own, offering maximum customizability!
                </p>
              </div>

              <div className="mt-auto border-t-2 border-black pt-6">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Quantity */}
                  <div className="flex items-center border-2 border-black w-full sm:w-auto h-12">
                    <button className="w-12 h-full flex items-center justify-center bg-gray-100 hover:bg-primary transition-colors border-r-2 border-black">
                      <Minus size={18} />
                    </button>
                    <div className="w-16 h-full flex items-center justify-center font-bold text-lg bg-white">
                      1
                    </div>
                    <button className="w-12 h-full flex items-center justify-center bg-gray-100 hover:bg-primary transition-colors border-l-2 border-black">
                      <Plus size={18} />
                    </button>
                  </div>

                  {/* Actions */}
                  <button className="btn-primary flex-1 w-full h-12 text-lg uppercase tracking-wider bg-primary hover:bg-primary-dark">
                    Add to Cart
                  </button>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button className="btn-secondary w-12 h-12 flex items-center justify-center bg-white p-0">
                      <Heart size={20} />
                    </button>
                    <button className="btn-secondary w-12 h-12 flex items-center justify-center bg-white p-0">
                      <Share2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Product Description Full */}
          <div className="mb-12">
            <h3 className="inline-block bg-primary text-black font-black uppercase text-xl px-4 py-2 border-2 border-black mb-4">
              Product Description
            </h3>
            <div className="neo-box p-8 bg-white grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="aspect-[4/3] bg-gray-200 flex items-center justify-center text-gray-500 font-bold border-2 border-black border-dashed">
                [Detail Image Placeholder]
              </div>
              <div className="flex flex-col justify-center">
                <h4 className="text-2xl font-black uppercase mb-4">Technical Specs</h4>
                <ul className="list-disc list-inside font-medium text-text-muted space-y-2 mb-6">
                  <li>Dimensions: 15cm x 15cm</li>
                  <li>Resolution: 32x32 pixels</li>
                  <li>Voltage: 5V USB</li>
                  <li>Control: Bluetooth App (iOS & Android)</li>
                  <li>Mounting: Transparent double-sided adhesive</li>
                </ul>
                <p className="font-medium text-text-muted">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </p>
              </div>
            </div>
          </div>

          {/* You might also like */}
          <div>
            <h3 className="inline-block text-black font-black uppercase text-2xl mb-6 tracking-tight">
              You might also like:
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="neo-box bg-white flex flex-col group cursor-pointer hover:bg-gray-50">
                  <div className="aspect-square bg-gray-200 border-b-2 border-black flex items-center justify-center text-xs font-bold text-gray-500 uppercase">
                    [Img]
                  </div>
                  <div className="p-3 text-center">
                    <p className="font-bold text-sm uppercase line-clamp-1">Accessory {i}</p>
                    <p className="text-primary-dark font-black tracking-tighter mt-1">$5.00</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
