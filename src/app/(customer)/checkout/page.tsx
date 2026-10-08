"use client";

import React, { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AddAddressModal from "@/components/ui/AddAddressModal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag, MapPin, Truck, CreditCard, CheckCircle,
  Package, X, ArrowRight, Clock
} from "lucide-react";

/* ── Order Confirmation Modal ── */
interface ConfirmModalProps {
  onClose: () => void;
  onConfirm: () => void;
}
function OrderConfirmModal({ onClose, onConfirm }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-slide-up">
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-primary border-b-2 border-black">
          <div className="flex items-center gap-2 font-black text-sm uppercase">
            <CheckCircle size={15} /> Confirm Order
          </div>
          <button onClick={onClose} className="w-6 h-6 border-2 border-black bg-white flex items-center justify-center hover:bg-red-100">
            <X size={12} />
          </button>
        </div>

        <div className="p-6">
          <p className="font-bold text-lg mb-1">Review your order</p>
          <p className="text-sm text-text-muted mb-5">Please confirm the details below before placing your order.</p>

          {/* Items summary */}
          <div className="border-2 border-black mb-4">
            {[
              { name: "32×32 Matrix Panel", qty: 2, price: "$40.00" },
              { name: "Character Sprite Pack A", qty: 1, price: "$5.00" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 border-b-2 border-black last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 border-2 border-black flex items-center justify-center">
                    <Package size={12} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{item.name}</p>
                    <p className="text-xs text-text-muted">Qty: {item.qty}</p>
                  </div>
                </div>
                <span className="font-black">{item.price}</span>
              </div>
            ))}
          </div>

          {/* Address + Shipping */}
          <div className="bg-gray-50 border-2 border-black p-3 mb-4 text-sm">
            <p className="font-bold flex items-center gap-1.5 mb-1"><MapPin size={13} /> Ship to</p>
            <p className="text-text-muted">John Doe · (+84) 123 456 789</p>
            <p className="text-text-muted">Number 8, Sesame Street, NYC, USA</p>
          </div>

          {/* Totals */}
          <div className="flex flex-col gap-1.5 text-sm font-bold border-t-2 border-black pt-3 mb-5">
            <div className="flex justify-between"><span className="text-text-muted">Subtotal:</span><span>$45.00</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Shipping (ViettelPost):</span><span>$5.00</span></div>
            <div className="flex justify-between text-lg font-black border-t-2 border-dashed border-black pt-2 mt-1">
              <span>Total:</span><span className="text-primary-dark">$50.00</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">
              Go back
            </button>
            <button
              onClick={onConfirm}
              className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2"
            >
              Place Order <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes slide-up {
          from { opacity:0; transform:translateY(20px) scale(.97); }
          to   { opacity:1; transform:translateY(0)    scale(1);   }
        }
        .animate-slide-up { animation: slide-up 200ms ease both; }
      `}</style>
    </div>
  );
}

/* ── Order Success Modal ── */
function OrderSuccessModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center p-8">
        <div className="w-16 h-16 bg-primary border-2 border-black flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} />
        </div>
        <h2 className="text-2xl font-black mb-1">Order Placed!</h2>
        <p className="text-text-muted text-sm mb-2">Your order has been received.</p>
        <p className="font-black text-primary-dark text-lg mb-6">#{orderId}</p>
        <div className="flex items-center justify-center gap-2 text-xs text-text-muted mb-6 bg-gray-50 border-2 border-black p-3">
          <Clock size={14} />
          <span>We'll notify you when the store confirms your order.</span>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            href={`/profile/orders/${orderId}`}
            className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
          >
            Track Order <ArrowRight size={14} />
          </Link>
          <button onClick={onClose} className="btn-secondary w-full py-2.5 text-sm">
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Checkout Page ── */
export default function CheckoutPage() {
  const router = useRouter();
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const ORDER_ID = "ORD-1049";

  const handlePlaceOrder = () => {
    setShowConfirm(false);
    setShowSuccess(true);
  };

  return (
    <>
      <Header />
      <AddAddressModal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} />
      {showConfirm && <OrderConfirmModal onClose={() => setShowConfirm(false)} onConfirm={handlePlaceOrder} />}
      {showSuccess && <OrderSuccessModal orderId={ORDER_ID} onClose={() => router.push("/")} />}

      <main className="flex-1 bg-background py-10">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-white border-2 border-black rounded-md">
              <ShoppingBag size={28} />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Check out.</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left side */}
            <div className="lg:col-span-7 flex flex-col gap-6">

              {/* Shipping Address */}
              <div className="neo-box bg-white p-6">
                <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-2">
                  <MapPin size={20} />
                  <h2 className="text-xl font-black uppercase tracking-wide">Ship To</h2>
                </div>
                <div className="bg-gray-50 border-2 border-black p-4 mb-4 relative">
                  <div className="font-bold uppercase text-lg mb-1">John Doe</div>
                  <div className="text-sm font-medium text-text-muted mb-1">(+84) 123 456 789</div>
                  <div className="text-sm font-medium">Number 8, Sesame street, Manhattan, NYC, United States.</div>
                  <button className="absolute top-4 right-4 text-xs font-bold uppercase underline hover:text-primary-dark">Change</button>
                </div>
                <button
                  onClick={() => setIsAddressModalOpen(true)}
                  className="btn-secondary w-full text-sm py-2 flex items-center justify-center gap-2"
                >
                  <span className="text-lg leading-none">+</span> Add new address
                </button>
              </div>

              {/* Shipping Method */}
              <div className="neo-box bg-white p-6">
                <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-2">
                  <Truck size={20} />
                  <h2 className="text-xl font-black uppercase tracking-wide">Shipping Method</h2>
                </div>
                <div className="relative border-2 border-black">
                  <select className="w-full p-4 bg-gray-50 appearance-none outline-none font-bold cursor-pointer hover:bg-white transition-colors">
                    <option>ViettelPost Fast Delivery - $5.00 (2-3 days)</option>
                    <option>Standard Delivery - $2.00 (5-7 days)</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none font-bold">▼</div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="neo-box bg-white p-6">
                <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-2">
                  <CreditCard size={20} />
                  <h2 className="text-xl font-black uppercase tracking-wide">Payment Method</h2>
                </div>
                <div className="relative border-2 border-black mb-4">
                  <select className="w-full p-4 bg-gray-50 appearance-none outline-none font-bold cursor-pointer hover:bg-white transition-colors">
                    <option>VNPay Gateway</option>
                    <option>Credit Card (VISA/Mastercard)</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none font-bold">▼</div>
                </div>
                <button className="btn-secondary w-full text-sm py-2 flex items-center justify-center gap-2">
                  <span className="text-lg leading-none">+</span> Add new payment method
                </button>
              </div>

              {/* Place Order */}
              <div className="mt-4">
                <button
                  onClick={() => setShowConfirm(true)}
                  className="btn-primary w-full py-4 text-xl tracking-widest uppercase mb-4 bg-primary hover:bg-primary-dark"
                >
                  Place Order
                </button>
                <p className="text-xs text-text-muted font-bold flex items-center justify-center gap-1 cursor-pointer hover:underline">
                  ⓘ Our refund policy
                </p>
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="lg:col-span-5">
              <div className="neo-box-no-hover bg-white p-6 sticky top-24">
                <h2 className="text-xl font-black uppercase tracking-wide border-b-2 border-black pb-2 mb-6">Order Summary</h2>
                <div className="flex flex-col gap-4 mb-6">
                  {[
                    { name: "32x32 Matrix Panel", qty: 2, price: "$40.00" },
                    { name: "Character Sprite Pack A", qty: 1, price: "$5.00" },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 border-b-2 border-gray-100 pb-4">
                      <div className="w-16 h-16 bg-gray-200 border-2 border-black flex items-center justify-center text-[10px] font-bold text-gray-500">[IMG]</div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm uppercase line-clamp-2">{item.name}</h4>
                        <p className="text-xs text-text-muted">Qty: {item.qty}</p>
                      </div>
                      <div className="font-black">{item.price}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mb-6">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🎟️</span>
                    <input type="text" placeholder="Discount code" className="w-full bg-gray-100 border-2 border-black py-2 pl-10 pr-3 outline-none focus:bg-white" />
                  </div>
                  <button className="btn-secondary px-4 py-2">Apply</button>
                </div>
                <div className="flex flex-col gap-2 font-bold text-sm border-t-2 border-black pt-4">
                  <div className="flex justify-between"><span className="text-text-muted">Subtotal:</span><span>$45.00</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Shipping:</span><span>$5.00</span></div>
                  <div className="flex justify-between text-xl font-black pt-2 mt-2 border-t-2 border-dashed border-black">
                    <span>Total:</span><span className="text-primary-dark">$50.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
