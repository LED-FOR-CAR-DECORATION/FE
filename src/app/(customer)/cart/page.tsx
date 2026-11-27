"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Header from "@/components/layout/Header";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/features/cart/context/CartContext";
import NeoDialog from "@/components/ui/NeoDialog";
import UndoToast from "@/components/ui/UndoToast";
import { useUndoableDelete } from "@/lib/hooks/useUndoableDelete";

import { formatPrice } from "@/lib/currency";

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    isLoading,
    updateQuantity,
    removeItem,
    clearItems,
    selectedIds,
    selectedItems,
    selectedSubtotal,
    isSelected,
    toggleSelect,
    toggleSelectAll,
  } = useCart();
  const [error, setError] = useState("");
  const [bulkDelete, setBulkDelete] = useState<"selected" | "all" | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const pendingWasSelected = useRef(false);
  const itemUndo = useUndoableDelete({ onCommit: removeItem });
  const visibleItems = items.filter((item) => !itemUndo.isPending(item.id));

  const selectedQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  // Shipping fee is decided by the backend when the order is created (currently 0); no client-side estimate.
  const shipping = 0;
  const allSelected = visibleItems.length > 0 && visibleItems.every((item) => selectedIds.includes(item.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const scheduleRemove = (id: string, name: string) => {
    pendingWasSelected.current = isSelected(id);
    if (pendingWasSelected.current) toggleSelect(id);
    setError("");
    itemUndo.schedule(id, name);
  };

  const undoRemove = () => {
    const pendingId = itemUndo.pending?.id;
    itemUndo.undo();
    if (pendingId && pendingWasSelected.current && !isSelected(pendingId)) toggleSelect(pendingId);
  };

  const confirmBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await clearItems(bulkDelete === "selected" ? selectedIds : undefined);
      setBulkDelete(null);
    } finally {
      setBulkDeleting(false);
    }
  };
  const bulkCount = bulkDelete === "selected" ? selectedIds.length : visibleItems.length;

  const goToCheckout = () => {
    if (!selectedItems.length) {
      setError("Vui lòng chọn ít nhất 1 sản phẩm để thanh toán.");
      return;
    }
    // An item waiting in the undo window must not travel to checkout.
    if (itemUndo.pending && isSelected(itemUndo.pending.id)) toggleSelect(itemUndo.pending.id);
    router.push("/checkout");
  };


  if (isLoading) return <><Header /><main className="flex-1 grid place-items-center p-20">Đang tải giỏ hàng...</main></>;

  return (
    <>
      <Header />
      <main className="flex-1 bg-background py-10">
        <div className="container mx-auto min-h-[60vh] max-w-5xl px-4">
          <div className="mb-8 flex items-center gap-3"><ShoppingBag size={28} /><h1 className="text-3xl font-black uppercase">Giỏ hàng</h1></div>
          {visibleItems.length === 0 ? (
            <div className="neo-box-no-hover bg-white p-14 text-center">
              <ShoppingBag className="mx-auto mb-4 text-primary-dark" size={42} />
              <h2 className="mb-2 text-xl font-black">Giỏ hàng đang trống</h2>
              <Link href="/products" className="btn-primary inline-block mt-4">Tiếp tục mua sắm</Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="neo-box-no-hover h-fit bg-white lg:col-span-2">
                {/* Thanh chọn tất cả */}
                <label className="flex cursor-pointer items-center gap-3 border-b-2 border-black bg-gray-50 px-4 py-3 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(element) => { if (element) element.indeterminate = someSelected; }}
                    onChange={() => { toggleSelectAll(); setError(""); }}
                    className="h-4 w-4 cursor-pointer accent-primary-ink"
                    aria-label="Chọn tất cả sản phẩm"
                  />
                  <span>Chọn tất cả ({visibleItems.length} sản phẩm)</span>
                </label>

                {visibleItems.map((item) => {
                  const checked = isSelected(item.id);
                  const normalizedType = (item.productType as string)?.toUpperCase();
                  const isCharacterOrDigital =
                    normalizedType === "CHARACTER" ||
                    normalizedType === "SUBSCRIPTION";

                  return (
                    <div key={item.id} className={`flex flex-wrap items-center gap-4 border-b-2 border-gray-100 p-4 last:border-0 transition-colors ${checked ? "bg-primary/10" : ""}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => { toggleSelect(item.id); setError(""); }}
                        className="h-4 w-4 cursor-pointer accent-primary-ink"
                        aria-label={`Chọn ${item.name} để thanh toán`}
                      />
                      <div className="relative h-20 w-20 overflow-hidden border-2 border-black bg-gray-100">
                        {item.previewUrl ? (
                          <Image src={item.previewUrl} alt={item.name} fill sizes="80px" className="object-contain p-1" />
                        ) : (
                          <span className="grid h-full place-items-center text-xs font-bold">[IMG]</span>
                        )}
                      </div>
                      <div className="min-w-40 flex-1"><h2 className="font-black">{item.name}</h2><p className="text-sm text-text-muted">{formatPrice(item.price)} / sản phẩm</p></div>
                      {!isCharacterOrDigital && (
                        <div className="flex h-9 border-2 border-black">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="cursor-pointer disabled:cursor-not-allowed w-9 border-r-2 border-black disabled:opacity-40" aria-label="Giảm số lượng"><Minus size={14} className="mx-auto" /></button>
                          <span className="grid w-10 place-items-center font-bold">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="cursor-pointer w-9 border-l-2 border-black" aria-label="Tăng số lượng"><Plus size={14} className="mx-auto" /></button>
                        </div>
                      )}
                      <strong className="w-24 text-right text-primary-ink">{formatPrice(item.price * item.quantity)}</strong>
                      <button onClick={() => scheduleRemove(item.id, item.name)} className="cursor-pointer grid h-11 w-11 place-items-center text-text-muted hover:text-red-600" aria-label={`Xóa ${item.name}`}><Trash2 size={17} /></button>
                    </div>
                  );
                })}

                <div className="flex flex-wrap items-center gap-5 border-t-2 border-gray-100 px-4 py-3">
                  <button onClick={() => setBulkDelete("selected")} disabled={!selectedIds.length} className="cursor-pointer flex items-center gap-2 text-sm font-bold text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={15} /> Xóa đã chọn ({selectedIds.length})</button>
                  <button onClick={() => setBulkDelete("all")} className="cursor-pointer flex items-center gap-2 text-sm font-bold text-red-600 hover:underline"><Trash2 size={15} /> Xóa toàn bộ</button>
                </div>
              </div>

              <div className="neo-box-no-hover h-fit bg-white p-5 lg:sticky lg:top-28">
                <h2 className="mb-4 border-b-2 border-black pb-3 text-lg font-black uppercase">Tóm tắt</h2>
                <div className="mb-2 flex justify-between text-sm font-bold"><span>Đã chọn</span><span>{selectedItems.length} sản phẩm ({selectedQuantity} món)</span></div>
                <div className="flex justify-between text-sm font-bold"><span>Tạm tính</span><span>{formatPrice(selectedSubtotal)}</span></div>
                <div className="mt-2 flex justify-between text-sm font-bold"><span>Vận chuyển</span><span>{shipping === 0 ? "Miễn phí" : formatPrice(shipping)}</span></div>
                <div className="mt-4 flex justify-between border-t-2 border-dashed border-black pt-3 text-xl font-black"><span>Tổng</span><span className="text-primary-ink">{formatPrice(selectedSubtotal + shipping)}</span></div>
                {error && <p role="alert" className="mt-3 border-2 border-red-600 bg-red-50 p-2 text-xs font-bold text-red-700">{error}</p>}
                <button
                  type="button"
                  onClick={goToCheckout}
                  disabled={!selectedItems.length}
                  className="btn-primary mt-5 block w-full py-3 text-center"
                >
                  Mua hàng ({selectedItems.length})
                </button>
                {!selectedItems.length && <p className="mt-2 text-center text-xs font-semibold text-text-muted">Tick chọn sản phẩm để thanh toán</p>}
                {itemUndo.error && <p role="alert" className="mt-3 border-2 border-red-600 bg-red-50 p-2 text-xs font-bold text-red-700">{itemUndo.error}</p>}
              </div>
            </div>
          )}
        </div>
      </main>
      <UndoToast message={itemUndo.pending ? `Đã xóa “${itemUndo.pending.label}” khỏi giỏ` : null} onUndo={undoRemove} />
      {bulkDelete && (
        <NeoDialog
          tone="danger"
          size="sm"
          title={bulkDelete === "all" ? "Xóa toàn bộ giỏ hàng?" : `Xóa ${bulkCount} sản phẩm đã chọn?`}
          description="Sản phẩm sẽ bị xóa khỏi giỏ hàng. Bạn có thể thêm lại từ trang sản phẩm."
          onClose={() => setBulkDelete(null)}
          busy={bulkDeleting}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setBulkDelete(null)} disabled={bulkDeleting}>
                Giữ lại
              </button>
              <button type="button" className="btn-danger" onClick={() => void confirmBulkDelete()} disabled={bulkDeleting} aria-busy={bulkDeleting}>
                {bulkDeleting ? "Đang xóa..." : `Xóa ${bulkCount} sản phẩm`}
              </button>
            </>
          }
        />
      )}
    </>
  );
}
