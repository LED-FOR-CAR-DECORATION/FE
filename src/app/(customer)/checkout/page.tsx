"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, CreditCard, MapPin, ShoppingBag, Truck } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/features/cart/context/CartContext";
import { useAddresses } from "@/features/address/context/AddressContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useOrders } from "@/features/order/context/OrderContext";
import { useGallery } from "@/features/character/context/GalleryContext";
import { entitlementService } from "@/features/character/services/entitlement.service";
import { completeCheckout } from "@/features/checkout/complete-checkout";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearItems } = useCart();
  const { addresses, isLoading: addressesLoading } = useAddresses();
  const { user } = useAuth();
  const { createOrder } = useOrders();
  const { refresh: refreshGallery } = useGallery();
  const [payment, setPayment] = useState("MOCK_CARD");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const address = addresses.find((entry) => entry.id === selectedAddressId);
  const hasLedItems = items.some((item) => item.productType === "LED_MODEL");
  const hasCharacters = items.some((item) => item.productType === "CHARACTER");
  const paymentMethod = hasCharacters ? "MOCK_CARD" : payment;
  const shipping = hasLedItems && subtotal ? 5 : 0;

  useEffect(() => {
    if (!selectedAddressId && addresses.length) {
      setSelectedAddressId(addresses.find((entry) => entry.isDefault)?.id ?? addresses[0].id);
    }
  }, [addresses, selectedAddressId]);

  const placeOrder = async () => {
    if (submitting.current || !user || !items.length || (hasLedItems && !address)) return;
    submitting.current = true;
    setProcessing(true);
    setError("");
    try {
      // The existing mock card flow succeeds here; a real payment integration
      // must supply its confirmed payment result before granting ownership.
      await new Promise((resolve) => setTimeout(resolve, 700));
      const result = completeCheckout({ customer: user, items, address, shipping, paymentMethod, paymentSucceeded: paymentMethod === "MOCK_CARD" }, {
        createOrder,
        grantCharacters: entitlementService.grantFromPayment,
      });
      refreshGallery();
      clearItems(items.map((item) => item.id));
      if (!result.order) router.replace("/profile/gallery");
      else router.replace(`/checkout/result?orderId=${result.order.id}${result.hasCharacters ? "&characters=1" : ""}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Thanh toán không thành công. Vui lòng thử lại.");
    } finally {
      submitting.current = false;
      setProcessing(false);
    }
  };

  return <><Header /><main className="flex-1 bg-background py-10"><div className="container mx-auto max-w-5xl px-4"><div className="mb-8 flex items-center gap-3"><ShoppingBag size={28} /><h1 className="text-3xl font-black uppercase">Thanh toán</h1></div>
    {!items.length ? <div className="neo-box-no-hover bg-white p-12 text-center"><p className="font-bold">Không có sản phẩm để thanh toán.</p><Link href="/cart" className="btn-primary mt-4 inline-block">Quay lại giỏ hàng</Link></div> :
    <div className="grid gap-6 lg:grid-cols-5"><div className="flex flex-col gap-5 lg:col-span-3">
      {hasLedItems && <><section className="neo-box-no-hover bg-white p-5"><h2 className="mb-4 flex items-center gap-2 border-b-2 border-black pb-3 font-black uppercase"><MapPin size={18} /> Địa chỉ giao hàng</h2>{addressesLoading ? <p className="text-sm text-text-muted">Đang tải địa chỉ...</p> : addresses.length === 0 ? <p className="text-sm text-red-600">Bạn chưa có địa chỉ giao hàng. Hãy tạo địa chỉ trong phần Profile trước khi thanh toán.</p> : <div className="flex flex-col gap-3">{addresses.map((entry) => <label key={entry.id} className={`flex cursor-pointer gap-3 border-2 p-3 text-sm ${selectedAddressId === entry.id ? "border-primary bg-primary/10" : "border-black"}`}><input type="radio" name="shipping-address" checked={selectedAddressId === entry.id} onChange={() => setSelectedAddressId(entry.id)} /><span><strong className="block">{entry.fullName} · {entry.phoneNumber}</strong><span>{entry.fullAddress}</span>{entry.isDefault && <small className="ml-2 font-bold text-primary-dark">(Mặc định)</small>}</span></label>)}</div>}</section>
      <section className="neo-box-no-hover bg-white p-5"><h2 className="mb-4 flex items-center gap-2 border-b-2 border-black pb-3 font-black uppercase"><Truck size={18} /> Vận chuyển</h2><label className="flex items-center justify-between border-2 border-primary bg-primary/10 p-3 text-sm font-bold"><span>ViettelPost Fast (2–3 ngày)</span><span>$5.00</span></label></section></>}
      <section className="neo-box-no-hover bg-white p-5"><h2 className="mb-4 flex items-center gap-2 border-b-2 border-black pb-3 font-black uppercase"><CreditCard size={18} /> Thanh toán</h2><div className="flex flex-col gap-2">{[["COD", "Thanh toán khi nhận hàng"], ["MOCK_CARD", "Thẻ ngân hàng (mock payment)"]].filter(([value]) => !hasCharacters || value === "MOCK_CARD").map(([value, label]) => <label key={value} className="flex cursor-pointer gap-3 border-2 border-black p-3 text-sm font-bold"><input type="radio" value={value} checked={paymentMethod === value} onChange={(event) => setPayment(event.target.value)} />{label}</label>)}</div></section>
      {hasCharacters && <p className="rounded border border-primary bg-primary/10 p-3 text-sm">Character sẽ được thêm thẳng vào Gallery sau khi thanh toán thành công, không tạo đơn hàng và không mất phí vận chuyển.</p>}
      {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
      <button disabled={processing || (hasLedItems && (addressesLoading || !address))} onClick={placeOrder} className="btn-primary flex items-center justify-center gap-2 py-4 text-lg disabled:opacity-60">{processing ? "Đang xử lý thanh toán..." : "Xác nhận thanh toán"} <CheckCircle size={18} /></button>
    </div><aside className="neo-box-no-hover h-fit bg-white p-5 lg:col-span-2"><h2 className="mb-4 border-b-2 border-black pb-3 font-black uppercase">Tóm tắt thanh toán</h2>{items.map((item) => <div key={item.id} className="mb-3 flex justify-between gap-3 text-sm"><span>{item.name} × {item.quantity}</span><strong>${(item.price * item.quantity).toFixed(2)}</strong></div>)}<div className="mt-5 border-t-2 border-black pt-3 text-sm font-bold"><div className="flex justify-between"><span>Tạm tính</span><span>${subtotal.toFixed(2)}</span></div><div className="mt-2 flex justify-between"><span>Vận chuyển</span><span>${shipping.toFixed(2)}</span></div><div className="mt-3 flex justify-between border-t-2 border-dashed border-black pt-3 text-xl"><span>Tổng</span><span className="text-primary-dark">${(subtotal + shipping).toFixed(2)}</span></div></div></aside></div>}
  </div></main><Footer /></>;
}
