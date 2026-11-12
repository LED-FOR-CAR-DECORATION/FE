"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, MapPin, ShoppingBag, Zap } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/features/cart/context/CartContext";
import { useAddresses } from "@/features/address/context/AddressContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useOrders } from "@/features/order/context/OrderContext";
import { getOrderFulfillment } from "@/features/order/fulfillment";
import { getApiErrorMessage } from "@/lib/api/auth";
import { formatPrice } from "@/lib/currency";

export default function CheckoutPage() {
  const router = useRouter();
  const { selectedItems: items, selectedSubtotal: subtotal, refreshCart, isLoading: cartLoading } = useCart();
  const { addresses, isLoading: addressesLoading } = useAddresses();
  const { user } = useAuth();
  const { createOrder } = useOrders();
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const address = addresses.find((entry) => entry.id === selectedAddressId);
  const hasLedItems = getOrderFulfillment({ items }).requiresDelivery || items.some((i) => i.productType === "BUNDLE");
  const shipping = 0;

  useEffect(() => {
    if (!selectedAddressId && addresses.length) {
      setSelectedAddressId(addresses.find((entry) => entry.isDefault)?.id ?? addresses[0].id);
    }
  }, [addresses, selectedAddressId]);

  const placeOrder = async () => {
    if (!items.length || (hasLedItems && !address) || !user) return;
    setProcessing(true);
    setCheckoutError("");
    try {
      const order = await createOrder({
        customer: user,
        items,
        address:
          address ?? {
            id: "0",
            fullName: user.fullName,
            phoneNumber: user.phoneNumber ?? "",
            streetNumber: "",
            streetName: "",
            ward: "",
            district: "",
            province: "",
            fullAddress: "Digital delivery",
            isDefault: false,
          },
        shipping,
        paymentMethod: "SEPAY",
      });
      await refreshCart();
      router.push(`/checkout/result?orderId=${order.id}`);
    } catch (err) {
      setCheckoutError(getApiErrorMessage(err, "Không thể tạo đơn hàng. Vui lòng thử lại."));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-background py-10">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="mb-8 flex items-center gap-3">
            <ShoppingBag size={28} />
            <h1 className="text-3xl font-black uppercase">Thanh toán</h1>
          </div>
          {cartLoading ? (
            <p className="text-sm font-semibold text-text-muted">Đang tải sản phẩm...</p>
          ) : !items.length ? (
            <div className="neo-box-no-hover bg-white p-12 text-center">
              <p className="font-bold">Bạn chưa chọn sản phẩm nào để thanh toán.</p>
              <Link href="/cart" className="btn-primary mt-4 inline-block">
                Quay lại giỏ hàng
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="flex flex-col gap-5 lg:col-span-3">
                <section className="neo-box-no-hover bg-white p-5">
                  <h2 className="mb-4 flex items-center gap-2 border-b-2 border-black pb-3 font-black uppercase">
                    <MapPin size={18} /> Địa chỉ giao hàng
                  </h2>
                  {addressesLoading ? (
                    <p className="text-sm text-text-muted">Đang tải địa chỉ...</p>
                  ) : addresses.length === 0 ? (
                    <p className="text-sm text-red-600">
                      Bạn chưa có địa chỉ giao hàng. Hãy tạo địa chỉ trong phần{" "}
                      <Link href="/profile" className="underline font-bold">
                        Profile
                      </Link>{" "}
                      trước khi thanh toán.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {addresses.map((entry) => (
                        <label
                          key={entry.id}
                          className={`flex cursor-pointer gap-3 border-2 p-3 text-sm ${selectedAddressId === entry.id ? "border-primary bg-primary/10" : "border-black"}`}
                        >
                          <input
                            type="radio"
                            name="shipping-address"
                            checked={selectedAddressId === entry.id}
                            onChange={() => setSelectedAddressId(entry.id)}
                          />
                          <span>
                            <strong className="block">
                              {entry.fullName} · {entry.phoneNumber}
                            </strong>
                            <span>{entry.fullAddress}</span>
                            {entry.isDefault && (
                              <small className="ml-2 font-bold text-primary-dark">(Mặc định)</small>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </section>
                {hasLedItems && (
                  <button
                    type="button"
                    className="neo-box-no-hover flex w-full items-center justify-between border-2 border-black bg-primary/20 p-4 text-left transition hover:bg-primary/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-lg border-2 border-black bg-primary text-black">
                        <Zap size={20} className="fill-current" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black uppercase tracking-wide text-black">
                            Vận chuyển hỏa tốc
                          </span>
                          <span className="rounded bg-black px-2 py-0.5 text-[10px] font-black uppercase text-primary">
                            AhaMove
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-text-muted">
                          Giao hàng hỏa tốc qua AhaMove · Thanh toán tự động qua SePay VietQR
                        </p>
                      </div>
                    </div>
                    <span className="font-black text-black">
                      {shipping === 0 ? "Miễn phí" : formatPrice(shipping)}
                    </span>
                  </button>
                )}
                {checkoutError && (
                  <p role="alert" className="border-2 border-red-600 bg-red-50 p-3 text-xs font-bold text-red-700">
                    {checkoutError}
                  </p>
                )}
                <button
                  disabled={processing || addressesLoading || (hasLedItems && !address)}
                  onClick={placeOrder}
                  className="btn-primary flex items-center justify-center gap-2 py-4 text-lg disabled:opacity-60"
                >
                  {processing ? "Đang xử lý đơn hàng..." : "Xác nhận đặt hàng"} <CheckCircle size={18} />
                </button>
              </div>
              <aside className="neo-box-no-hover h-fit bg-white p-5 lg:col-span-2">
                <h2 className="mb-4 border-b-2 border-black pb-3 font-black uppercase">Tóm tắt đơn hàng</h2>
                {items.map((item) => (
                  <div key={item.id} className="mb-3 flex justify-between gap-3 text-sm">
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <strong>{formatPrice(item.price * item.quantity)}</strong>
                  </div>
                ))}
                <div className="mt-5 border-t-2 border-black pt-3 text-sm font-bold">
                  <div className="flex justify-between">
                    <span>Tạm tính ({items.length} sản phẩm)</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="mt-2 flex justify-between">
                    <span>Vận chuyển hỏa tốc</span>
                    <span>{shipping === 0 ? "Miễn phí" : formatPrice(shipping)}</span>
                  </div>
                  <div className="mt-3 flex justify-between border-t-2 border-dashed border-black pt-3 text-xl">
                    <span>Tổng</span>
                    <span className="text-primary-dark">{formatPrice(subtotal + shipping)}</span>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
