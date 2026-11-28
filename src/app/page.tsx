"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Crown,
  Monitor,
  PawPrint,
  Sparkles,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import type { CatalogProduct } from "@/features/cart/catalog";
import { useCart } from "@/features/cart/context/CartContext";
import { useGallery } from "@/features/character/context/GalleryContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getRoleHomePath } from "@/features/auth/services/auth.service";
import { getApiErrorMessage } from "@/lib/api/auth";
import { fetchStoreProducts } from "@/lib/api/products";
import { formatPrice } from "@/lib/currency";
import {
  ProductCard,
  StoreCartToast,
  isProductOwned,
} from "@/features/storefront/components/ProductCard";

const HERO_SLIDE_DURATION_MS = 3000;

const HERO_SLIDES = [
  {
    id: "lumintra",
    tag: "LED MATRIX & PIXEL ART",
    title: "Biểu cảm Pixel sống động trên xe của bạn",
    desc: "Bảng LED ma trận gắn kính xe, thư viện nhân vật động và thiết kế độc bản theo yêu cầu.",
    fallbackImage: "/images/products/characters/mirage-cat.png",
    href: "/products",
  },
  {
    id: "led",
    tag: "THIẾT BỊ LED MA TRẬN",
    title: "Sắc nét cả ngày lẫn đêm",
    desc: "Khung LED mỏng nhẹ gắn kính xe gọn gàng, hiển thị chuẩn màu và đồng bộ 1 chạm.",
    fallbackImage: "/images/products/led/matrix-64.png",
    href: "/products?type=LED_MODEL",
  },
  {
    id: "commission",
    tag: "THIẾT KẾ RIÊNG 1-1",
    title: "Nhân vật độc quyền theo ý tưởng của bạn",
    desc: "Làm việc trực tiếp cùng họa sĩ Lumintra để tạo hoạt ảnh chuẩn khớp khổ LED bạn chọn.",
    fallbackImage: "/images/products/characters/cyber-fox.png",
    href: "/commission/new",
  },
] as const;

const MVP_PILLARS = [
  {
    title: "Bảng LED Ma Trận",
    desc: "Gắn kính xe gọn nhẹ, hiển thị sắc nét ngày và đêm.",
    cta: "Xem thiết bị",
    href: "/products?type=LED_MODEL",
    Icon: Monitor,
  },
  {
    title: "Thư Viện Nhân Vật",
    desc: "Hoạt ảnh Pixel Art bản quyền, đồng bộ 1 chạm lên LED.",
    cta: "Xem nhân vật",
    href: "/products?type=CHARACTER",
    Icon: PawPrint,
  },
  {
    title: "Thiết Kế Riêng",
    desc: "Đặt vẽ nhân vật độc bản 1-1 theo đúng ý tưởng của bạn.",
    cta: "Tạo yêu cầu",
    href: "/commission/new",
    Icon: Sparkles,
  },
] as const;

function pickFeaturedProducts(products: CatalogProduct[]): CatalogProduct[] {
  const picked: CatalogProduct[] = [];
  const usedIds = new Set<string>();

  const pickFirst = (predicate: (p: CatalogProduct) => boolean) => {
    const found = products.find((p) => !usedIds.has(String(p.id)) && predicate(p));
    if (found) {
      usedIds.add(String(found.id));
      picked.push(found);
    }
  };

  pickFirst((p) => p.productType === "LED_MODEL");
  pickFirst((p) => p.productType === "BUNDLE");
  pickFirst((p) => p.productType === "CHARACTER");
  pickFirst((p) => p.productType === "CHARACTER");

  for (const product of products) {
    if (picked.length >= 4) break;
    if (!usedIds.has(String(product.id))) {
      usedIds.add(String(product.id));
      picked.push(product);
    }
  }

  return picked;
}

