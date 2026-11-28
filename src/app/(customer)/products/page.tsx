"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Grid2X2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Pagination from "@/components/ui/Pagination";
import { scrollToTop, usePageParam } from "@/hooks/usePageParam";
import type { TagItem } from "@/api_client";
import type { CatalogProduct } from "@/features/cart/catalog";
import type { ProductType } from "@/features/cart/types";
import { useCart } from "@/features/cart/context/CartContext";
import { useGallery } from "@/features/character/context/GalleryContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getRoleHomePath } from "@/features/auth/services/auth.service";
import { getApiErrorMessage } from "@/lib/api/auth";
import { isRequestCancelled } from "@/features/commission/errors";
import { fetchAllPages } from "@/lib/api/paging";
import { fetchStoreProducts, fetchStoreTags } from "@/lib/api/products";
import {
  ProductCard,
  StoreCartToast,
  isProductOwned,
} from "@/features/storefront/components/ProductCard";

const ALL_PRODUCT_TYPES: ProductType[] = ["LED_MODEL", "CHARACTER", "BUNDLE", "SUBSCRIPTION"];
const PRICE_PRESETS: ReadonlyArray<{ label: string; min: number | null; max: number | null }> = [
  { label: "< 100k", min: null, max: 100_000 },
  { label: "100k–300k", min: 100_000, max: 300_000 },
  { label: "> 300k", min: 300_000, max: null },
];

