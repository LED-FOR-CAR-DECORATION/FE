"use client";

import Link from "next/link";
import { useMemo, useRef, useEffect, useState } from "react";
import Pagination from "@/components/ui/Pagination";
import { scrollToTop, usePageParam } from "@/hooks/usePageParam";
import {
  AlertCircle,
  ExternalLink,
  Eye,
  Film,
  LockKeyhole,
  RefreshCw,
  ShoppingBag,
  X,
} from "lucide-react";
import CustomerSidebar from "@/components/layout/CustomerSidebar";
import Header from "@/components/layout/Header";
import { useGallery } from "@/features/character/context/GalleryContext";
import type { CustomerGalleryItem } from "@/lib/api/customerCharacters";
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

function useGalleryGridLayout(): {
  columns: 1 | 2 | 3;
  rows: number;
  pageSize: number;
  isDesktopSplit: boolean;
  ready: boolean;
} {
  const [layout, setLayout] = useState<{
    columns: 1 | 2 | 3;
    rows: number;
    isDesktopSplit: boolean;
    ready: boolean;
  }>({
    columns: 3,
    rows: 2,
    isDesktopSplit: true,
    ready: false,
  });

  useEffect(() => {
    let timer: number | undefined;
    const compute = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isDesktopSplit = width >= 1024;
      const columns: 1 | 2 | 3 = isDesktopSplit ? 3 : width >= 640 ? 2 : 1;
      // Header (106px) + main py (32px) + Pagination (~52px) + gap (12px) = ~202px
      const chromeHeight = 202;
      const rows = isDesktopSplit
        ? Math.max(1, Math.min(3, Math.floor((Math.max(0, height - chromeHeight) + 14) / (260 + 14))))
        : 2;
      setLayout({ columns, rows, isDesktopSplit, ready: true });
    };

    compute();
    const onResize = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(compute, 120);
    };
    window.addEventListener("resize", onResize);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return {
    columns: layout.columns,
    rows: layout.rows,
    pageSize: layout.columns * layout.rows,
    isDesktopSplit: layout.isDesktopSplit,
    ready: layout.ready,
  };
}