function HeroShowcase({
  products,
  loading,
}: {
  products: CatalogProduct[];
  loading: boolean;
}) {
  const [current, setCurrent] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});

  const remainingMsRef = useRef(HERO_SLIDE_DURATION_MS);
  const startedAtRef = useRef<number | null>(null);
  const lastCycleKeyRef = useRef(0);

  useEffect(() => {
    if (typeof document !== "undefined") {
      setIsTabHidden(document.hidden);
      const handleVisibilityChange = () => setIsTabHidden(document.hidden);
      document.addEventListener("visibilitychange", handleVisibilityChange);

      if (typeof window !== "undefined") {
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        setPrefersReducedMotion(mediaQuery.matches);
        const handleMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
        mediaQuery.addEventListener("change", handleMotionChange);
        return () => {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
          mediaQuery.removeEventListener("change", handleMotionChange);
        };
      }

      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }
  }, []);

  const isPaused = loading || isHovered || isFocused || isTabHidden || prefersReducedMotion;

  useEffect(() => {
    if (lastCycleKeyRef.current !== cycleKey) {
      lastCycleKeyRef.current = cycleKey;
      remainingMsRef.current = HERO_SLIDE_DURATION_MS;
    }

    if (isPaused) {
      startedAtRef.current = null;
      return;
    }

    const delay = Math.max(remainingMsRef.current, 0);
    startedAtRef.current = Date.now();
    const timer = window.setTimeout(() => {
      remainingMsRef.current = HERO_SLIDE_DURATION_MS;
      setCurrent((prev) => (prev + 1) % HERO_SLIDES.length);
      setCycleKey((prev) => prev + 1);
    }, delay);

    return () => {
      window.clearTimeout(timer);
      if (startedAtRef.current !== null) {
        const elapsed = Date.now() - startedAtRef.current;
        remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed);
        startedAtRef.current = null;
      }
    };
  }, [isPaused, cycleKey]);

  const goToSlide = useCallback((index: number) => {
    setCurrent(index);
    setCycleKey((prev) => prev + 1);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
    setCycleKey((prev) => prev + 1);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % HERO_SLIDES.length);
    setCycleKey((prev) => prev + 1);
  }, []);

  const firstLed = products.find((p) => p.productType === "LED_MODEL" && p.previewUrl);
  const firstCharacter = products.find((p) => p.productType === "CHARACTER" && p.previewUrl);
  const firstBundle = products.find((p) => p.productType === "BUNDLE" && p.previewUrl);

  const slideVisuals: Record<string, { product?: CatalogProduct; src: string | null; alt: string }> = {
    lumintra: {
      product: firstBundle ?? firstCharacter,
      src: firstBundle?.previewUrl || firstCharacter?.previewUrl || null,
      alt: firstBundle?.name || firstCharacter?.name || HERO_SLIDES[0].title,
    },
    led: {
      product: firstLed,
      src: firstLed?.previewUrl || null,
      alt: firstLed?.name || HERO_SLIDES[1].title,
    },
    commission: {
      product: firstCharacter,
      src: firstCharacter?.previewUrl || null,
      alt: firstCharacter?.name || HERO_SLIDES[2].title,
    },
  };

  const slide = HERO_SLIDES[current];
  const visual = slideVisuals[slide.id] ?? { src: null, alt: slide.title };
  const activeImageSrc = loading
    ? null
    : visual?.src && !failedUrls[visual.src]
      ? visual.src
      : slide.fallbackImage;
  const showIconFallback = !loading && Boolean(activeImageSrc && failedUrls[activeImageSrc]);

  return (
    <section
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={(e) => {
        if (e.target instanceof HTMLElement && e.target.matches(":focus-visible")) {
          setIsFocused(true);
        }
      }}
      onBlurCapture={(e) => {
        const nextFocused = e.relatedTarget;
        if (!(nextFocused instanceof Node) || !e.currentTarget.contains(nextFocused)) {
          setIsFocused(false);
        }
      }}
      className="relative overflow-hidden border-b-2 border-black bg-background text-text-main"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(137,200,155,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(137,200,155,0.2) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }}
      aria-roledescription="carousel"
      aria-label="Giới thiệu nổi bật Lumintra"
    >
      <div className="mx-auto flex min-h-[calc(100svh-120px)] w-full max-w-[1280px] flex-col justify-between px-4 py-12 lg:px-8 lg:py-16">
        <div className="grid flex-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Left: Clear Hero Value Prop + 2 Primary Paths */}
          <div className="cursor-default space-y-6 lg:col-span-7">
            <div key={`${slide.id}-${cycleKey}`} className="hero-slide-enter space-y-6">
              <span className="inline-block border-2 border-black bg-primary px-3 py-1 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_0_#000]">
                {slide.tag}
              </span>

              <h1 className="select-none text-4xl font-black uppercase leading-[1.06] tracking-tight text-black sm:text-5xl lg:text-6xl">
                {slide.title}
              </h1>

              <p className="max-w-lg text-base font-medium leading-relaxed text-text-muted">
                {slide.desc}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/products"
                className="btn-primary inline-flex min-h-12 items-center gap-2 border-2 border-black px-6 py-3 text-xs font-black uppercase shadow-[4px_4px_0_0_#000]"
              >
                <span>Khám phá cửa hàng</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/commission/new"
                className="btn-secondary inline-flex min-h-12 items-center gap-2 border-2 border-black px-6 py-3 text-xs font-black uppercase shadow-[4px_4px_0_0_#000]"
              >
                <Sparkles size={15} className="text-primary-ink" />
                <span>Đặt thiết kế riêng</span>
              </Link>
            </div>
          </div>

          {/* Right: Clean Flagship Product Visual */}
          <div className="flex justify-center lg:col-span-5 lg:justify-end">
            <div className="w-full max-w-[360px] border-2 border-black bg-white p-4 shadow-[8px_8px_0_0_#000]">
              <div key={`${slide.id}-${cycleKey}`} className="hero-slide-enter">
                <div className="relative aspect-square w-full overflow-hidden border-2 border-black bg-gray-50">
                  {loading || !activeImageSrc ? (
                    <div
                      className="h-full w-full animate-pulse bg-gray-100"
                      aria-label="Đang tải hình ảnh sản phẩm"
                    />
                  ) : showIconFallback ? (
                    <div className="grid h-full w-full place-items-center bg-gray-50">
                      <Monitor size={64} strokeWidth={1.5} className="text-primary-ink" aria-hidden="true" />
                    </div>
                  ) : (
                    <Image
                      src={activeImageSrc}
                      alt={visual.alt}
                      fill
                      sizes="(max-width: 1024px) 320px, 360px"
                      className="object-contain p-4 [image-rendering:pixelated]"
                      onError={() => setFailedUrls((prev) => ({ ...prev, [activeImageSrc]: true }))}
                    />
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 pt-1">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black uppercase text-black">
                      {visual.product?.name ?? slide.tag}
                    </p>
                    <p className="text-xs font-black tabular-nums text-primary-ink">
                      {visual.product ? formatPrice(visual.product.price) : "Hàng có sẵn"}
                    </p>
                  </div>
                  <Link
                    href={visual.product ? `/products/${visual.product.id}` : slide.href}
                    className="btn-primary shrink-0 px-3 py-1.5 text-[11px] font-black uppercase shadow-[2px_2px_0_0_#000]"
                  >
                    Xem ngay
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Minimal Slide Switcher */}
        <div className="mt-10 flex items-center justify-between gap-4 border-t-2 border-black pt-5">
          <div className="flex items-center gap-2">
            {HERO_SLIDES.map((s, index) => {
              const isActive = index === current;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToSlide(index)}
                  aria-label={`Chuyển tới ${s.tag}`}
                  aria-pressed={isActive}
                  className={`relative h-3 cursor-pointer overflow-hidden border-2 border-black transition-all ${
                    isActive
                      ? "w-12 bg-white shadow-[2px_2px_0_0_#000]"
                      : "w-3 bg-white hover:bg-gray-100"
                  }`}
                >
                  {isActive &&
                    (prefersReducedMotion ? (
                      <span className="absolute inset-0 block bg-primary" />
                    ) : (
                      <span
                        key={cycleKey}
                        className="hero-dot-progress absolute inset-0 block bg-primary"
                        style={{
                          animationDuration: `${HERO_SLIDE_DURATION_MS}ms`,
                          animationPlayState: isPaused ? "paused" : "running",
                        }}
                      />
                    ))}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Slide trước"
              className="grid h-10 w-10 cursor-pointer place-items-center border-2 border-black bg-white text-black shadow-[2px_2px_0_0_#000] transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Slide tiếp theo"
              className="grid h-10 w-10 cursor-pointer place-items-center border-2 border-black bg-white text-black shadow-[2px_2px_0_0_#000] transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { items: cartItems, addItem } = useCart();
  const { ownedCharacters, activeSubscription } = useGallery();
  const { user, isAuthenticated, isLoading } = useAuth();
  const isInternalUser = isAuthenticated && Boolean(user?.role) && user?.role !== "CUSTOMER";

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [toastNotice, setToastNotice] = useState<{ title: string; desc: string } | null>(null);

  useEffect(() => {
    if (!isLoading && isInternalUser) {
      router.replace(getRoleHomePath(user?.role));
    }
  }, [isInternalUser, isLoading, router, user?.role]);

  useEffect(() => {
    if (isLoading || isInternalUser) return;
    let cancelled = false;
    setLoadingProducts(true);
    fetchStoreProducts({ page: 0, size: 40 })
      .then((res) => {
        if (!cancelled) setProducts(res.items);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isInternalUser, isLoading]);

  const featuredProducts = useMemo(() => pickFeaturedProducts(products), [products]);

  const addProduct = async (product: CatalogProduct) => {
    try {
      await addItem(product);
      setToastNotice({
        title: "Đã thêm vào giỏ hàng",
        desc: product.name,
      });
    } catch (err) {
      setToastNotice({
        title: "Không thể thêm",
        desc: getApiErrorMessage(err, "Vui lòng thử lại."),
      });
    }
    window.setTimeout(() => setToastNotice(null), 3500);
  };

  if (isInternalUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-sm font-bold uppercase text-text-muted">
        Đang chuyển đến khu vực làm việc...
      </main>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-background text-text-main">
        {/* 1. Spacious Hero */}
        <HeroShowcase products={products} loading={loadingProducts} />

        {/* 2. Three Core MVP Pillars */}
        <section aria-labelledby="mvp-pillars-heading" className="border-b-2 border-black bg-white py-14">
          <div className="mx-auto w-full max-w-[1280px] px-4 lg:px-8">
            <h2 id="mvp-pillars-heading" className="sr-only">
              Giá trị cốt lõi Lumintra
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {MVP_PILLARS.map(({ title, desc, cta, href, Icon }) => (
                <Link
                  key={title}
                  href={href}
                  className="neo-box group flex flex-col justify-between bg-background p-6"
                >
                  <div>
                    <span className="inline-grid h-11 w-11 place-items-center border-2 border-black bg-primary text-black shadow-[2px_2px_0_0_#000]">
                      <Icon size={20} />
                    </span>
                    <h3 className="mt-4 text-lg font-black uppercase text-black group-hover:text-primary-ink">
                      {title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{desc}</p>
                  </div>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-black uppercase text-primary-ink">
                    {cta}
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Flagship Products (Max 4) */}
        <section aria-labelledby="featured-products-heading" className="border-b-2 border-black bg-background py-14">
          <div className="mx-auto w-full max-w-[1280px] px-4 lg:px-8">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <h2 id="featured-products-heading" className="text-2xl font-black uppercase tracking-tight text-black sm:text-3xl">
                Sản phẩm nổi bật
              </h2>
              <Link
                href="/products"
                className="btn-secondary inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase"
              >
                <span>Xem tất cả sản phẩm</span>
                <ArrowRight size={15} />
              </Link>
            </div>

            {loadingProducts ? (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="neo-box-no-hover h-72 animate-pulse bg-gray-100 p-4"
                    aria-label="Đang tải sản phẩm nổi bật"
                  />
                ))}
              </div>
            ) : featuredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {featuredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={addProduct}
                    canBuy={isAuthenticated}
                    isOwned={isProductOwned(product, ownedCharacters, activeSubscription)}
                    isAlreadyInCart={cartItems.some((item) => item.id === String(product.id))}
                  />
                ))}
              </div>
            ) : (
              <div className="neo-box-no-hover bg-white p-10 text-center">
                <Link href="/products" className="btn-primary inline-flex items-center gap-2 text-xs font-black uppercase">
                  <span>Đi tới cửa hàng</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* 4. Compact Final Conversion Row (Commission + Membership) */}
        <section aria-label="Dịch vụ mở rộng" className="bg-white py-14">
          <div className="mx-auto grid w-full max-w-[1280px] gap-6 px-4 md:grid-cols-2 lg:px-8">
            <div className="neo-box-no-hover flex flex-col justify-between bg-background p-7">
              <div>
                <Sparkles size={24} className="text-primary-ink" />
                <h2 className="mt-3 text-xl font-black uppercase text-black">
                  Đặt thiết kế Pixel Art riêng
                </h2>
                <p className="mt-1.5 text-sm text-text-muted">
                  Gửi ý tưởng của bạn để họa sĩ vẽ nhân vật độc bản tương thích đúng khổ LED.
                </p>
              </div>
              <div className="mt-6">
                <Link
                  href="/commission/new"
                  className="btn-primary inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase"
                >
                  <span>Bắt đầu thiết kế riêng</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>

            <div className="neo-box-no-hover flex flex-col justify-between bg-primary p-7 text-black">
              <div>
                <Crown size={24} className="text-black" />
                <h2 className="mt-3 text-xl font-black uppercase text-black">
                  Gói hội viên All-Access
                </h2>
                <p className="mt-1.5 text-sm font-medium text-black/85">
                  Mở khóa toàn bộ thư viện nhân vật đang mở bán trên Lumintra chỉ với một gói.
                </p>
              </div>
              <div className="mt-6">
                <Link
                  href="/subscriptions"
                  className="btn-secondary inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase"
                >
                  <span>Xem gói hội viên</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <StoreCartToast notice={toastNotice} />
      </main>
      <Footer />
    </>
  );
}
