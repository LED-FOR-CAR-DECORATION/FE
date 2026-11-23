"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  Download,
  Heart,
  Minus,
  Monitor,
  Plus,
  ShoppingCart,
  Sparkles,
  Zap,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/features/cart/context/CartContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { CatalogProduct } from "@/features/cart/catalog";
import { getApiErrorMessage } from "@/lib/api/auth";
import { fetchStoreProductDetail, fetchStoreProducts } from "@/lib/api/products";
import { formatPrice } from "@/lib/currency";

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams<{ productId: string }>();
  const { items: cartItems, addItem, setSelectedIds } = useCart();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const canBuy = isAuthenticated && !authLoading;

  const [item, setItem] = useState<CatalogProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [actionError, setActionError] = useState("");
  const [activeMedia, setActiveMedia] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchStoreProductDetail(params.productId),
      fetchStoreProducts({ page: 0, size: 50 }),
    ])
      .then(([detail, listRes]) => {
        if (cancelled) return;
        setItem(detail);
        if (detail) {
          setRelatedProducts(
            listRes.items
              .filter((p) => p.id !== detail.id && p.productType === detail.productType)
              .slice(0, 4),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.productId]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex-1 grid place-items-center p-20 bg-background">
          <p className="text-xs font-black uppercase tracking-wider text-text-muted">
            Đang tải chi tiết sản phẩm...
          </p>
        </main>
        <Footer />
      </>
    );
  }

  if (!item) {
    return (
      <>
        <Header />
        <main className="flex-1 grid place-items-center p-20 bg-background">
          <div className="neo-box-no-hover bg-white p-12 text-center">
            <h1 className="text-2xl font-black uppercase">Không tìm thấy sản phẩm</h1>
            <p className="mt-2 text-xs font-semibold text-text-muted">
              Sản phẩm bạn đang tìm kiếm có thể đã được gỡ hoặc không tồn tại.
            </p>
            <Link href="/" className="btn-primary mt-5 inline-block text-xs font-black uppercase">
              Quay lại cửa hàng
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const isCharacter = item.productType === "CHARACTER";
  const isSubscription = item.productType === "SUBSCRIPTION";
  const isDigital = isCharacter || isSubscription;
  const isOwned = false; // Resolved via entitlements if needed
  const isAlreadyInCart = cartItems.some((i) => i.id === String(item.id));

  const productTypeLabel = isSubscription
    ? "Gói thành viên"
    : item.productType === "BUNDLE"
      ? "Gói Combo"
      : isCharacter
        ? "Nhân vật Pixel"
        : "Thiết bị LED";

  const mediaList: string[] = [
    item.previewUrl,
    ...(item.galleryUrls ?? []),
  ].filter((url): url is string => Boolean(url));
  if (mediaList.length === 0) mediaList.push("");

  const currentPreview = mediaList[activeMedia] || item.previewUrl;

  const specifications: [string, string][] = [];
  if (item.ledDetails) {
    specifications.push(["Mã thiết bị", item.ledDetails.modelName]);
    specifications.push(["Tồn kho khả dụng", `${item.ledDetails.stockQuantity} sản phẩm`]);
    Object.entries(item.ledDetails.specifications ?? {}).forEach(([k, v]) => {
      specifications.push([k, Array.isArray(v) ? v.join(", ") : String(v)]);
    });
  } else if (item.characterDetails) {
    specifications.push(["Phiên bản hiện tại", `v${item.characterDetails.versionNumber}`]);
    specifications.push(["Số khung hình", `${item.characterDetails.frameCount ?? 1} frames`]);
    specifications.push(["Độ trễ khung hình", `${item.characterDetails.frameDelayMs ?? 0} ms`]);
    specifications.push(["Định dạng tệp", "Chuẩn LED Binary (.lbin)"]);
  } else if (item.bundleDetails) {
    specifications.push([
      "Thành phần gói",
      item.bundleDetails.items
        .map((bi) => `${bi.modelName ?? bi.characterName ?? "Sản phẩm"} (×${bi.quantity})`)
        .join(", "),
    ]);
  } else if (item.subscriptionDetails) {
    specifications.push(["Mã gói", item.subscriptionDetails.planCode]);
    specifications.push([
      "Thời hạn",
      item.subscriptionDetails.isLifetime
        ? "Trọn đời (Lifetime)"
        : `${item.subscriptionDetails.durationDays ?? 30} ngày`,
    ]);
    specifications.push([
      "Mở khóa toàn bộ Character",
      item.subscriptionDetails.allAccessCharacters ? "Có" : "Không",
    ]);
  }

  const add = async (): Promise<boolean> => {
    if (!isAuthenticated) {
      router.push(`/login?returnUrl=${encodeURIComponent(`/products/${params.productId}`)}`);
      return false;
    }
    if (isOwned) return false;
    setActionError("");
    setIsSubmitting(true);
    try {
      await addItem(item, isDigital ? 1 : quantity);
      setAdded(true);
      return true;
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Không thể thêm sản phẩm vào giỏ hàng."));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      router.push(`/login?returnUrl=${encodeURIComponent(`/products/${params.productId}`)}`);
      return;
    }
    if (isOwned) return;
    setActionError("");
    setIsSubmitting(true);
    try {
      await addItem(item, isDigital ? 1 : quantity);
      // Select strictly this item and jump straight to checkout
      setSelectedIds([String(item.id)]);
      router.push("/checkout");
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Không thể tiếp tục mua ngay."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-background py-8 text-text-main">
        <div className="container mx-auto max-w-7xl px-4 lg:px-8">

          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
            <Link href="/" className="cursor-pointer hover:text-primary-ink hover:underline">
              Trang chủ
            </Link>
            <span>›</span>
            <Link href="/" className="cursor-pointer hover:text-primary-ink hover:underline">
              {productTypeLabel}
            </Link>
            <span>›</span>
            <span className="text-black font-black truncate">{item.name}</span>
          </nav>

          {/* Main Product Layout */}
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1.1fr_0.8fr]">

            {/* ── Left Column: Media Gallery ── */}
            <div className="flex gap-3">
              {mediaList.length > 1 && (
                <div className="flex w-16 shrink-0 flex-col gap-2">
                  {mediaList.map((image, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setActiveMedia(index)}
                      className={`cursor-pointer relative aspect-square border-2 transition-all ${
                        activeMedia === index
                          ? "border-black bg-primary/20 shadow-[2px_2px_0_0_#000]"
                          : "border-black bg-white hover:bg-gray-100"
                      }`}
                      aria-label={`Xem ảnh ${index + 1}`}
                    >
                      {image ? (
                        <Image src={image} alt="" fill sizes="64px" className="object-contain p-1" />
                      ) : (
                        <Sparkles size={16} className="m-auto text-primary-ink" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="neo-box-no-hover relative flex min-h-[360px] flex-1 items-center justify-center overflow-hidden bg-white p-6">
                {currentPreview ? (
                  <Image
                    src={currentPreview}
                    alt={`Ảnh sản phẩm ${item.name}`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 45vw"
                    priority
                    className="object-contain p-6 [image-rendering:pixelated]"
                  />
                ) : (
                  <div className="grid place-items-center text-xs font-black uppercase text-text-muted">
                    <Monitor size={48} className="mb-2 text-primary-ink/60" />
                    Hình ảnh sản phẩm
                  </div>
                )}
              </div>
            </div>

            {/* ── Center Column: Info & Actions ── */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-black bg-white px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
                    {productTypeLabel}
                  </span>
                  {item.tags?.map((t) => (
                    <span
                      key={t.tagId}
                      className="border border-black bg-primary/20 px-2 py-0.5 text-[10px] font-black uppercase text-black"
                    >
                      #{t.name}
                    </span>
                  ))}
                </div>

                <h1 className="mt-3 text-2xl font-black uppercase leading-tight tracking-tight text-black sm:text-3xl">
                  {item.name}
                </h1>

                <p className="mt-1 text-xs font-bold uppercase text-text-muted">
                  Sản phẩm chính hãng Mirage Ecosystem
                </p>

                <div className="mt-4 border-b-2 border-dashed border-gray-300 pb-4">
                  <span className="block text-xs font-bold uppercase text-text-muted">Giá niêm yết</span>
                  <strong className="text-3xl font-black text-primary-ink">
                    {formatPrice(item.price)}
                  </strong>
                </div>

                <p className="mt-4 text-sm font-medium leading-relaxed text-text-muted">
                  {item.description || "Chưa có mô tả chi tiết cho sản phẩm này."}
                </p>

                {/* Quantity selector (physical products only) */}
                {!isDigital && (
                  <div className="mt-5">
                    <label className="mb-2 block text-xs font-black uppercase text-black">
                      Số lượng
                    </label>
                    <div className="flex h-10 w-fit items-center border-2 border-black bg-white shadow-[2px_2px_0_0_#000]">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="cursor-pointer disabled:cursor-not-allowed flex h-full w-10 items-center justify-center border-r-2 border-black font-black hover:bg-gray-100 active:bg-gray-200 disabled:opacity-40"
                        aria-label="Giảm số lượng"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="grid w-14 place-items-center text-sm font-black text-black">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(quantity + 1)}
                        className="cursor-pointer flex h-full w-10 items-center justify-center border-l-2 border-black font-black hover:bg-gray-100 active:bg-gray-200"
                        aria-label="Tăng số lượng"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Purchase Buttons */}
              <div className="mt-6 border-t-2 border-black pt-5">
                {isOwned ? (
                  <div className="neo-box-no-hover border-amber-600 bg-amber-50 p-4 text-center">
                    <p className="font-black uppercase text-amber-900">
                      Bạn đã sở hữu sản phẩm này!
                    </p>
                    <Link
                      href="/profile/gallery"
                      className="btn-primary mt-3 inline-block w-full py-2.5 text-center text-xs font-black uppercase"
                    >
                      Mở Thư viện nhân vật
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={add}
                      disabled={isSubmitting}
                      className="btn-secondary flex flex-1 items-center justify-center gap-2 py-3.5 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
                    >
                      <ShoppingCart size={18} className="shrink-0" aria-hidden />
                      <span>{added || isAlreadyInCart ? "Đã thêm · Thêm tiếp" : "Thêm vào giỏ hàng"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      disabled={isSubmitting}
                      className="btn-primary flex flex-1 items-center justify-center gap-2 py-3.5 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
                    >
                      <Zap size={16} />
                      <span>Mua ngay</span>
                    </button>
                  </div>
                )}

                {actionError && (
                  <p role="alert" className="mt-3 border-2 border-red-600 bg-red-50 p-2.5 text-xs font-bold text-red-700">
                    {actionError}
                  </p>
                )}

                {!authLoading && !isAuthenticated && (
                  <p className="mt-3 text-center text-xs font-bold text-text-muted">
                    Vui lòng{" "}
                    <Link
                      href={`/login?returnUrl=${encodeURIComponent(`/products/${params.productId}`)}`}
                      className="cursor-pointer text-primary-ink underline font-black"
                    >
                      đăng nhập
                    </Link>{" "}
                    để thêm vào giỏ hàng hoặc mua ngay.
                  </p>
                )}
              </div>
            </div>

            {/* ── Right Column: Guarantees & Compatibility ── */}
            <aside className="neo-box-no-hover h-fit bg-white p-5">
              <h2 className="mb-4 flex items-center gap-2 border-b-2 border-black pb-3 text-xs font-black uppercase tracking-wider text-black">
                <Monitor size={16} className="text-primary-ink" /> Tương thích thiết bị
              </h2>
              <p className="text-xs font-medium leading-relaxed text-text-muted">
                Hoạt động đồng bộ 100% trên hệ sinh thái bảng LED và ứng dụng điều khiển Mirage.
              </p>
              <ul className="mt-4 space-y-2.5 text-xs font-bold text-text-main">
                {[
                  "Bảng LED Mirage Matrix 32×32",
                  "Bảng LED Mirage Panorama 64×32",
                  "Điều khiển đồng bộ qua App Mirage Mobile",
                ].map((device) => (
                  <li key={device} className="flex items-center gap-2">
                    <Check size={14} className="text-primary-ink shrink-0" />
                    <span>{device}</span>
                  </li>
                ))}
              </ul>

              <hr className="my-5 border-t-2 border-black" />

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <Download size={16} className="mt-0.5 text-primary-ink shrink-0" />
                  <div>
                    <strong className="block font-black uppercase">Đồng bộ OTA tức thì</strong>
                    <span className="text-text-muted">Tải ảnh động về thiết bị trong tích tắc.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Sparkles size={16} className="mt-0.5 text-primary-ink shrink-0" />
                  <div>
                    <strong className="block font-black uppercase">Bản quyền trọn đời</strong>
                    <span className="text-text-muted">Sử dụng vĩnh viễn trên tài khoản Mirage.</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          {/* ── Specifications Section ── */}
          <section className="neo-box-no-hover mt-8 bg-white p-6">
            <h2 className="mb-4 flex items-center gap-2 border-b-2 border-black pb-3 text-sm font-black uppercase tracking-wider text-black">
              <Sparkles size={18} className="text-primary-ink" /> Thông số kỹ thuật &amp; Chi tiết
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-black uppercase text-black mb-2">Giới thiệu sản phẩm</p>
                <p className="text-xs font-medium leading-relaxed text-text-muted">
                  {item.description || "Sản phẩm được tối ưu cho hệ thống LED ma trận gắn kính xe hoặc trang trí bàn làm việc."}
                </p>
              </div>
              <div>
                <p className="text-xs font-black uppercase text-black mb-2">Thông số chi tiết</p>
                <dl className="divide-y-2 divide-dashed divide-gray-200 border-2 border-black text-xs">
                  {specifications.map(([label, value]) => (
                    <div key={label} className="grid grid-cols-2 gap-3 p-2.5">
                      <dt className="font-bold text-text-muted uppercase">{label}</dt>
                      <dd className="font-black text-black text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </section>

          {/* ── Related Products ── */}
          {relatedProducts.length > 0 && (
            <section className="mt-10">
              <div className="mb-4 flex items-center justify-between border-b-2 border-black pb-3">
                <h2 className="text-base font-black uppercase tracking-wider text-black">
                  Sản phẩm tương tự
                </h2>
                <Link href="/" className="cursor-pointer text-xs font-black uppercase text-primary-ink hover:underline">
                  Xem tất cả ›
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {relatedProducts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.id}`}
                    className="cursor-pointer neo-box group flex flex-col justify-between overflow-hidden bg-white p-3 transition-transform hover:-translate-y-0.5"
                  >
                    <div className="relative aspect-square border-2 border-black bg-gray-50 flex items-center justify-center overflow-hidden">
                      {p.previewUrl ? (
                        <Image
                          src={p.previewUrl}
                          alt={p.name}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-contain p-2 [image-rendering:pixelated]"
                        />
                      ) : (
                        <Monitor size={32} className="text-primary-ink/60" />
                      )}
                    </div>
                    <div className="mt-2.5">
                      <p className="truncate text-xs font-black uppercase text-black group-hover:text-primary-ink">
                        {p.name}
                      </p>
                      <p className="mt-1 text-xs font-black text-primary-ink">
                        {formatPrice(p.price)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
