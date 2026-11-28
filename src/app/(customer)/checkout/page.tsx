"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  CreditCard,
  MapPin,
  Minus,
  Plus,
  QrCode,
  ShoppingBag,
  Sparkles,
  Trash2,
} from "lucide-react";
import Header from "@/components/layout/Header";
import AddAddressModal from "@/components/ui/AddAddressModal";
import ConsentCheckbox, { PolicyLink } from "@/components/ui/ConsentCheckbox";
import UndoToast from "@/components/ui/UndoToast";
import { useUndoableDelete } from "@/lib/hooks/useUndoableDelete";
import { formatVnMobile } from "@/lib/validation/contact";
import { useCart } from "@/features/cart/context/CartContext";
import { useAddresses } from "@/features/address/context/AddressContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useOrders } from "@/features/order/context/OrderContext";
import { getApiErrorMessage } from "@/lib/api/auth";
import { fetchStoreProductDetail } from "@/lib/api/products";
import { formatPrice } from "@/lib/currency";

export default function CheckoutPage() {
  const router = useRouter();
  const {
    selectedItems: items,
    selectedSubtotal: subtotal,
    isLoading: cartLoading,
    updateQuantity,
  } = useCart();
  const {
    addresses: allAddresses,
    isLoading: addressesLoading,
    addAddress,
    removeAddress,
    setDefaultAddress,
  } = useAddresses();
  const addressUndo = useUndoableDelete({ onCommit: removeAddress });
  const addresses = allAddresses.filter((entry) => !addressUndo.isPending(entry.id));

  const [addressError, setAddressError] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { user } = useAuth();
  const { createOrder } = useOrders();
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [bundleHasLedById, setBundleHasLedById] = useState<Record<string, boolean>>({});
  const [checkingBundles, setCheckingBundles] = useState(false);

  const unresolvedBundlesKey = items
    .filter(
      (i) =>
        i.productType === "BUNDLE" &&
        !i.components?.length &&
        !i.bundleDetails?.items?.length &&
        bundleHasLedById[i.id] === undefined,
    )
    .map((i) => `${i.id}:${i.productId ?? ""}`)
    .join(",");

  useEffect(() => {
    if (!unresolvedBundlesKey) return;
    const targets = items.filter(
      (i) =>
        i.productType === "BUNDLE" &&
        !i.components?.length &&
        !i.bundleDetails?.items?.length &&
        bundleHasLedById[i.id] === undefined,
    );
    if (!targets.length) return;

    let cancelled = false;
    setCheckingBundles(true);
    Promise.all(
      targets.map(async (bundle) => {
        const detail = await fetchStoreProductDetail(bundle.productId ?? bundle.id).catch(() => null);
        const hasLed = detail
          ? Boolean(
              detail.components?.some((c) => c.productType === "LED_MODEL") ||
                detail.bundleDetails?.items?.some((b) => {
                  const t = String(b.itemType ?? "").toUpperCase();
                  return t === "LED" || t === "LED_MODEL";
                }),
            )
          : false;
        return [bundle.id, hasLed] as const;
      }),
    )
      .then((entries) => {
        if (cancelled) return;
        setBundleHasLedById((prev) => {
          const next = { ...prev };
          for (const [id, hasLed] of entries) {
            next[id] = hasLed;
          }
          return next;
        });
      })
      .finally(() => {
        if (!cancelled) setCheckingBundles(false);
      });

    return () => {
      cancelled = true;
    };
  }, [unresolvedBundlesKey, items, bundleHasLedById]);

  const address = addresses.find((entry) => entry.id === selectedAddressId);
  const hasLedItems = items.some((i) => {
    if (i.productType === "LED_MODEL") return true;
    if (i.productType === "BUNDLE") {
      if (i.components?.length) {
        return i.components.some((c) => c.productType === "LED_MODEL");
      }
      if (i.bundleDetails?.items?.length) {
        return i.bundleDetails.items.some((b) => {
          const t = String(b.itemType ?? "").toUpperCase();
          return t === "LED" || t === "LED_MODEL";
        });
      }
      return bundleHasLedById[i.id] ?? false;
    }
    return false;
  });

  // Shipping fee is decided by the backend (currently 0); shown as "Miễn phí" in both cart and checkout.
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
    if (!items.length || checkingBundles || (hasLedItems && !address) || !user || !agreedToTerms) return;
    setProcessing(true);
    setCheckoutError("");
    try {
      const digitalFallbackAddress = {
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
      };
      const order = await createOrder({
        customer: user,
        items,
        address: hasLedItems && address ? address : digitalFallbackAddress,
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

  const blockReason = processing
    ? "Đang xử lý đơn hàng..."
    : checkingBundles
      ? "Đang kiểm tra thành phần sản phẩm..."
      : hasLedItems && addressesLoading
        ? "Đang tải địa chỉ giao hàng..."
        : hasLedItems && !address
          ? "Thêm hoặc chọn địa chỉ giao hàng để tiếp tục."
          : !agreedToTerms
            ? "Tick đồng ý điều khoản để đặt hàng."
            : "";

  return (
    <>
      <Header />
      <AddAddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={addAddress}
      />
      <UndoToast
        message={addressUndo.pending ? `Đã xóa địa chỉ của ${addressUndo.pending.label}` : null}
        onUndo={addressUndo.undo}
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
              <Link href="/cart" className="btn-primary mt-4 inline-block text-xs font-black uppercase">
                Quay lại giỏ hàng
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-5 items-start">

              {/* ── Left Column: Fulfillment / Shipping Address ── */}
              <div className="flex flex-col gap-5 lg:col-span-3">
                {hasLedItems ? (
                  <section className="neo-box-no-hover bg-white p-5">
                    <div className="mb-4 flex items-center justify-between gap-3 border-b-2 border-black pb-3">
                      <h2 className="flex items-center gap-2 font-black uppercase text-sm">
                        <MapPin size={18} className="text-primary-ink" /> Địa chỉ giao hàng
                      </h2>
                      <button
                        type="button"
                        onClick={() => setIsAddressModalOpen(true)}
                        className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase"
                      >
                        <Plus size={13} /> Thêm địa chỉ
                      </button>
                    </div>

                    {addressesLoading ? (
                      <p className="text-sm text-text-muted">Đang tải địa chỉ...</p>
                    ) : addresses.length === 0 ? (
                      <div className="border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                        <p className="text-sm font-semibold text-gray-700">
                          Bạn chưa có địa chỉ giao hàng.
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          Nhấn nút &ldquo;+ Thêm địa chỉ&rdquo; ở trên để tạo địa chỉ nhận hàng.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {addresses.map((entry) => (
                          <label
                            key={entry.id}
                            className={`block cursor-pointer border-2 p-3 text-sm transition-colors ${
                              selectedAddressId === entry.id
                                ? "border-primary-ink bg-primary/10"
                                : "border-black hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="shipping-address"
                                checked={selectedAddressId === entry.id}
                                onChange={() => setSelectedAddressId(entry.id)}
                                className="cursor-pointer mt-1 h-4 w-4 accent-primary-ink"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <strong>
                                    {entry.fullName} · {formatVnMobile(entry.phoneNumber)}
                                  </strong>
                                  {entry.isDefault && (
                                    <span className="border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase">
                                      Mặc định
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-gray-700 text-xs sm:text-sm">{entry.fullAddress}</p>
                                <div
                                  className="mt-2.5 flex items-center gap-4 text-xs font-bold"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                >
                                  {!entry.isDefault && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAddressError("");
                                        setDefaultAddress(entry.id).catch((err: unknown) =>
                                          setAddressError(
                                            err instanceof Error ? err.message : "Không thể đặt địa chỉ mặc định.",
                                          ),
                                        );
                                      }}
                                      className="cursor-pointer text-primary-ink hover:underline"
                                    >
                                      Đặt làm mặc định
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAddressError("");
                                      addressUndo.schedule(entry.id, entry.fullName);
                                    }}
                                    className="cursor-pointer inline-flex items-center gap-1 text-text-muted hover:text-red-600 hover:underline"
                                  >
                                    <Trash2 size={11} /> Xóa
                                  </button>
                                </div>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}

                    {(addressError || addressUndo.error) && (
                      <p role="alert" className="mt-3 border-2 border-red-600 bg-red-50 p-3 text-xs font-bold text-red-700">
                        {addressError || addressUndo.error}
                      </p>
                    )}
                  </section>
                ) : (
                  <section className="neo-box-no-hover bg-white p-5">
                    <div className="mb-3 flex items-center gap-2 border-b-2 border-black pb-3">
                      <Sparkles size={18} className="text-primary-ink" />
                      <h2 className="font-black uppercase text-sm">Hình thức nhận hàng</h2>
                    </div>
                    <div className="border-2 border-primary-ink bg-primary/10 p-4 text-xs">
                      <p className="text-sm font-black text-black">
                        Sản phẩm kỹ thuật số (Kích hoạt trực tuyến)
                      </p>
                      <p className="mt-1 font-medium leading-relaxed text-text-muted">
                        Đơn hàng của bạn hoàn toàn là sản phẩm số (Character / Gói hội viên). Sau khi thanh toán hoàn tất, quyền sử dụng sẽ được tự động kích hoạt trực tiếp vào tài khoản mà không cần địa chỉ nhận hàng vật lý.
                      </p>
                    </div>
                  </section>
                )}
              </div>

              {/* ── Right Column: Summary, Payment Info & Action ── */}
              <aside className="neo-box-no-hover flex flex-col gap-5 bg-white p-5 lg:col-span-2 lg:sticky lg:top-24">

                {/* Order Summary with Quantity Adjustment */}
                <div>
                  <h2 className="mb-4 border-b-2 border-black pb-3 font-black uppercase text-sm">
                    Tóm tắt đơn hàng
                  </h2>

                  <div className="space-y-3">
                    {items.map((item) => {
                      const isDigital =
                        item.productType === "CHARACTER" || item.productType === "SUBSCRIPTION";

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 border-b border-dashed border-gray-200 pb-3 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold uppercase text-black truncate">{item.name}</p>
                            <p className="text-[11px] text-text-muted">{formatPrice(item.price)}</p>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            {!isDigital ? (
                              <div className="flex h-7 items-center border border-black bg-white shadow-[1px_1px_0_0_#000]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.quantity > 1) {
                                      updateQuantity(item.id, item.quantity - 1);
                                    }
                                  }}
                                  disabled={item.quantity <= 1 || processing}
                                  className="cursor-pointer flex h-full w-6 items-center justify-center border-r border-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                  aria-label={`Giảm số lượng ${item.name}`}
                                >
                                  <Minus size={11} />
                                </button>
                                <span className="grid w-7 place-items-center text-xs font-black">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  disabled={processing}
                                  className="cursor-pointer disabled:cursor-not-allowed flex h-full w-6 items-center justify-center border-l border-black hover:bg-gray-100 disabled:opacity-40"
                                  aria-label={`Tăng số lượng ${item.name}`}
                                >
                                  <Plus size={11} />
                                </button>
                              </div>
                            ) : (
                              <span className="border border-black bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold">
                                ×1
                              </span>
                            )}

                            <strong className="min-w-16 text-right font-black text-black">
                              {formatPrice(item.price * item.quantity)}
                            </strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-col gap-1.5 border-t-2 border-black pt-3 text-xs font-bold">
                    <div className="flex justify-between">
                      <span className="text-text-muted uppercase">Tạm tính</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    {hasLedItems && (
                      <div className="flex justify-between">
                        <span className="text-text-muted uppercase">Vận chuyển</span>
                        <span>{shipping === 0 ? "Miễn phí" : formatPrice(shipping)}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 border-t-2 border-dashed border-black pt-3 text-lg font-black">
                    <div className="flex justify-between items-center">
                      <span className="uppercase">Tổng thanh toán</span>
                      <span className="text-primary-ink text-xl">{formatPrice(subtotal + shipping)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Method Notice */}
                <div className="border-t-2 border-black pt-4">
                  <h3 className="mb-3 flex items-center gap-1.5 text-xs font-black uppercase text-black">
                    <CreditCard size={15} className="text-primary-ink" /> Phương thức thanh toán
                  </h3>
                  <div className="flex items-start gap-2.5 border-2 border-primary-ink bg-primary/10 p-3 text-xs">
                    <QrCode size={18} className="mt-0.5 shrink-0 text-primary-ink" aria-hidden />
                    <div>
                      <p className="font-bold text-black">Chuyển khoản VietQR qua SePay</p>
                      <p className="mt-0.5 text-[11px] text-text-muted leading-relaxed">
                        Sau khi đặt hàng, bạn sẽ quét mã VietQR để thanh toán. Đơn hàng được hệ thống xác nhận tự động.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Consent Checkbox */}
                <div>
                  <ConsentCheckbox
                    checked={agreedToTerms}
                    onChange={setAgreedToTerms}
                    disabled={processing}
                  >
                    Tôi đã đọc và đồng ý với <PolicyLink href="/terms">Điều khoản sử dụng</PolicyLink>,{" "}
                    <PolicyLink href="/privacy">Chính sách bảo mật</PolicyLink> và{" "}
                    <PolicyLink href="/shipping-returns">Chính sách vận chuyển &amp; đổi trả</PolicyLink>.
                  </ConsentCheckbox>
                </div>

                {/* Checkout Error */}
                {checkoutError && (
                  <p role="alert" className="border-2 border-red-600 bg-red-50 p-2.5 text-xs font-bold text-red-700">
                    {checkoutError}
                  </p>
                )}

                {/* Place Order CTA */}
                <div>
                  <button
                    type="button"
                    disabled={!!blockReason}
                    onClick={placeOrder}
                    aria-busy={processing}
                    aria-describedby={blockReason ? "checkout-block-reason" : undefined}
                    className="btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-sm font-black uppercase shadow-[2px_2px_0_0_#000]"
                  >
                    <span>{processing ? "Đang xử lý đơn hàng..." : "Xác nhận đặt hàng"}</span>
                    <CheckCircle size={16} />
                  </button>
                  {blockReason && !processing && (
                    <p id="checkout-block-reason" className="mt-2 text-center text-xs font-bold text-text-muted">
                      {blockReason}
                    </p>
                  )}
                </div>

              </aside>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