function useStoreGridLayout(): {
  columns: 2 | 3 | 4;
  rows: number;
  pageSize: number;
  isDesktopSplit: boolean;
  ready: boolean;
} {
  const [layout, setLayout] = useState<{
    columns: 2 | 3 | 4;
    rows: number;
    isDesktopSplit: boolean;
    ready: boolean;
  }>({
    columns: 4,
    rows: 2,
    isDesktopSplit: true,
    ready: false,
  });

  useEffect(() => {
    let timer: number | undefined;
    const compute = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const columns: 2 | 3 | 4 = width >= 1280 ? 4 : width >= 640 ? 3 : 2;
      const isDesktopSplit = width >= 1024;
      // On desktop (>=1024px), lock catalog to 1 screen (100dvh - 106px sticky header):
      // 2 rows at 800-1019px height, 3 rows at >=1020px height (1080p).
      const rows = isDesktopSplit
        ? Math.max(1, Math.min(3, Math.floor((Math.max(0, height - 276) + 12) / (236 + 12))))
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

function parseTypeParam(raw: string | null): ProductType | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  return ALL_PRODUCT_TYPES.includes(upper as ProductType) ? (upper as ProductType) : null;
}

function StorefrontContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSearchQuery = searchParams.get("search")?.trim() ?? "";
  const urlType = parseTypeParam(searchParams.get("type"));

  const { items: cartItems, addItem } = useCart();
  const { ownedCharacters, activeSubscription } = useGallery();
  const { user, isAuthenticated, isLoading } = useAuth();
  const isInternalUser = isAuthenticated && Boolean(user?.role) && user?.role !== "CUSTOMER";

  const { rows, pageSize, isDesktopSplit, ready: gridReady } = useStoreGridLayout();

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [storeTags, setStoreTags] = useState<TagItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [activeCategory, setActiveCategory] = useState<"all" | ProductType>(urlType ?? "all");
  const [sort, setSort] = useState("Phổ biến");
  const [toastNotice, setToastNotice] = useState<{ title: string; desc: string } | null>(null);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [priceError, setPriceError] = useState("");
  const [page, setPage] = usePageParam();
  const tagPopoverRef = useRef<HTMLDivElement>(null);
  const tagSearchInputRef = useRef<HTMLInputElement>(null);
  const catalogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveCategory(urlType ?? "all");
  }, [urlType]);

  useEffect(() => {
    if (!isLoading && isInternalUser) {
      router.replace(getRoleHomePath(user?.role));
    }
  }, [isInternalUser, isLoading, router, user?.role]);

  useEffect(() => {
    if (isLoading || isInternalUser) return;
    let cancelled = false;
    setLoadingProducts(true);
    setLoadError(null);
    Promise.all([
      fetchAllPages((pageIdx) => fetchStoreProducts({ page: pageIdx, size: 100 })),
      fetchStoreTags(),
    ])
      .then(([allItems, tagsRes]) => {
        if (!cancelled) {
          setProducts(allItems);
          setStoreTags(tagsRes);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled && !isRequestCancelled(err)) {
          setProducts([]);
          setLoadError(getApiErrorMessage(err, "Không thể tải danh sách sản phẩm. Vui lòng thử lại."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isInternalUser, isLoading, reloadTick]);

  useEffect(() => {
    if (!tagPopoverOpen) return;
    tagSearchInputRef.current?.focus();
    const handleMouseDown = (event: MouseEvent) => {
      if (tagPopoverRef.current && !tagPopoverRef.current.contains(event.target as Node)) {
        setTagPopoverOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTagPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [tagPopoverOpen]);

  // Auto-apply price filter (300ms debounce) so users never need an extra submit button
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextMin = minPriceInput.trim() === "" ? null : Number(minPriceInput);
      const nextMax = maxPriceInput.trim() === "" ? null : Number(maxPriceInput);
      if (
        (nextMin !== null && (!Number.isFinite(nextMin) || nextMin < 0)) ||
        (nextMax !== null && (!Number.isFinite(nextMax) || nextMax < 0)) ||
        (nextMin !== null && nextMax !== null && nextMin > nextMax)
      ) {
        setPriceError("Khoảng giá không hợp lệ (Từ phải nhỏ hơn hoặc bằng Đến).");
        return;
      }
      setPriceError("");
      setMinPrice(nextMin);
      setMaxPrice(nextMax);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [minPriceInput, maxPriceInput]);

  const toggleTag = (tagName: string) => {
    setSelectedTags((current) =>
      current.includes(tagName) ? current.filter((v) => v !== tagName) : [...current, tagName],
    );
  };

  const togglePricePreset = (presetMin: number | null, presetMax: number | null) => {
    const isActive = minPrice === presetMin && maxPrice === presetMax;
    if (isActive) {
      setMinPriceInput("");
      setMaxPriceInput("");
      setMinPrice(null);
      setMaxPrice(null);
      setPriceError("");
      return;
    }
    setMinPriceInput(presetMin !== null ? String(presetMin) : "");
    setMaxPriceInput(presetMax !== null ? String(presetMax) : "");
    setMinPrice(presetMin);
    setMaxPrice(presetMax);
    setPriceError("");
  };

  const clearPriceFilter = () => {
    setMinPriceInput("");
    setMaxPriceInput("");
    setMinPrice(null);
    setMaxPrice(null);
    setPriceError("");
  };

  const clearFilters = () => {
    setActiveCategory("all");
    setSelectedTags([]);
    setTagSearch("");
    setTagPopoverOpen(false);
    setMinPriceInput("");
    setMaxPriceInput("");
    setMinPrice(null);
    setMaxPrice(null);
    setPriceError("");
    setPage(1);
    if (activeSearchQuery || urlType) {
      router.replace("/products", { scroll: false });
    }
  };

  const selectCategory = (value: "all" | ProductType) => {
    if (value === activeCategory) return;
    setActiveCategory(value);
    setTagSearch("");
    setTagPopoverOpen(false);
    setSelectedTags((current) => {
      if (current.length === 0 || value === "all") return current;
      const categoryProducts = products.filter((p) => p.productType === value);
      const validTagKeys = new Set(
        categoryProducts.flatMap((p) =>
          (p.tags ?? []).map((t) => t.name?.trim().toLowerCase()).filter(Boolean),
        ),
      );
      return current.filter((tagName) => validTagKeys.has(tagName.trim().toLowerCase()));
    });
    const nextParams = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      nextParams.delete("type");
    } else {
      nextParams.set("type", value);
    }
    nextParams.delete("page");
    const qs = nextParams.toString();
    router.replace(qs ? `/products?${qs}` : "/products", { scroll: false });
  };

  const availableTags = useMemo(() => {
    const scopedProducts =
      activeCategory === "all"
        ? products
        : products.filter((product) => product.productType === activeCategory);
    const tagMap = new Map<string, { name: string; count: number }>();
    for (const tag of storeTags) {
      const trimmed = tag.name?.trim();
      if (trimmed) {
        tagMap.set(trimmed.toLowerCase(), { name: trimmed, count: 0 });
      }
    }
    for (const product of scopedProducts) {
      const seenInProduct = new Set<string>();
      for (const tag of product.tags ?? []) {
        const trimmed = tag.name?.trim();
        if (!trimmed) continue;
        const key = trimmed.toLowerCase();
        if (seenInProduct.has(key)) continue;
        seenInProduct.add(key);
        const existing = tagMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          tagMap.set(key, { name: trimmed, count: 1 });
        }
      }
    }
    return Array.from(tagMap.values())
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi"));
  }, [products, storeTags, activeCategory]);

  const popoverTags = useMemo(() => {
    const q = tagSearch.trim().toLowerCase();
    const filtered = q
      ? availableTags.filter((tag) => tag.name.toLowerCase().includes(q))
      : availableTags;
    return [...filtered].sort((a, b) => {
      const aSelected = selectedTags.includes(a.name) ? 1 : 0;
      const bSelected = selectedTags.includes(b.name) ? 1 : 0;
      if (aSelected !== bSelected) return bSelected - aSelected;
      return b.count - a.count || a.name.localeCompare(b.name, "vi");
    });
  }, [availableTags, tagSearch, selectedTags]);

  const hasActiveFilters =
    activeCategory !== "all" ||
    selectedTags.length > 0 ||
    minPrice !== null ||
    maxPrice !== null ||
    minPriceInput !== "" ||
    maxPriceInput !== "" ||
    Boolean(activeSearchQuery);

  const filteredProducts = useMemo(() => {
    const query = activeSearchQuery.toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.tags?.some((t) => t.name?.toLowerCase().includes(query));
      const matchesCategory = activeCategory === "all" || product.productType === activeCategory;
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((selected) =>
          product.tags?.some((t) => t.name?.trim().toLowerCase() === selected.toLowerCase()),
        );
      const matchesMinPrice = minPrice === null || product.price >= minPrice;
      const matchesMaxPrice = maxPrice === null || product.price <= maxPrice;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesTags &&
        matchesMinPrice &&
        matchesMaxPrice
      );
    });
  }, [
    products,
    activeSearchQuery,
    activeCategory,
    selectedTags,
    minPrice,
    maxPrice,
  ]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sort === "Tên A → Z") return a.name.localeCompare(b.name, "vi");
      if (sort === "Tên Z → A") return b.name.localeCompare(a.name, "vi");
      if (sort === "Giá thấp") return a.price - b.price;
      if (sort === "Giá cao") return b.price - a.price;
      return 0;
    });
  }, [filteredProducts, sort]);

  const pageCount = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginatedProducts = useMemo(
    () =>
      sortedProducts.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
      ),
    [sortedProducts, currentPage, pageSize],
  );

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        activeCategory,
        maxPrice,
        minPrice,
        selectedTags,
        sort,
        activeSearchQuery,
      }),
    [
      activeCategory,
      maxPrice,
      minPrice,
      selectedTags,
      sort,
      activeSearchQuery,
    ],
  );
  const prevFilterKeyRef = useRef(filterKey);

  // Reset to page 1 only when filter/sort/search changes after mount so initial ?page= persists
  useEffect(() => {
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      setPage(1);
    }
  }, [filterKey, setPage]);

  // Clamp out-of-range URL page when resize increases pageSize or results shrink
  useEffect(() => {
    if (!loadingProducts && gridReady && page > pageCount) {
      setPage(pageCount);
    }
  }, [loadingProducts, gridReady, page, pageCount, setPage]);

  const handlePageChange = (nextPage: number) => {
    const clampedPage = Math.min(pageCount, Math.max(1, nextPage));
    setPage(clampedPage);
    if (!isDesktopSplit && typeof window !== "undefined") {
      window.requestAnimationFrame(() => scrollToTop(catalogRef.current));
    }
  };

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
        <section
          aria-label="Cửa hàng sản phẩm"
          className="mx-auto flex w-full max-w-[1320px] flex-col px-4 py-4 lg:h-[calc(100dvh-106px)] lg:overflow-hidden lg:px-8 lg:py-3"
        >
            {/* Breadcrumb */}
            <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted lg:mb-2.5">
              <Link href="/" className="cursor-pointer hover:text-primary-ink hover:underline">
                Trang chủ
              </Link>
              <span>›</span>
              <Link href="/products" className="cursor-pointer text-black hover:underline">
                Cửa hàng sản phẩm
              </Link>
              {activeSearchQuery && (
                <>
                  <span>›</span>
                  <span className="flex items-center gap-1 border border-black bg-primary px-2 py-0.5 text-[10px] font-black text-black">
                    Tìm: &ldquo;{activeSearchQuery}&rdquo;
                    <button
                      type="button"
                      onClick={() => router.push("/products")}
                      className="ml-1 cursor-pointer text-black hover:text-red-700"
                      aria-label="Hủy tìm kiếm"
                    >
                      <X size={12} />
                    </button>
                  </span>
                </>
              )}
            </div>

            <div className="grid gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[250px_minmax(0,1fr)]">
              {/* ── Sidebar (Zero-Scroll Compact Filter & Categories) ── */}
              <aside className="neo-box-no-hover h-fit bg-white p-3.5">
              {/* Category section */}
              <div className="mb-3.5">
                <h2 className="mb-2 flex items-center gap-2 border-b-2 border-black pb-1.5 text-xs font-black uppercase tracking-wider text-black">
                  <Grid2X2 size={14} className="text-primary-ink" /> Danh mục
                </h2>
                <div className="flex flex-col gap-1">
                  {[
                    { label: "Tất cả sản phẩm", count: products.length, value: "all" as const },
                    {
                      label: "Thiết bị LED",
                      count: products.filter((p) => p.productType === "LED_MODEL").length,
                      value: "LED_MODEL" as const,
                    },
                    {
                      label: "Nhân vật",
                      count: products.filter((p) => p.productType === "CHARACTER").length,
                      value: "CHARACTER" as const,
                    },
                    {
                      label: "Gói sản phẩm",
                      count: products.filter((p) => p.productType === "BUNDLE").length,
                      value: "BUNDLE" as const,
                    },
                    {
                      label: "Gói thành viên",
                      count: products.filter((p) => p.productType === "SUBSCRIPTION").length,
                      value: "SUBSCRIPTION" as const,
                    },
                  ].map((category) => {
                    const isActive = activeCategory === category.value;
                    return (
                      <button
                        key={category.value}
                        type="button"
                        onClick={() => selectCategory(category.value)}
                        className={`flex w-full cursor-pointer items-center justify-between border-2 px-2.5 py-1.5 text-xs font-bold uppercase transition-all ${
                          isActive
                            ? "border-black bg-primary text-black shadow-[2px_2px_0_0_#000]"
                            : "border-transparent text-text-main hover:border-black hover:bg-gray-50"
                        }`}
                      >
                        <span className="truncate">{category.label}</span>
                        <span
                          className={`ml-2 px-1.5 py-0.5 text-[10px] font-black tabular-nums ${
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

              <hr className="my-3 border-t-2 border-black" />

              {/* Filters section */}
              <div>
                <h2 className="mb-2.5 flex items-center gap-2 border-b-2 border-black pb-1.5 text-xs font-black uppercase tracking-wider text-black">
                  <SlidersHorizontal size={14} className="text-primary-ink" /> Bộ lọc
                </h2>

                {/* Price range (auto-apply + quick presets) */}
                <p className="mb-1.5 text-[11px] font-bold uppercase text-text-main">Khoảng giá (VNĐ)</p>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    aria-label="Giá tối thiểu"
                    placeholder="Từ"
                    className="w-1/2 border-2 border-black bg-gray-50 px-2 py-1.5 text-xs font-bold text-text-main focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  />
                  <span className="font-bold text-black">-</span>
                  <input
                    type="number"
                    min="0"
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    aria-label="Giá tối đa"
                    placeholder="Đến"
                    className="w-1/2 border-2 border-black bg-gray-50 px-2 py-1.5 text-xs font-bold text-text-main focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  />
                </div>
                <div className="mt-1.5 grid grid-cols-3 gap-1">
                  {PRICE_PRESETS.map((preset) => {
                    const isPresetActive = minPrice === preset.min && maxPrice === preset.max;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        aria-pressed={isPresetActive}
                        onClick={() => togglePricePreset(preset.min, preset.max)}
                        className={`cursor-pointer border-2 border-black px-1 py-1 text-[10px] font-black transition-colors ${
                          isPresetActive
                            ? "bg-primary text-black shadow-[1px_1px_0_0_#000]"
                            : "bg-gray-50 text-text-main hover:bg-primary/20"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                {priceError && (
                  <p role="alert" className="mt-1 text-[11px] font-bold text-red-600">
                    {priceError}
                  </p>
                )}

                {/* Product tags (Searchable multi-select popover) */}
                {availableTags.length > 0 && (
                  <div ref={tagPopoverRef} className="relative mt-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-text-main">
                        <Tag size={12} className="text-primary-ink" />
                        <span>Thẻ sản phẩm</span>
                      </span>
                      {selectedTags.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedTags([])}
                          className="cursor-pointer text-[10px] font-black uppercase text-red-600 hover:underline"
                        >
                          Bỏ chọn
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      aria-expanded={tagPopoverOpen}
                      aria-haspopup="listbox"
                      onClick={() => setTagPopoverOpen((prev) => !prev)}
                      className={`flex w-full cursor-pointer items-center justify-between border-2 border-black px-2.5 py-1.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                        selectedTags.length > 0
                          ? "bg-primary/20 text-black"
                          : "bg-gray-50 text-text-main hover:bg-white"
                      }`}
                    >
                      <span className="truncate">
                        {selectedTags.length > 0
                          ? `Đã chọn ${selectedTags.length} thẻ`
                          : "Chọn thẻ sản phẩm..."}
                      </span>
                      <span className="ml-2 flex shrink-0 items-center gap-1.5">
                        <span className="border border-black bg-white px-1.5 py-0.5 text-[10px] font-black tabular-nums text-black">
                          {selectedTags.length > 0 ? selectedTags.length : availableTags.length}
                        </span>
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-150 ${tagPopoverOpen ? "rotate-180" : ""}`}
                        />
                      </span>
                    </button>

                    {tagPopoverOpen && (
                      <div className="absolute left-0 top-full z-40 mt-1.5 flex w-full flex-col border-2 border-black bg-white shadow-[4px_4px_0_0_#000] lg:bottom-0 lg:left-full lg:top-auto lg:ml-3 lg:mt-0 lg:w-72">
                        <div className="border-b-2 border-black bg-gray-50 p-2">
                          <div className="relative flex items-center">
                            <Search
                              size={13}
                              className="pointer-events-none absolute left-2.5 text-black"
                              aria-hidden="true"
                            />
                            <input
                              ref={tagSearchInputRef}
                              type="text"
                              value={tagSearch}
                              onChange={(e) => setTagSearch(e.target.value)}
                              placeholder="Tìm nhanh thẻ..."
                              aria-label="Tìm nhanh thẻ sản phẩm"
                              className="w-full border-2 border-black bg-white py-1 pl-7 pr-7 text-xs font-bold text-black placeholder:font-normal placeholder:text-text-muted focus:outline-none"
                            />
                            {tagSearch && (
                              <button
                                type="button"
                                onClick={() => setTagSearch("")}
                                aria-label="Xóa từ khóa tìm thẻ"
                                className="absolute right-2 cursor-pointer text-text-muted hover:text-black"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div
                          role="listbox"
                          aria-label="Danh sách thẻ sản phẩm"
                          aria-multiselectable="true"
                          className="max-h-52 overflow-y-auto divide-y divide-gray-100 p-1.5"
                        >
                          {popoverTags.length > 0 ? (
                            popoverTags.map((tag) => {
                              const isTagSelected = selectedTags.includes(tag.name);
                              return (
                                <button
                                  key={tag.name}
                                  type="button"
                                  role="option"
                                  aria-selected={isTagSelected}
                                  onClick={() => toggleTag(tag.name)}
                                  className={`flex w-full cursor-pointer items-center justify-between gap-2 px-2 py-1.5 text-left text-xs font-bold transition-colors ${
                                    isTagSelected
                                      ? "bg-primary/30 text-black"
                                      : "text-text-main hover:bg-gray-100"
                                  }`}
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <span
                                      className={`grid h-4 w-4 shrink-0 place-items-center border-2 border-black ${
                                        isTagSelected ? "bg-primary text-black" : "bg-white"
                                      }`}
                                    >
                                      {isTagSelected && <Check size={11} strokeWidth={3} aria-hidden="true" />}
                                    </span>
                                    <span className="truncate uppercase">#{tag.name}</span>
                                  </span>
                                  <span className="shrink-0 font-mono text-[11px] font-bold text-text-muted tabular-nums">
                                    ({tag.count})
                                  </span>
                                </button>
                              );
                            })
                          ) : (
                            <p className="py-5 text-center text-xs font-semibold text-text-muted">
                              Không tìm thấy thẻ phù hợp.
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 border-t-2 border-black bg-gray-50 px-2.5 py-1.5">
                          <span className="text-[11px] font-bold text-text-muted">
                            {selectedTags.length > 0
                              ? `Đã chọn ${selectedTags.length} thẻ`
                              : `${availableTags.length} thẻ`}
                          </span>
                          <div className="flex items-center gap-2">
                            {selectedTags.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setSelectedTags([])}
                                className="cursor-pointer text-[11px] font-black uppercase text-red-600 hover:underline"
                              >
                                Xóa thẻ
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setTagPopoverOpen(false)}
                              className="border-2 border-black bg-primary px-2 py-0.5 text-[11px] font-black uppercase text-black"
                            >
                              Xong
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  disabled={!hasActiveFilters}
                  onClick={clearFilters}
                  className="btn-secondary mt-3.5 w-full py-1.5 text-xs font-black uppercase shadow-[2px_2px_0_0_#000] hover:border-red-600 hover:bg-red-50 hover:text-red-600"
                >
                  Xóa tất cả bộ lọc
                </button>
              </div>
            </aside>

            {/* ── Main Catalog Column ── */}
            <div ref={catalogRef} className="flex min-w-0 flex-col lg:h-full lg:min-h-0">
              {/* Catalog Top bar (Title & Sort) */}
              <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-primary-ink" />
                  <div>
                    <h1 className="text-lg font-black uppercase tracking-tight text-black sm:text-xl">
                      Danh sách sản phẩm
                    </h1>
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
                    aria-label="Sắp xếp sản phẩm"
                    className="cursor-pointer border-2 border-black bg-white px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0_0_#000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  >
                    <option value="Phổ biến">Mặc định</option>
                    <option value="Tên A → Z">Tên A → Z</option>
                    <option value="Tên Z → A">Tên Z → A</option>
                    <option value="Giá thấp">Giá thấp → cao</option>
                    <option value="Giá cao">Giá cao → thấp</option>
                  </select>
                </div>
              </div>

              {/* Active filters bar (Price + Tags) */}
              {(selectedTags.length > 0 || minPrice !== null || maxPrice !== null) && (
                <div className="mb-2.5 flex shrink-0 flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-black uppercase text-text-muted">
                    Đang lọc:
                  </span>
                  {(minPrice !== null || maxPrice !== null) && (
                    <button
                      type="button"
                      onClick={clearPriceFilter}
                      className="flex cursor-pointer items-center gap-1 border-2 border-black bg-[#e0f2fe] px-2 py-0.5 text-[11px] font-black text-black shadow-[1px_1px_0_0_#000] hover:bg-[#bae6fd]"
                      aria-label="Bỏ lọc khoảng giá"
                    >
                      <span>
                        Giá:{" "}
                        {minPrice !== null && maxPrice !== null
                          ? `${minPrice.toLocaleString("vi-VN")}đ – ${maxPrice.toLocaleString("vi-VN")}đ`
                          : minPrice !== null
                            ? `từ ${minPrice.toLocaleString("vi-VN")}đ`
                            : `đến ${(maxPrice ?? 0).toLocaleString("vi-VN")}đ`}
                      </span>
                      <X size={11} />
                    </button>
                  )}
                  {selectedTags.map((tagName) => (
                    <button
                      key={tagName}
                      type="button"
                      onClick={() => toggleTag(tagName)}
                      className="flex cursor-pointer items-center gap-1 border-2 border-black bg-primary px-2 py-0.5 text-[11px] font-black uppercase text-black shadow-[1px_1px_0_0_#000] hover:bg-primary/80"
                      aria-label={`Bỏ lọc thẻ ${tagName}`}
                    >
                      <span>#{tagName}</span>
                      <X size={11} />
                    </button>
                  ))}
                </div>
              )}

              {/* Products Grid or Error / Empty / Loading State */}
              {loadingProducts || !gridReady ? (
                <div
                  className="grid min-h-0 flex-1 grid-cols-2 gap-3 pb-1 pr-1 sm:grid-cols-3 xl:grid-cols-4"
                  style={
                    isDesktopSplit
                      ? { gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }
                      : undefined
                  }
                >
                  {Array.from({ length: gridReady ? pageSize : 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="neo-box-no-hover flex h-full min-h-0 animate-pulse flex-col overflow-hidden bg-white"
                      aria-label="Đang tải sản phẩm"
                    >
                      <div
                        className={`border-b-2 border-black bg-gray-100 ${
                          isDesktopSplit ? "min-h-[112px] flex-1" : "aspect-square"
                        }`}
                      />
                      <div className={isDesktopSplit ? "shrink-0 space-y-2 p-2.5" : "space-y-2.5 p-3.5"}>
                        <div className="h-3 w-16 bg-gray-200" />
                        <div className="h-4 w-full bg-gray-200" />
                        <div className="mt-2 border-t-2 border-dashed border-gray-200 pt-2">
                          <div className="h-4 w-24 bg-gray-200" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : loadError ? (
                <div role="alert" className="neo-box-no-hover flex flex-1 flex-col items-center justify-center bg-red-50 p-10 text-center">
                  <AlertTriangle size={38} className="mx-auto mb-3 text-red-700" aria-hidden="true" />
                  <p className="text-base font-black uppercase text-black">
                    Không thể tải sản phẩm
                  </p>
                  <p className="mt-1 text-xs font-semibold text-text-muted">{loadError}</p>
                  <button
                    type="button"
                    onClick={() => setReloadTick((tick) => tick + 1)}
                    className="btn-primary mt-4 inline-flex items-center gap-1.5 text-xs font-black uppercase"
                  >
                    <RefreshCw size={14} aria-hidden="true" />
                    Thử lại
                  </button>
                </div>
              ) : sortedProducts.length > 0 ? (
                <div
                  className="grid min-h-0 flex-1 grid-cols-2 gap-3 pb-1 pr-1 sm:grid-cols-3 xl:grid-cols-4"
                  style={
                    isDesktopSplit
                      ? { gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }
                      : undefined
                  }
                >
                  {paginatedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAdd={addProduct}
                      canBuy={isAuthenticated}
                      isOwned={isProductOwned(product, ownedCharacters, activeSubscription)}
                      isAlreadyInCart={cartItems.some((item) => item.id === String(product.id))}
                      compact={isDesktopSplit}
                    />
                  ))}
                </div>
              ) : (
                <div className="neo-box-no-hover flex flex-1 flex-col items-center justify-center bg-white p-12 text-center">
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

              {/* Bottom-Pinned Pagination */}
              {!loadingProducts && gridReady && !loadError && sortedProducts.length > 0 && (
                <div className="mt-auto shrink-0 pb-1 pt-3">
                  <Pagination
                    page={currentPage}
                    totalPages={pageCount}
                    onPageChange={handlePageChange}
                    totalItems={sortedProducts.length}
                    pageSize={pageSize}
                    itemLabel="sản phẩm"
                    ariaLabel="Phân trang danh sách sản phẩm"
                    variant="neo"
                    alwaysShow
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <StoreCartToast notice={toastNotice} />
      </main>
    </>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-xs font-black uppercase tracking-wider text-text-muted">
            Đang tải cửa hàng Lumintra...
          </p>
        </div>
      }
    >
      <StorefrontContent />
    </Suspense>
  );
}
