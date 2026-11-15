"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, MapPin, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AddAddressModal from "@/components/ui/AddAddressModal";
import { useCart } from "@/features/cart/context/CartContext";
import { useAddresses } from "@/features/address/context/AddressContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useOrders } from "@/features/order/context/OrderContext";
import { getOrderFulfillment } from "@/features/order/fulfillment";
import { getApiErrorMessage } from "@/lib/api/auth";
import { formatPrice } from "@/lib/currency";

export default function CheckoutPage() {
  const router = useRouter();
  const { selectedItems: items, selectedSubtotal: subtotal, isLoading: cartLoading } = useCart();
  const { addresses, isLoading: addressesLoading, addAddress, removeAddress, setDefaultAddress } = useAddresses();
  const { user } = useAuth();
  const { createOrder } = useOrders();
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const address = addresses.find((entry) => entry.id === selectedAddressId);
  const hasLedItems = getOrderFulfillment({ items }).requiresDelivery || items.some((i) => i.productType === "BUNDLE");
  const shipping = 0;

  useEffect(() => {
    if (addresses.length === 0) {
      if (selectedAddressId) setSelectedAddressId("");
      return;
    }
    const stillExists = addresses.some((entry) => entry.id === selectedAddressId);
    if (!selectedAddressId || !stillExists) {
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
      router.push(
        `/checkout/result?orderId=${encodeURIComponent(order.id)}${
          order.paymentCode ? `&paymentCode=${encodeURIComponent(order.paymentCode)}` : ""
        }`,
      );
    } catch (err) {
      setCheckoutError(getApiErrorMessage(err, "Không thể tạo đơn hàng. Vui lòng thử lại."));
      setProcessing(false);
    }
  };

  return (
    <>
      <Header />
      <AddAddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={async (newAddress) => {
          await addAddress(newAddress);
          setIsAddressModalOpen(false);
        }}
      />
      <main className="flex-1 bg-background py-10">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="mb-8 flex items-center gap-3">
            <ShoppingBag size={28} />
            <h1 className="text-3xl font-black uppercase">Đặt hàng</h1>
          </div>
          {cartLoading && !processing ? (
            <p className="text-sm font-semibold text-text-muted">Đang tải sản phẩm...</p>
          ) : !items.length && !processing ? (
            <div className="neo-box-no-hover bg-white p-12 text-center">
              <p className="font-bold">Bạn chưa chọn sản phẩm nào để đặt hàng.</p>
              <Link href="/cart" className="btn-primary mt-4 inline-block">
                Quay lại giỏ hàng
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="flex flex-col gap-5 lg:col-span-3">
                <section className="neo-box-no-hover bg-white p-5">
                  <div className="mb-4 flex items-center justify-between gap-3 border-b-2 border-black pb-3">
                    <h2 className="flex items-center gap-2 font-black uppercase">
                      <MapPin size={18} /> Địa chỉ giao hàng
                    </h2>
                    <button
                      type="button"
                      onClick={() => setIsAddressModalOpen(true)}
                      className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs"
                    >
                      <Plus size={13} /> Thêm địa chỉ
                    </button>
                  </div>
                  {addressesLoading ? (
                    <p className="text-sm text-text-muted">Đang tải địa chỉ...</p>
                  ) : addresses.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-300 bg-gray-50 p-5 text-center">
                      <p className="text-sm font-semibold text-gray-700">
                        Bạn chưa có địa chỉ giao hàng.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsAddressModalOpen(true)}
                        className="btn-primary mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs"
                      >
                        <Plus size={14} /> Thêm địa chỉ giao hàng
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {addresses.map((entry) => (
                        <div
                          key={entry.id}
                          onClick={() => setSelectedAddressId(entry.id)}
                          className={`cursor-pointer border-2 p-3 text-sm transition-colors ${
                            selectedAddressId === entry.id
                              ? "border-primary bg-primary/10"
                              : "border-black hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="shipping-address"
                              checked={selectedAddressId === entry.id}
                              onChange={() => setSelectedAddressId(entry.id)}
                              className="mt-1"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <strong>
                                  {entry.fullName} · {entry.phoneNumber}
                                </strong>
                                {entry.isDefault && (
                                  <span className="border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase">
                                    Mặc định
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-gray-700">{entry.fullAddress}</p>
                              <div
                                className="mt-2.5 flex items-center gap-4 text-xs font-bold"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {!entry.isDefault && (
                                  <button
                                    type="button"
                                    onClick={() => void setDefaultAddress(entry.id)}
                                    className="text-primary-dark hover:underline"
                                  >
                                    Đặt làm mặc định
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => void removeAddress(entry.id)}
                                  className="inline-flex items-center gap-1 text-text-muted hover:text-red-600 hover:underline"
                                >
                                  <Trash2 size={11} /> Xóa
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
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
                <div className="mt-5 border-t-2 border-dashed border-black pt-3 text-xl font-bold">
                  <div className="flex justify-between">
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
