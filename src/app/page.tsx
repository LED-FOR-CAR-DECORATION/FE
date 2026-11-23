"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useTransition } from "react";
import {
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  Monitor,
  PawPrint,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import type { CatalogProduct } from "@/features/cart/catalog";
import type { ProductType } from "@/features/cart/types";
import { useCart } from "@/features/cart/context/CartContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getRoleHomePath } from "@/features/auth/services/auth.service";
import { getApiErrorMessage } from "@/lib/api/auth";
import { fetchStoreProducts } from "@/lib/api/products";
import { formatPrice } from "@/lib/currency";

const PRODUCTS_PER_PAGE = 12;
const ALL_PRODUCT_TYPES: ProductType[] = ["LED_MODEL", "CHARACTER", "BUNDLE", "SUBSCRIPTION"];

const HERO_SLIDES = [
  {
    id: "mirage",
    tag: "BỘ SƯU TẬP MIRAGE",
    title: "Nhân vật Pixel cho không gian xe của bạn",
    desc: "Khám phá bộ sưu tập Character và thiết bị LED matrix để tạo nên phong cách độc bản, sống động trên mọi cung đường.",
    badgeBg: "bg-primary",
    accentBg: "bg-primary/20",
    emoji: "🐱",
    stat: "100% ĐỒNG BỘ",
  },
  {
    id: "led",
    tag: "BẢNG LED MATRIX",
    title: "Bảng LED hiển thị sắc nét mọi góc nhìn",
    desc: "Kích thước 32x32 và 64x32 chuẩn chống nước, gắn kính xe dễ dàng, điều khiển animation mượt mà chỉ với một chạm.",
    badgeBg: "bg-white",
    accentBg: "bg-[#6eb782]/20",
    emoji: "⚡",
    stat: "ĐỘ SÁNG CAO",
  },
  {
    id: "commission",
    tag: "THIẾT KẾ THEO YÊU CẦU",
    title: "Hiện thực hóa ý tưởng Pixel Art độc quyền",
    desc: "Làm việc trực tiếp cùng Designer chuyên nghiệp để tạo ra nhân vật pixel độc bản theo đúng ý tưởng và mẫu xe của bạn.",
    badgeBg: "bg-primary",
    accentBg: "bg-amber-100",
    emoji: "✨",
    stat: "CHUYÊN NGHIỆP",
  },
];

/* ── Hero Slider (Neo-brutalism Carousel) ── */
function HeroSlider({ onExplore }: { onExplore: () => void }) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const slide = HERO_SLIDES[current];

  return (
    <section
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="neo-box-no-hover relative mb-6 overflow-hidden bg-white p-6 sm:p-8 lg:p-10"
      aria-roledescription="carousel"
      aria-label="Khuyến mãi nổi bật"
    >
      <div className="flex flex-col-reverse justify-between gap-6 md:flex-row md:items-center">
        {/* Content */}
        <div className="relative z-10 max-w-xl">
          <div className="mb-3 flex items-center gap-2">
            <span className={`border-2 border-black ${slide.badgeBg} px-3 py-1 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_0_#000]`}>
              {slide.tag}
            </span>
            <span className="hidden border border-black bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider sm:inline-block">
              {slide.stat}
            </span>
          </div>

          <h1 className="text-2xl font-black uppercase leading-tight tracking-tight text-black sm:text-3xl lg:text-4xl">
            {slide.title}
          </h1>

          <p className="mt-3 text-sm font-medium leading-relaxed text-text-muted">
            {slide.desc}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onExplore}
              className="btn-primary flex items-center gap-2 px-5 py-3 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
            >
              <span>Khám phá sản phẩm</span>
            </button>
            <Link
              href="/commission"
              className="btn-secondary flex items-center gap-2 px-5 py-3 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
            >
              <Sparkles size={14} className="text-primary-ink" />
              <span>Yêu cầu thiết kế</span>
            </Link>
          </div>
        </div>

        {/* Visual Card */}
        <div className="flex shrink-0 items-center justify-center">
          <div className={`relative flex h-36 w-36 items-center justify-center border-2 border-black ${slide.accentBg} shadow-[4px_4px_0_0_#000] sm:h-44 sm:w-44 lg:h-52 lg:w-52`}>
            <span className="text-6xl select-none sm:text-7xl lg:text-8xl" aria-hidden="true">
              {slide.emoji}
            </span>
            <div className="absolute -bottom-2 -right-2 border border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase shadow-[1px_1px_0_0_#000]">
              {slide.id.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Slider Controls */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t-2 border-black pt-4">
        {/* Indicators */}
        <div className="flex items-center gap-2">
          {HERO_SLIDES.map((s, index) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrent(index)}
              className={`cursor-pointer h-3 border-2 border-black transition-all ${
                index === current
                  ? "w-8 bg-black shadow-[1px_1px_0_0_#000]"
                  : "w-3 bg-white hover:bg-gray-200"
              }`}
              aria-label={`Chuyển tới slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Next / Prev buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrent((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
            className="cursor-pointer border-2 border-black bg-white p-1.5 text-black shadow-[2px_2px_0_0_#000] transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            aria-label="Slide trước"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="px-2 text-xs font-black">
            0{current + 1} / 0{HERO_SLIDES.length}
          </span>
          <button
            type="button"
            onClick={() => setCurrent((prev) => (prev + 1) % HERO_SLIDES.length)}
            className="cursor-pointer border-2 border-black bg-white p-1.5 text-black shadow-[2px_2px_0_0_#000] transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            aria-label="Slide tiếp theo"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── Product Artwork ── */
function ProductArtwork({ product }: { product: CatalogProduct }) {
  const [imgError, setImgError] = useState(false);

  if (product.previewUrl && !imgError) {
    return (
      <Image
        src={product.previewUrl}
        alt={product.name}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className="object-contain p-3 [image-rendering:pixelated]"
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

/* ── Product Card (Neo-brutalism) ── */
function ProductCard({
  product,
  onAdd,
  canBuy,
}: {
  product: CatalogProduct;
  onAdd: (product: CatalogProduct) => void;
  canBuy: boolean;
}) {
  const isCharacter = product.productType === "CHARACTER";
  const isBundle = product.productType === "BUNDLE";
  const isSubscription = product.productType === "SUBSCRIPTION";
  const typeLabel = isSubscription
    ? "Gói thành viên"
    : isBundle
      ? "Gói Combo"
      : isCharacter
        ? "Nhân vật"
        : "Thiết bị LED";

  return (
    <article className="neo-box group relative flex flex-col justify-between overflow-hidden bg-white transition-all">
      <Link href={`/products/${product.id}`} className="cursor-pointer flex flex-1 flex-col">
        {/* Image Area */}
        <div className="relative aspect-square border-b-2 border-black bg-gray-50 overflow-hidden">
          <ProductArtwork product={product} />
          <span className="absolute left-2.5 top-2.5 border border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
            {typeLabel}
          </span>
        </div>

        {/* Details */}
        <div className="flex flex-1 flex-col justify-between p-3.5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              {typeLabel}
            </p>
            <h2 className="mt-1 min-h-10 text-sm font-black uppercase leading-snug text-black transition-colors group-hover:text-primary-ink line-clamp-2">
              {product.name}
            </h2>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t-2 border-dashed border-gray-200 pr-12 pt-3">
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
        disabled={!canBuy}
        title={canBuy ? undefined : "Vui lòng đăng nhập để thêm vào giỏ hàng"}
        onClick={() => onAdd(product)}
        className="btn-primary absolute bottom-3.5 right-3.5 grid size-9 place-items-center p-0! shadow-[2px_2px_0_0_#000]"
        aria-label={`Thêm ${product.name} vào giỏ hàng`}
      >
        <ShoppingCart size={18} className="shrink-0" aria-hidden />
      </button>
    </article>
  );
}

/* ── Home Content Component ── */
function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSearchQuery = searchParams.get("search")?.trim() ?? "";

  const { addItem } = useCart();
  const { user, isAuthenticated, isLoading } = useAuth();
  const isInternalUser = isAuthenticated && Boolean(user?.role) && user?.role !== "CUSTOMER";

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [activeCategory, setActiveCategory] = useState<"all" | ProductType>("all");
  const [sort, setSort] = useState("Phổ biến");
  const [toastNotice, setToastNotice] = useState<{ title: string; desc: string } | null>(null);

  const [selectedTypes, setSelectedTypes] = useState<ProductType[]>(ALL_PRODUCT_TYPES);
  const [selectedStatuses, setSelectedStatuses] = useState<("IN_STOCK" | "OUT_OF_STOCK")[]>([
    "IN_STOCK",
  ]);
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [priceError, setPriceError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isLoading && isInternalUser) {
      router.replace(getRoleHomePath(user?.role));
    }
  }, [isInternalUser, isLoading, router, user?.role]);

  useEffect(() => {
    if (isLoading || isInternalUser) return;
    let cancelled = false;
    setLoadingProducts(true);
    fetchStoreProducts({ page: 0, size: 100 })
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

  const toggleType = (type: ProductType) => {
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((v) => v !== type) : [...current, type],
    );
  };

  const toggleStatus = (status: "IN_STOCK" | "OUT_OF_STOCK") => {
    setSelectedStatuses((current) =>
      current.includes(status) ? current.filter((v) => v !== status) : [...current, status],
    );
  };

  const applyPriceFilter = () => {
    const nextMin = minPriceInput === "" ? null : Number(minPriceInput);
    const nextMax = maxPriceInput === "" ? null : Number(maxPriceInput);
    if (
      (nextMin !== null && (!Number.isFinite(nextMin) || nextMin < 0)) ||
      (nextMax !== null && (!Number.isFinite(nextMax) || nextMax < 0)) ||
      (nextMin !== null && nextMax !== null && nextMin > nextMax)
    ) {
      setPriceError("Vui lòng nhập khoảng giá hợp lệ.");
      return;
    }
    setPriceError("");
    setMinPrice(nextMin);
    setMaxPrice(nextMax);
  };

  const clearFilters = () => {
    setActiveCategory("all");
    setSelectedTypes(ALL_PRODUCT_TYPES);
    setSelectedStatuses(["IN_STOCK"]);
    setMinPriceInput("");
    setMaxPriceInput("");
    setMinPrice(null);
    setMaxPrice(null);
    setPriceError("");
    if (activeSearchQuery) {
      router.push("/");
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !activeSearchQuery ||
      product.name.toLowerCase().includes(activeSearchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(activeSearchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || product.productType === activeCategory;
    const matchesType = selectedTypes.includes(product.productType);
    const isInStock = true;
    const matchesStatus =
      (isInStock && selectedStatuses.includes("IN_STOCK")) ||
      (!isInStock && selectedStatuses.includes("OUT_OF_STOCK"));
    const matchesMinPrice = minPrice === null || product.price >= minPrice;
    const matchesMaxPrice = maxPrice === null || product.price <= maxPrice;
    return (
      matchesSearch &&
      matchesCategory &&
      matchesType &&
      matchesStatus &&
      matchesMinPrice &&
      matchesMaxPrice
    );
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sort === "Giá thấp") return a.price - b.price;
    if (sort === "Giá cao") return b.price - a.price;
    return 0;
  });

  const pageCount = Math.max(1, Math.ceil(sortedProducts.length / PRODUCTS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE,
  );

  useEffect(() => {
    setPage(1);
  }, [activeCategory, maxPrice, minPrice, selectedStatuses, selectedTypes, sort, activeSearchQuery]);

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
      <main className="flex-1 bg-background py-8 text-text-main">
        <div className="mx-auto w-full max-w-[1320px] px-4 lg:px-8">

          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
            <Link href="/" className="cursor-pointer hover:text-primary-ink hover:underline">
              Trang chủ
            </Link>
            <span>›</span>
            <span className="text-black">Cửa hàng sản phẩm</span>
            {activeSearchQuery && (
              <>
                <span>›</span>
                <span className="flex items-center gap-1 border border-black bg-primary px-2 py-0.5 text-[10px] font-black text-black">
                  Tìm: &ldquo;{activeSearchQuery}&rdquo;
                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="cursor-pointer ml-1 text-black hover:text-red-700"
                    aria-label="Hủy tìm kiếm"
                  >
                    <X size={12} />
                  </button>
                </span>
              </>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">

            {/* ── Sidebar (Filter & Categories) ── */}
            <aside className="neo-box-no-hover h-fit bg-white p-5 lg:sticky lg:top-24">
              {/* Category section */}
              <div className="mb-6">
                <h2 className="mb-4 flex items-center gap-2 border-b-2 border-black pb-3 text-xs font-black uppercase tracking-wider text-black">
                  <Grid2X2 size={16} className="text-primary-ink" /> Danh mục
                </h2>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: "Tất cả sản phẩm", count: products.length, value: "all" as const },
                    {
                      label: "Thiết bị LED",
                      count: products.filter((p) => p.productType === "LED_MODEL").length,
                      value: "LED_MODEL" as const,
                    },
                    {
                      label: "Nhân vật Pixel",
                      count: products.filter((p) => p.productType === "CHARACTER").length,
                      value: "CHARACTER" as const,
                    },
                    {
                      label: "Gói Combo",
                      count: products.filter((p) => p.productType === "BUNDLE").length,
                      value: "BUNDLE" as const,
                    },
                  ].map((category) => {
                    const isActive = activeCategory === category.value;
                    return (
                      <button
                        key={category.value}
                        type="button"
                        onClick={() => {
                          setActiveCategory(category.value);
                          if (category.value === "all") setSelectedTypes(ALL_PRODUCT_TYPES);
                          else setSelectedTypes([category.value]);
                        }}
                        className={`cursor-pointer flex w-full items-center justify-between border-2 p-2.5 text-xs font-bold uppercase transition-all ${
                          isActive
                            ? "border-black bg-primary text-black shadow-[2px_2px_0_0_#000]"
                            : "border-transparent text-text-main hover:border-black hover:bg-gray-50"
                        }`}
                      >
                        <span className="truncate">{category.label}</span>
                        <span
                          className={`ml-2 px-1.5 py-0.5 text-[10px] font-black ${
                            isActive
                              ? "border border-black bg-white text-black"
                              : "border border-gray-200 bg-gray-100 text-text-muted"
                          }`}
                        >
                          {category.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <hr className="my-5 border-t-2 border-black" />

              {/* Filters section */}
              <div>
                <h2 className="mb-4 flex items-center gap-2 border-b-2 border-black pb-3 text-xs font-black uppercase tracking-wider text-black">
                  <SlidersHorizontal size={16} className="text-primary-ink" /> Bộ lọc
                </h2>

                {/* Price range */}
                <p className="mb-2 text-xs font-bold uppercase text-text-main">Khoảng giá (VNĐ)</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    placeholder="Từ"
                    className="w-1/2 border-2 border-black bg-gray-50 px-2.5 py-2 text-xs font-bold text-text-main focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  />
                  <span className="font-bold text-black">-</span>
                  <input
                    type="number"
                    min="0"
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    placeholder="Đến"
                    className="w-1/2 border-2 border-black bg-gray-50 px-2.5 py-2 text-xs font-bold text-text-main focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  />
                </div>
                {priceError && (
                  <p role="alert" className="mt-1.5 text-xs font-bold text-red-600">
                    {priceError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={applyPriceFilter}
                  className="btn-primary mt-3 w-full py-2 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
                >
                  Áp dụng giá
                </button>

                {/* Product types */}
                <p className="mb-2.5 mt-5 text-xs font-bold uppercase text-text-main">
                  Loại sản phẩm
                </p>
                <div className="flex flex-col gap-2">
                  {[
                    ["Thiết bị LED", "LED_MODEL"],
                    ["Nhân vật", "CHARACTER"],
                    ["Combo ưu đãi", "BUNDLE"],
                    ["Gói hội viên", "SUBSCRIPTION"],
                  ].map(([label, type]) => {
                    const count = products.filter((p) => p.productType === type).length;
                    return (
                      <label
                        key={label}
                        className="flex cursor-pointer items-center justify-between text-xs font-bold text-text-main hover:text-black"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedTypes.includes(type as ProductType)}
                            onChange={() => {
                              toggleType(type as ProductType);
                              setActiveCategory("all");
                            }}
                            className="h-4 w-4 accent-primary-ink border-2 border-black cursor-pointer"
                          />
                          <span>{label}</span>
                        </span>
                        <span className="text-text-muted">({count})</span>
                      </label>
                    );
                  })}
                </div>

                {/* Status */}
                <p className="mb-2.5 mt-5 text-xs font-bold uppercase text-text-main">
                  Tình trạng kho
                </p>
                <div className="flex flex-col gap-2">
                  {[
                    ["Còn hàng", "IN_STOCK", products.length],
                    ["Hết hàng", "OUT_OF_STOCK", 0] as const,
                  ].map(([label, status, count]) => (
                    <label
                      key={label}
                      className={`flex items-center justify-between text-xs font-bold ${
                        count === 0 ? "text-gray-400 cursor-not-allowed" : "cursor-pointer text-text-main hover:text-black"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          disabled={count === 0}
                          checked={selectedStatuses.includes(status as "IN_STOCK" | "OUT_OF_STOCK")}
                          onChange={() => toggleStatus(status as "IN_STOCK" | "OUT_OF_STOCK")}
                          className="disabled:cursor-not-allowed h-4 w-4 accent-primary-ink border-2 border-black cursor-pointer"
                        />
                        <span>{label}</span>
                      </span>
                      <span>({count})</span>
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn-secondary mt-5 w-full py-2 text-xs font-black uppercase shadow-[2px_2px_0_0_#000] hover:border-red-600 hover:bg-red-50 hover:text-red-600"
                >
                  Xóa tất cả bộ lọc
                </button>
              </div>
            </aside>

            {/* ── Main Catalog Column ── */}
            <div>
              {/* Hero Slider */}
              <HeroSlider
                onExplore={() => {
                  setActiveCategory("all");
                  setSelectedTypes(ALL_PRODUCT_TYPES);
                }}
              />

              {/* Catalog Top bar (Title & Sort) */}
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-primary-ink" />
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tight text-black sm:text-xl">
                      Khám phá sản phẩm
                    </h2>
                    <p className="text-xs font-bold text-text-muted">
                      {loadingProducts
                        ? "Đang tải dữ liệu từ máy chủ..."
                        : `${sortedProducts.length} sản phẩm phù hợp`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase text-text-muted">Sắp xếp:</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="border-2 border-black bg-white px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0_0_#000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black cursor-pointer"
                  >
                    <option>Phổ biến</option>
                    <option>Giá thấp</option>
                    <option>Giá cao</option>
                  </select>
                </div>
              </div>

              {/* Products Grid or Empty / Loading State */}
              {loadingProducts ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="neo-box-no-hover h-64 animate-pulse bg-gray-100 p-4"
                      aria-label="Đang tải sản phẩm"
                    />
                  ))}
                </div>
              ) : sortedProducts.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                    {paginatedProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAdd={addProduct}
                        canBuy={isAuthenticated}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="neo-box-no-hover mt-6 flex flex-wrap items-center justify-between gap-3 bg-white p-4">
                    <p className="text-xs font-bold uppercase text-text-muted">
                      Hiển thị {(currentPage - 1) * PRODUCTS_PER_PAGE + 1} -{" "}
                      {Math.min(currentPage * PRODUCTS_PER_PAGE, sortedProducts.length)} /{" "}
                      {sortedProducts.length} sản phẩm
                    </p>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPage((c) => Math.max(1, c - 1))}
                        disabled={currentPage === 1}
                        className="cursor-pointer border-2 border-black bg-white p-1.5 text-black shadow-[2px_2px_0_0_#000] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
                        aria-label="Trang trước"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNumber) => (
                        <button
                          key={pageNumber}
                          type="button"
                          onClick={() => setPage(pageNumber)}
                          className={`cursor-pointer min-w-8 border-2 border-black px-2.5 py-1 text-xs font-black shadow-[2px_2px_0_0_#000] transition-transform hover:-translate-y-0.5 active:translate-y-0 ${
                            currentPage === pageNumber
                              ? "bg-primary text-black"
                              : "bg-white text-black hover:bg-gray-50"
                          }`}
                          aria-label={`Trang ${pageNumber}`}
                        >
                          {pageNumber}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setPage((c) => Math.min(pageCount, c + 1))}
                        disabled={currentPage === pageCount}
                        className="cursor-pointer border-2 border-black bg-white p-1.5 text-black shadow-[2px_2px_0_0_#000] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
                        aria-label="Trang sau"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="neo-box-no-hover bg-white p-12 text-center">
                  <Search size={40} className="mx-auto mb-3 text-primary-ink" />
                  <p className="text-base font-black uppercase text-black">
                    Không tìm thấy sản phẩm phù hợp
                  </p>
                  <p className="mt-1 text-xs font-semibold text-text-muted">
                    Hãy thử thay đổi từ khóa hoặc điều chỉnh khoảng giá trong bộ lọc.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="btn-primary mt-4 inline-block text-xs font-black uppercase"
                  >
                    Xóa tất cả bộ lọc
                  </button>
                </div>
              )}

              {/* Quality Commitment Footer Banner */}
              <div className="neo-box-no-hover mt-6 flex items-center justify-center gap-2 bg-white p-3 text-xs font-bold uppercase tracking-wide text-black">
                <Check size={16} className="text-primary-ink" />
                <span>Sản phẩm chính hãng và tương thích 100% hệ sinh thái Mirage</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Toast Notification (Undo/Feedback per §3.7) ── */}
        {toastNotice && (
          <div
            role="status"
            aria-live="polite"
            className="neo-box-no-hover fixed bottom-6 right-6 z-50 flex items-center gap-3 border-2 border-black bg-white px-5 py-3.5 shadow-[4px_4px_0_0_#000] animate-in fade-in slide-in-from-bottom-2"
          >
            <CheckCircle size={20} className="text-primary-ink shrink-0" />
            <div>
              <p className="text-xs font-black uppercase text-black">{toastNotice.title}</p>
              <p className="text-xs font-bold text-text-muted">{toastNotice.desc}</p>
            </div>
            <Link
              href="/cart"
              className="btn-primary ml-2 px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
            >
              Xem giỏ
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-xs font-black uppercase tracking-wider text-text-muted">
            Đang tải Mirage...
          </p>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
