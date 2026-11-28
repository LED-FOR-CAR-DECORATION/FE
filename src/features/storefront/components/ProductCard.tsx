"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Check, CheckCircle, Monitor, ShoppingCart } from "lucide-react";
import type { CatalogProduct } from "@/features/cart/catalog";
import type {
  CustomerActiveSubscription,
  CustomerGalleryItem,
} from "@/lib/api/customerCharacters";
import { formatPrice } from "@/lib/currency";

/**
 * Checks whether a catalog product is already owned by the customer
 * (either directly in their gallery or unlocked via an active all-access subscription).
 */
export function isProductOwned(
  product: CatalogProduct,
  ownedCharacters: CustomerGalleryItem[],
  activeSubscription: CustomerActiveSubscription | null | undefined,
): boolean {
  const hasAllAccess = Boolean(activeSubscription?.allAccessCharacters);
  if (product.productType === "CHARACTER") {
    return (
      hasAllAccess ||
      ownedCharacters.some(
        (owned) =>
          String(owned.storeProductId) === String(product.id) ||
          (product.characterDetails?.characterId != null &&
            owned.characterId === product.characterDetails.characterId),
      )
    );
  }
  if (product.productType === "SUBSCRIPTION") {
    return activeSubscription != null;
  }
  if (product.productType === "BUNDLE") {
    return (
      product.bundleDetails?.items?.some(
        (bi) =>
          bi.itemType === "CHARACTER" &&
          (hasAllAccess ||
            (bi.characterId != null &&
              ownedCharacters.some((o) => o.characterId === bi.characterId))),
      ) ?? false
    );
  }
  return false;
}

function ProductArtwork({ product }: { product: CatalogProduct }) {
  const [imgError, setImgError] = useState(false);

  if (product.previewUrl && !imgError) {
    return (
      <Image
        src={product.previewUrl}
        alt={product.name}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className="object-contain [image-rendering:pixelated]"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="grid h-full w-full place-items-center bg-gray-50">
      <Monitor size={54} strokeWidth={1.5} className="text-primary-ink/60" />
    </div>
  );
}

export interface ProductCardProps {
  product: CatalogProduct;
  onAdd: (product: CatalogProduct) => void;
  canBuy: boolean;
  isOwned?: boolean;
  isAlreadyInCart?: boolean;
  /** Compact viewport-fitted mode for 1-screen storefront grid (no fixed aspect-square). */
  compact?: boolean;
}

/**
 * Shared Neo-Brutalism product card used across the Store catalog (/products)
 * and Featured Products section on the Landing page (/).
 */
export function ProductCard({
  product,
  onAdd,
  canBuy,
  isOwned = false,
  isAlreadyInCart = false,
  compact = false,
}: ProductCardProps) {
  const isCharacter = product.productType === "CHARACTER";
  const isBundle = product.productType === "BUNDLE";
  const isSubscription = product.productType === "SUBSCRIPTION";
  const isDigitalSingle = (isCharacter || isSubscription) && isAlreadyInCart;
  const isBlockedFromAdd = !canBuy || isOwned || isDigitalSingle;

  const buttonTitle = !canBuy
    ? "Vui lòng đăng nhập để thêm vào giỏ hàng"
    : isOwned
      ? "Bạn đã sở hữu nhân vật này"
      : isDigitalSingle
        ? "Sản phẩm kỹ thuật số đã có trong giỏ hàng"
        : undefined;

  const typeLabel = isSubscription
    ? "Gói thành viên"
    : isBundle
      ? "Gói sản phẩm"
      : isCharacter
        ? "Nhân vật"
        : "Thiết bị LED";

  return (
    <article className="neo-box group relative flex h-full min-h-0 flex-col justify-between overflow-hidden bg-white transition-all">
      <Link href={`/products/${product.id}`} className="flex min-h-0 flex-1 cursor-pointer flex-col">
        {/* Image Area */}
        <div
          className={`relative overflow-hidden border-b-2 border-black bg-gray-50 ${
            compact ? "min-h-[112px] flex-1" : "aspect-square"
          }`}
        >
          <ProductArtwork product={product} />
          <span className="absolute left-2 top-2 border border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
            {typeLabel}
          </span>
          {isOwned && (
            <span className="absolute right-2 top-2 border border-black bg-emerald-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
              Đã sở hữu
            </span>
          )}
        </div>

        {/* Details */}
        <div
          className={
            compact
              ? "flex shrink-0 flex-col justify-between p-2.5"
              : "flex flex-1 flex-col justify-between p-3.5"
          }
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              {typeLabel}
            </p>
            <h3
              className={`font-black uppercase leading-snug text-black transition-colors group-hover:text-primary-ink ${
                compact
                  ? "mt-0.5 line-clamp-1 text-xs sm:text-sm"
                  : "mt-1 line-clamp-2 min-h-10 text-sm"
              }`}
            >
              {product.name}
            </h3>
            {product.tags && product.tags.length > 0 && (
              <div
                className={
                  compact
                    ? "mt-1.5 flex flex-nowrap gap-1 overflow-hidden"
                    : "mt-2 flex flex-wrap gap-1"
                }
              >
                {product.tags.slice(0, compact ? 2 : 3).map((tag, idx) => (
                  <span
                    key={tag.tagId ?? tag.name ?? idx}
                    className="shrink-0 border border-black bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-black"
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div
            className={`flex items-center justify-between gap-2 border-t-2 border-dashed border-gray-200 ${
              compact ? "mt-2 pr-10 pt-2" : "mt-3 pr-12 pt-3"
            }`}
          >
            <div>
              <span className="block text-[10px] font-bold uppercase text-text-muted">Giá bán</span>
              <strong className="text-sm font-black text-primary-ink sm:text-base">
                {formatPrice(product.price)}
              </strong>
            </div>
          </div>
        </div>
      </Link>

      <button
        type="button"
        disabled={isBlockedFromAdd}
        title={buttonTitle}
        onClick={() => onAdd(product)}
        className={`absolute grid place-items-center p-0! shadow-[2px_2px_0_0_#000] ${
          compact ? "bottom-2.5 right-2.5 size-8" : "bottom-3.5 right-3.5 size-9"
        } ${
          isOwned || isDigitalSingle
            ? "cursor-not-allowed border-2 border-black bg-emerald-200 text-black"
            : "btn-primary"
        }`}
        aria-label={
          isOwned
            ? `${product.name} đã sở hữu`
            : isDigitalSingle
              ? `${product.name} đã có trong giỏ hàng`
              : `Thêm ${product.name} vào giỏ hàng`
        }
      >
        {isOwned || isDigitalSingle ? (
          <Check size={compact ? 16 : 18} className="shrink-0" aria-hidden />
        ) : (
          <ShoppingCart size={compact ? 16 : 18} className="shrink-0" aria-hidden />
        )}
      </button>
    </article>
  );
}

/**
 * Floating Neo-Brutalist cart toast notification shared between Landing and Store pages.
 */
export function StoreCartToast({ notice }: { notice: { title: string; desc: string } | null }) {
  if (!notice) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="neo-box-no-hover fixed bottom-6 right-6 z-50 flex items-center gap-3 border-2 border-black bg-white px-5 py-3.5 shadow-[4px_4px_0_0_#000]"
    >
      <CheckCircle size={20} className="shrink-0 text-primary-ink" />
      <div>
        <p className="text-xs font-black uppercase text-black">{notice.title}</p>
        <p className="text-xs font-bold text-text-muted">{notice.desc}</p>
      </div>
      <Link
        href="/cart"
        className="btn-primary ml-2 px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
      >
        Xem giỏ
      </Link>
    </div>
  );
}