export default function GalleryPage() {
  const { ownedCharacters, isLoading, error, refresh } = useGallery();
  const [previewItem, setPreviewItem] =
    useState<CustomerGalleryItem | null>(null);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const { rows, pageSize, isDesktopSplit, ready } = useGalleryGridLayout();
  const [page, setPage] = usePageParam();
  const gridRef = useRef<HTMLDivElement>(null);
  const totalPages = Math.max(1, Math.ceil(ownedCharacters.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedCharacters = useMemo(
    () => ownedCharacters.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [ownedCharacters, currentPage, pageSize],
  );

  // Clamp out-of-range URL page when resize increases pageSize
  useEffect(() => {
    if (!isLoading && ready && page > totalPages) {
      setPage(totalPages);
    }
  }, [isLoading, ready, page, totalPages, setPage]);

  const changePage = (next: number) => {
    setPage(next);
    if (!isDesktopSplit) {
      scrollToTop(gridRef.current);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-[#f5f5f5] py-5 lg:h-[calc(100dvh-106px)] lg:flex-none lg:overflow-hidden lg:py-4">
        <h1 className="sr-only">Thư viện nhân vật ({ownedCharacters.length})</h1>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 lg:h-full lg:min-h-0 lg:flex-row lg:items-stretch">
          <div className="shrink-0">
            <CustomerSidebar />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3 lg:h-full lg:min-h-0">

            {isLoading || !ready ? (
              <div
                aria-busy="true"
                className="grid min-h-0 flex-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3"
                style={
                  isDesktopSplit
                    ? { gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }
                    : undefined
                }
              >
                <span className="sr-only" role="status">
                  Đang tải thư viện nhân vật đã sở hữu...
                </span>
                {Array.from({ length: ready ? pageSize : 3 }).map((_, idx) => (
                  <div
                    key={idx}
                    aria-hidden="true"
                    className="profile-card flex h-full min-h-0 animate-pulse flex-col overflow-hidden p-0"
                  >
                    <div
                      className={`border-b-2 border-black bg-gray-200 ${
                        isDesktopSplit ? "min-h-[96px] flex-1" : "aspect-square"
                      }`}
                    />
                    <div className="shrink-0 space-y-2 p-2.5">
                      <div className="h-4 w-2/3 bg-gray-200" />
                      <div className="h-3 w-1/2 bg-gray-100" />
                      <div className="h-12 w-full bg-gray-100" />
                      <div className="h-7 w-full bg-gray-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <section
                role="alert"
                className="flex flex-1 flex-col items-center justify-center rounded-xs border border-red-200 bg-white p-8 text-center shadow-xs"
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
              <section className="flex flex-1 flex-col items-center justify-center rounded-xs bg-white p-12 text-center shadow-xs">
                <LockKeyhole
                  className="mx-auto mb-3 text-primary-dark"
                  size={38}
                />
                <h2 className="text-xl font-black">Gallery đang trống</h2>
                <p className="mt-2 text-sm text-text-muted">
                  Nhân vật đã thanh toán và bản thiết kế Commission đã chấp nhận sẽ xuất hiện ở đây.
                </p>
                <Link href="/products" className="btn-primary mt-5 inline-block">
                  Khám phá Character
                </Link>
              </section>
            ) : (
              <>
              <div
                ref={gridRef}
                className="grid min-h-0 flex-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3"
                style={
                  isDesktopSplit && pagedCharacters.length > 0
                    ? { gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }
                    : undefined
                }
              >
                {pagedCharacters.map((item, idx) => (
                  <article
                    key={item.sourceType === "COMMISSION" ? `commission-${item.commissionId}-${item.submissionId}` : `${item.orderId}-${item.storeProductId}-${item.characterId}-${idx}`}
                    className="profile-card flex h-full min-h-0 flex-col overflow-hidden p-0"
                  >
                    <div
                      className={`relative w-full overflow-hidden border-b-2 border-black bg-[#090d14] ${
                        isDesktopSplit ? "min-h-[96px] flex-1" : "aspect-square"
                      }`}
                    >
                      {item.previewGifUrl ? (
                        <img
                          src={item.previewGifUrl}
                          alt={item.characterName}
                          className="absolute inset-0 h-full w-full object-contain"
                          style={{ imageRendering: "pixelated" }}
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
                          <Film size={24} />
                          <span className="text-xs font-semibold">
                            Không có ảnh xem trước
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col justify-between p-2.5">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="line-clamp-1 text-sm font-black text-gray-900">
                            {item.characterName}
                          </h2>
                          <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            {item.sourceType === "COMMISSION"
                              ? "Commission"
                              : item.unlockedBySubscription
                                ? "VIP Pass"
                                : "Đã sở hữu"}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-text-muted">
                          {item.productName}
                        </p>

                        <div className="mt-1.5 space-y-0.5 rounded-lg border border-gray-100 bg-gray-50 px-2 py-1 text-[11px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-gray-500">{item.sourceType === "COMMISSION" ? "Yêu cầu" : "Nguồn"}</span>
                            {item.sourceType === "COMMISSION" ? (
                              <Link href={`/messages?commissionId=${item.commissionId}`} className="inline-flex items-center gap-1 font-bold text-primary-dark hover:underline">
                                Commission #{item.commissionId}<ExternalLink size={10} />
                              </Link>
                            ) : item.orderId !== null && item.orderId > 0 ? (
                              <Link href={`/profile/orders/${item.orderId}`} className="inline-flex items-center gap-1 font-bold text-primary-dark hover:underline">
                                Đơn #{item.orderId}<ExternalLink size={10} />
                              </Link>
                            ) : (
                              <span className="font-bold text-[#155e59]">
                                {item.unlockedBySubscription ? "Gói All-Access VIP" : "Được cấp"}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-gray-500">{item.sourceType === "COMMISSION" ? "Tổng chi phí" : "Giá mua"}</span>
                            <span className="font-bold text-gray-900">
                              {item.unlockedBySubscription
                                ? "Miễn phí (VIP)"
                                : item.purchasedPrice === null
                                  ? "—"
                                  : formatPrice(item.purchasedPrice)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-gray-500">{item.sourceType === "COMMISSION" ? "Hoàn tất" : "Ngày sở hữu"}</span>
                            <span className="font-medium text-gray-700 tabular-nums">
                              {formatPurchasedDate(item.purchasedAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="btn-primary flex flex-1 items-center justify-center gap-1 py-1.5! text-xs"
                        >
                          <Eye size={13} />
                          Xem ảnh
                        </button>
                        {item.storeProductId !== null && <Link
                          href={`/products/${item.storeProductId}`}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                          title="Xem sản phẩm trên Store"
                        >
                          <ShoppingBag size={13} />
                          Store
                        </Link>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={changePage}
                totalItems={ownedCharacters.length}
                pageSize={pageSize}
                itemLabel="nhân vật"
                ariaLabel="Phân trang thư viện nhân vật"
                variant="soft"
                alwaysShow
                className="mt-auto shrink-0"
              />
              </>
            )}
          </div>
        </div>
      </main>

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
                  {previewItem.productName}
                  {previewItem.sourceType === "COMMISSION" ? ` · Yêu cầu #${previewItem.commissionId}` : previewItem.orderId !== null ? ` · Đơn #${previewItem.orderId}` : ""}
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
              {previewItem.orderId !== null && previewItem.orderId > 0 && (
                <Link
                  href={`/profile/orders/${previewItem.orderId}`}
                  className="rounded-lg border border-gray-300 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Xem đơn hàng #{previewItem.orderId}
                </Link>
              )}
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
