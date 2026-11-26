"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Cpu, Monitor, Package, Sparkles } from "lucide-react";
import type { BundleDetail, BundleItemDetail } from "@/api_client";
import { formatPrice } from "@/lib/currency";

interface BundleContentsSectionProps {
  bundleDetails: BundleDetail;
  sellingPrice: number;
  hasAllAccess?: boolean;
  ownedCharacterIds?: Set<number>;
}

function BundleItemThumbnail({
  src,
  alt,
  isLed,
}: {
  src?: string | null;
  alt: string;
  isLed: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  if (src && !imgError) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className={`object-contain p-3 ${isLed ? "" : "[image-rendering:pixelated]"}`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="grid h-full w-full place-items-center bg-gray-50">
      {isLed ? (
        <Cpu size={40} strokeWidth={1.6} className="text-primary-ink/70" aria-hidden />
      ) : (
        <Monitor size={40} strokeWidth={1.6} className="text-primary-ink/70" aria-hidden />
      )}
    </div>
  );
}

function extractResolution(item: BundleItemDetail): string | null {
  const specs = item.specifications;
  if (!specs) return null;
  const raw = specs.resolution ?? specs.dimensions ?? specs.matrixSize ?? specs.size;
  return raw != null && String(raw).trim() !== "" ? String(raw) : null;
}

export function BundleContentsSection({
  bundleDetails,
  sellingPrice,
  hasAllAccess = false,
  ownedCharacterIds,
}: BundleContentsSectionProps) {
  const items = bundleDetails.items ?? [];
  if (items.length === 0) return null;

  const totalUnits = items.reduce((sum, it) => sum + Math.max(1, it.quantity), 0);
  const computedRetailSum = items.reduce(
    (sum, it) => sum + Number(it.unitPrice ?? 0) * Math.max(1, it.quantity),
    0,
  );
  const originalPrice =
    Number(bundleDetails.originalPrice ?? 0) > 0
      ? Number(bundleDetails.originalPrice)
      : computedRetailSum;
  const savedAmount = originalPrice > sellingPrice ? originalPrice - sellingPrice : 0;
  const discountPercent =
    originalPrice > 0 && savedAmount > 0 ? Math.round((savedAmount / originalPrice) * 100) : 0;

  return (
    <section
      aria-labelledby="bundle-contents-heading"
      className="neo-box-no-hover mt-8 bg-white p-6"
    >
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <Package size={18} className="shrink-0 text-primary-ink" aria-hidden />
          <h2
            id="bundle-contents-heading"
            className="text-sm font-black uppercase tracking-wider text-black sm:text-base"
          >
            Sản phẩm có trong gói Combo
          </h2>
          <span className="border-2 border-black bg-primary/25 px-2.5 py-0.5 text-[11px] font-black uppercase text-black shadow-[1px_1px_0_0_#000] tabular-nums">
            {items.length} sản phẩm ({totalUnits} món)
          </span>
        </div>

        {savedAmount > 0 && (
          <span className="inline-flex items-center gap-1.5 border-2 border-black bg-[#fef08a] px-3 py-1 text-xs font-black uppercase text-black shadow-[2px_2px_0_0_#000] tabular-nums">
            <Sparkles size={13} className="shrink-0 text-black" aria-hidden />
            Tiết kiệm {formatPrice(savedAmount)}
            {discountPercent > 0 ? ` (-${discountPercent}%)` : ""}
          </span>
        )}
      </div>

      {/* Component Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, idx) => {
          const isLed = item.itemType === "LED";
          const name = isLed
            ? item.modelName || `Tấm LED #${item.modelId ?? idx + 1}`
            : item.characterName || `Nhân vật #${item.characterId ?? item.versionId ?? idx + 1}`;
          const previewSrc = isLed
            ? item.thumbnailUrl
            : item.previewGifUrl || item.thumbnailUrl;
          const resolution = isLed ? extractResolution(item) : null;
          const isOwnedChar =
            !isLed &&
            (hasAllAccess ||
              (item.characterId != null && Boolean(ownedCharacterIds?.has(item.characterId))));
          const unitPrice = item.unitPrice != null ? Number(item.unitPrice) : null;
          const lineTotal = unitPrice != null ? unitPrice * Math.max(1, item.quantity) : null;
          const detailHref = item.productId ? `/products/${item.productId}` : null;

          return (
            <article
              key={`${item.itemType}-${item.modelId ?? item.versionId ?? idx}`}
              className="flex flex-col justify-between border-2 border-black bg-white shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-0.5"
            >
              <div>
                {/* Preview */}
                <div className="relative aspect-[4/3] overflow-hidden border-b-2 border-black bg-gray-50">
                  <BundleItemThumbnail src={previewSrc} alt={name} isLed={isLed} />
                  <span
                    className={`absolute left-2.5 top-2.5 border border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000] ${
                      isLed ? "bg-[#fef08a]" : "bg-[#bae6fd]"
                    }`}
                  >
                    {isLed ? "Tấm LED" : "Nhân vật"}
                  </span>
                  <span className="absolute right-2.5 top-2.5 border border-black bg-black px-2 py-0.5 text-[10px] font-black uppercase text-white tabular-nums">
                    ×{item.quantity}
                  </span>
                  {isOwnedChar && (
                    <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 border border-black bg-emerald-300 px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[1px_1px_0_0_#000]">
                      <Check size={11} aria-hidden />
                      Đã sở hữu
                    </span>
                  )}
                </div>

                {/* Metadata */}
                <div className="p-3.5">
                  <h3 className="line-clamp-2 text-sm font-black uppercase leading-snug text-black">
                    {name}
                  </h3>

                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold text-text-muted">
                    {isLed ? (
                      <>
                        {resolution && (
                          <span className="border border-black/40 bg-gray-100 px-1.5 py-0.5 font-black text-black">
                            {resolution}
                          </span>
                        )}
                        {item.stockQuantity != null && (
                          <span
                            className={`border px-1.5 py-0.5 font-black ${
                              item.stockQuantity > 0
                                ? "border-emerald-700/40 bg-emerald-50 text-emerald-900"
                                : "border-red-700/40 bg-red-50 text-red-700"
                            }`}
                          >
                            {item.stockQuantity > 0
                              ? `Tồn kho: ${item.stockQuantity}`
                              : "Tạm hết hàng"}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        {item.versionNumber != null && (
                          <span className="border border-black/40 bg-gray-100 px-1.5 py-0.5 font-black text-black">
                            Phiên bản v{item.versionNumber}
                          </span>
                        )}
                        <span className="border border-black/40 bg-gray-100 px-1.5 py-0.5 font-black text-black">
                          Ảnh động GIF
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Price & Link Footer */}
              <div className="flex items-center justify-between gap-2 border-t-2 border-dashed border-gray-200 px-3.5 py-3">
                <div>
                  {unitPrice != null && unitPrice > 0 ? (
                    <>
                      <span className="block text-[10px] font-bold uppercase text-text-muted">
                        {item.quantity > 1 ? `Giá lẻ (${item.quantity} món)` : "Giá bán lẻ"}
                      </span>
                      <strong className="text-xs font-black text-black tabular-nums">
                        {formatPrice(lineTotal ?? unitPrice)}
                      </strong>
                    </>
                  ) : (
                    <span className="text-[11px] font-bold uppercase text-text-muted">
                      Đã bao gồm trong gói
                    </span>
                  )}
                </div>

                {detailHref && (
                  <Link
                    href={detailHref}
                    className="inline-flex cursor-pointer items-center gap-1 border-2 border-black bg-white px-2.5 py-1 text-[11px] font-black uppercase text-black shadow-[2px_2px_0_0_#000] transition-colors hover:bg-primary/25"
                  >
                    <span>Xem chi tiết</span>
                    <ArrowRight size={12} aria-hidden />
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Price Breakdown Summary */}
      {originalPrice > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-2 border-black bg-primary/10 px-4 py-3 text-xs">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <span className="block text-[10px] font-bold uppercase text-text-muted">
                Tổng giá mua lẻ
              </span>
              <span
                className={`text-sm font-black tabular-nums ${
                  savedAmount > 0 ? "text-text-muted line-through" : "text-black"
                }`}
              >
                {formatPrice(originalPrice)}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase text-text-muted">
                Giá gói Combo
              </span>
              <strong className="text-base font-black text-primary-ink tabular-nums">
                {formatPrice(sellingPrice)}
              </strong>
            </div>
          </div>

          {savedAmount > 0 && (
            <div className="text-right">
              <span className="block text-[10px] font-bold uppercase text-text-muted">
                Ưu đãi khi mua theo gói
              </span>
              <strong className="text-sm font-black text-emerald-800 tabular-nums">
                Giảm {formatPrice(savedAmount)}
                {discountPercent > 0 ? ` (${discountPercent}%)` : ""}
              </strong>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
