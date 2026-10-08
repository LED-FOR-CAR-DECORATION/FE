import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background pb-16">
        {/* BIG BANNER SECTION */}
        <section className="bg-primary w-full border-b-2 border-black">
          <div className="container mx-auto px-4 py-8">
            <div className="relative w-full h-[300px] md:h-[450px] neo-box-no-hover overflow-hidden flex items-center justify-center bg-gray-200">
              {/* IMAGE PLACEHOLDER */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/30 z-10" />
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-bold tracking-widest uppercase">
                [Banner Image Placeholder]
              </div>
              
              <div className="relative z-20 flex flex-col justify-center px-8 md:px-16 text-white w-full h-full text-left">
                <h2 className="text-4xl md:text-6xl font-black mb-4 uppercase tracking-tighter drop-shadow-md">
                  Decorative<br/>LED Matrix<br/>Panels
                </h2>
                <p className="max-w-md font-medium text-sm md:text-base drop-shadow-md mb-6">
                  Decorate your car with colorful character sprites. Express yourself in style with our flexible matrix LEDs panels that can be easily installed and removed.
                </p>
                <Link href="/products" className="btn-primary w-fit text-black inline-block bg-primary hover:bg-primary-light">
                  Shop Now
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CATEGORIES / FLASH SALE LIKE SHOPEE */}
        <section className="container mx-auto px-4 mt-12 mb-12">
          <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-6">
            <h3 className="text-2xl font-black uppercase tracking-tight">Categories</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {['32x32 Panels', '64x64 Panels', 'Flexible LEDs', 'Accessories', 'Custom Frames', 'Cables'].map((cat, i) => (
              <Link href={`/category/${i}`} key={i} className="neo-box aspect-square flex flex-col items-center justify-center p-4 text-center group bg-white cursor-pointer hover:bg-primary-light transition-colors">
                <div className="w-12 h-12 rounded-full border-2 border-black mb-3 bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                  IMG
                </div>
                <span className="font-bold text-sm">{cat}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* FEATURED PRODUCTS (THE LIST) */}
        <section className="container mx-auto px-4">
          <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-6">
            <h3 className="text-2xl font-black uppercase tracking-tight">Featured Products</h3>
            <Link href="/products" className="text-sm font-bold hover:underline uppercase tracking-wider">View All</Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Product 1 */}
            <div className="neo-box flex flex-col h-full bg-white relative group">
              <div className="absolute top-2 left-2 bg-primary text-black text-xs font-bold px-2 py-1 border-2 border-black z-10">
                HOT
              </div>
              <div className="relative aspect-square w-full border-b-2 border-black bg-gray-200 overflow-hidden flex items-center justify-center text-gray-500 font-bold uppercase text-xs">
                [Product Image]
              </div>
              <div className="p-4 flex flex-col flex-1 justify-between">
                <div>
                  <h4 className="font-bold text-lg leading-tight mb-2 uppercase line-clamp-2">32x32 Matrix Panel Flexible</h4>
                  <p className="text-xs font-medium text-text-muted mb-4 line-clamp-3">
                    These 32x32 LEDs matrix panels can help you display crisp pixel art sprite of your choosing. They are flexible and easily attachable.
                  </p>
                </div>
                <div className="flex items-end justify-between mt-4">
                  <span className="text-2xl font-black tracking-tighter">$20.00</span>
                  <Link href="/products/1" className="btn-primary text-xs py-1.5 px-3 bg-primary">View Details</Link>
                </div>
              </div>
            </div>
            
            {/* Product 2 */}
            <div className="neo-box flex flex-col h-full bg-white relative group">
              <div className="relative aspect-square w-full border-b-2 border-black bg-gray-200 overflow-hidden flex items-center justify-center text-gray-500 font-bold uppercase text-xs">
                [Product Image]
              </div>
              <div className="p-4 flex flex-col flex-1 justify-between">
                <div>
                  <h4 className="font-bold text-lg leading-tight mb-2 uppercase line-clamp-2">Small Rectangular Scrolling LED</h4>
                  <p className="text-xs font-medium text-text-muted mb-4 line-clamp-3">
                    Sleek rectangular LED panel perfect for scrolling text, small badges, or dashboard notifications.
                  </p>
                </div>
                <div className="flex items-end justify-between mt-4">
                  <span className="text-2xl font-black tracking-tighter">$15.00</span>
                  <Link href="/products/2" className="btn-primary text-xs py-1.5 px-3 bg-primary">View Details</Link>
                </div>
              </div>
            </div>

            {/* Product 3 */}
            <div className="neo-box flex flex-col h-full bg-white relative group">
              <div className="relative aspect-square w-full border-b-2 border-black bg-gray-200 overflow-hidden flex items-center justify-center text-gray-500 font-bold uppercase text-xs">
                 [Product Image]
              </div>
              <div className="p-4 flex flex-col flex-1 justify-between">
                <div>
                  <h4 className="font-bold text-lg leading-tight mb-2 uppercase line-clamp-2">64x64 Matrix Panel</h4>
                  <p className="text-xs font-medium text-text-muted mb-4 line-clamp-3">
                    High resolution 64x64 LEDs matrix panel for detailed graphics and complex animations.
                  </p>
                </div>
                <div className="flex items-end justify-between mt-4">
                  <span className="text-2xl font-black tracking-tighter">$45.00</span>
                  <button className="btn-secondary text-xs py-1.5 px-3 opacity-50 cursor-not-allowed">Out of Stock</button>
                </div>
              </div>
            </div>

            {/* Product 4 */}
             <div className="neo-box flex flex-col h-full bg-white relative group">
              <div className="relative aspect-square w-full border-b-2 border-black bg-gray-200 overflow-hidden flex items-center justify-center text-gray-500 font-bold uppercase text-xs">
                 [Product Image]
              </div>
              <div className="p-4 flex flex-col flex-1 justify-between">
                <div>
                  <h4 className="font-bold text-lg leading-tight mb-2 uppercase line-clamp-2">LED Controller Box</h4>
                  <p className="text-xs font-medium text-text-muted mb-4 line-clamp-3">
                    Smart controller box for managing multiple LED panels simultaneously via mobile app.
                  </p>
                </div>
                <div className="flex items-end justify-between mt-4">
                  <span className="text-2xl font-black tracking-tighter">$12.50</span>
                  <Link href="/products/4" className="btn-primary text-xs py-1.5 px-3 bg-primary">View Details</Link>
                </div>
              </div>
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
