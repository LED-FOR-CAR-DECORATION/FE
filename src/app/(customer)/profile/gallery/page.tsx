"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  Eye,
  Film,
  Image as ImageIcon,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShoppingBag,
  X,
} from "lucide-react";
import CustomerSidebar from "@/components/layout/CustomerSidebar";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { useGallery } from "@/features/character/context/GalleryContext";
import type { CustomerOwnedCharacterItem } from "@/lib/api/customerCharacters";
import { formatPrice } from "@/lib/currency";

function formatPurchasedDate(value: string): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function GalleryPage() {
  const { ownedCharacters, isLoading, error, refresh } = useGallery();
  const [previewItem, setPreviewItem] =
    useState<CustomerOwnedCharacterItem | null>(null);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <>
      <Header />
      <main className="flex-1 bg-[#f5f5f5] py-6 md:py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 lg:flex-row lg:items-start">
          <CustomerSidebar />
          <div className="min-w-0 flex-1 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xs bg-white px-6 py-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="profile-section-icon">
                  <ImageIcon size={19} />
                </span>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-gray-900">
                    Thư viện nhân vật ({ownedCharacters.length})
                  </h1>
                  <p className="text-xs text-text-muted">
                    Các Character bạn đã mua và sở hữu từ cửa hàng Mirage.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={refresh}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={isLoading ? "animate-spin" : ""}
                />
                Làm mới
              </button>
            </div>

            {isLoading ? (
              <section className="flex flex-col items-center justify-center rounded-xs bg-white py-16 text-center shadow-xs">
                <Loader2
                  size={28}
                  className="animate-spin text-primary-dark"
                />
                <p className="mt-3 text-sm font-semibold text-gray-600">
                  Đang tải thư viện nhân vật đã sở hữu...
                </p>
              </section>
            ) : error ? (
              <section
                role="alert"
                className="rounded-xs border border-red-200 bg-white p-8 text-center shadow-xs"
              >
                <AlertCircle className="mx-auto mb-3 text-red-500" size={34} />
                <h2 className="text-base font-black text-gray-900">
                  Không thể tải danh sách nhân vật
                </h2>
                <p className="mt-1.5 text-sm text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={refresh}
                  className="btn-primary mt-5 inline-flex items-center gap-2 text-sm"
                >
                  <RefreshCw size={15} />
                  Thử lại
                </button>
              </section>
            ) : ownedCharacters.length === 0 ? (
              <section className="rounded-xs bg-white p-12 text-center shadow-xs">
                <LockKeyhole
                  className="mx-auto mb-3 text-primary-dark"
                  size={38}
                />
                <h2 className="text-xl font-black">Gallery đang trống</h2>
                <p className="mt-2 text-sm text-text-muted">
                  Character bạn mua sẽ xuất hiện ở đây sau khi thanh toán thành
                  công.
                </p>
                <Link href="/products" className="btn-primary mt-5 inline-block">
                  Khám phá Character
                </Link>
              </section>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {ownedCharacters.map((item, idx) => (
                  <article
                    key={`${item.orderId}-${item.storeProductId}-${item.characterId}-${idx}`}
                    className="profile-card flex flex-col overflow-hidden p-0"
                  >
                    <div className="relative grid aspect-square place-items-center border-b-2 border-black bg-[#090d14] p-4">
                      {item.previewGifUrl ? (
                        <img
                          src={item.previewGifUrl}
                          alt={item.characterName}
                          className="h-full w-full object-contain"
                          style={{ imageRendering: "pixelated" }}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <Film size={28} />
                          <span className="text-xs font-semibold">
                            Không có ảnh xem trước
                          </span>
                        </div>
                      )}

                      {(item.frameCount || item.frameDelayMs) && (
                        <span className="absolute right-2.5 top-2.5 rounded-md border border-white/15 bg-black/75 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-300">
                          {item.frameCount ?? "—"} frames ·{" "}
                          {item.frameDelayMs ?? "—"} ms
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="text-base font-black text-gray-900">
                            {item.characterName}
                          </h2>
                          <span className="shrink-0 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                            Đã sở hữu
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-text-muted">
                          Gói: {item.productName}
                        </p>

                        <div className="mt-3 space-y-1 rounded-lg border border-gray-100 bg-gray-50 p-2.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Đơn hàng</span>
                            <Link
                              href={`/profile/orders/${item.orderId}`}
                              className="inline-flex items-center gap-1 font-bold text-primary-dark hover:underline"
                            >
                              #{item.orderId}
                              <ExternalLink size={11} />
                            </Link>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Giá mua</span>
                            <span className="font-bold text-gray-900">
                              {formatPrice(item.purchasedPrice)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Ngày sở hữu</span>
                            <span className="font-medium text-gray-700">
                              {formatPurchasedDate(item.purchasedAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="btn-primary flex flex-1 items-center justify-center gap-1.5 text-xs"
                        >
                          <Eye size={14} />
                          Xem LED
                        </button>
                        <Link
                          href={`/products/${item.storeProductId}`}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                          title="Xem sản phẩm trên Store"
                        >
                          <ShoppingBag size={14} />
                          Store
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />

      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="owned-character-preview-title"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border-2 border-black bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-3">
              <div>
                <h2
                  id="owned-character-preview-title"
                  className="text-lg font-black text-gray-900"
                >
                  {previewItem.characterName}
                </h2>
                <p className="text-xs text-text-muted">
                  {previewItem.productName} · Đơn #{previewItem.orderId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                aria-label="Đóng"
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 grid aspect-square w-full place-items-center overflow-hidden rounded-xl border border-gray-800 bg-[#090d14] p-4">
              {previewItem.previewGifUrl ? (
                <img
                  src={previewItem.previewGifUrl}
                  alt={previewItem.characterName}
                  className="h-full w-full object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <span className="text-xs font-semibold text-gray-400">
                  Không có ảnh xem trước
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
              <span>
                Thông số: <strong>{previewItem.frameCount ?? "—"}</strong>{" "}
                frames · <strong>{previewItem.frameDelayMs ?? "—"}</strong>{" "}
                ms/frame
              </span>
              <span>
                Giá mua: <strong>{formatPrice(previewItem.purchasedPrice)}</strong>
              </span>
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-3">
              <Link
                href={`/profile/orders/${previewItem.orderId}`}
                className="rounded-lg border border-gray-300 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Xem đơn hàng #{previewItem.orderId}
              </Link>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="btn-primary text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
