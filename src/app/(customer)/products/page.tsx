"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Grid2X2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
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

function useStoreGridLayout(): { columns: 2 | 3 | 4; rows: number; pageSize: number; ready: boolean } {
  const [layout, setLayout] = useState<{ columns: 2 | 3 | 4; rows: number; ready: boolean }>({
    columns: 4,
    rows: 3,
    ready: false,
  });

  useEffect(() => {
    let timer: number | undefined;
    const compute = () => {
      const width = window.innerWidth;
      const columns: 2 | 3 | 4 = width >= 1280 ? 4 : width >= 640 ? 3 : 2;
      // On lg+ (>=1024px) the 250px filter sidebar sits beside the catalog, so 3 rows
      // keeps catalog height balanced with the sidebar; below lg, 2 rows keeps stacked pages compact.
      const rows = width >= 1024 ? 3 : 2;
      setLayout({ columns, rows, ready: true });
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

  const { pageSize, ready: gridReady } = useStoreGridLayout();

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [storeTags, setStoreTags] = useState<TagItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [activeCategory, setActiveCategory] = useState<"all" | ProductType>(urlType ?? "all");
  const [sort, setSort] = useState("Phổ biến");
  const [toastNotice, setToastNotice] = useState<{ title: string; desc: string } | null>(null);

  const [selectedTypes, setSelectedTypes] = useState<ProductType[]>(
    urlType ? [urlType] : ALL_PRODUCT_TYPES,
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<("IN_STOCK" | "OUT_OF_STOCK")[]>([
    "IN_STOCK",
  ]);
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [priceError, setPriceError] = useState("");
  const [page, setPage] = usePageParam();
  const catalogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveCategory(urlType ?? "all");
    setSelectedTypes(urlType ? [urlType] : ALL_PRODUCT_TYPES);
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

  const toggleType = (type: ProductType) => {
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((v) => v !== type) : [...current, type],
    );
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags((current) =>
      current.includes(tagName) ? current.filter((v) => v !== tagName) : [...current, tagName],
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
    setSelectedTags([]);
    setSelectedStatuses(["IN_STOCK"]);
    setMinPriceInput("");
    setMaxPriceInput("");
    setMinPrice(null);
    setMaxPrice(null);
    setPriceError("");
    if (activeSearchQuery || urlType) {
      router.push("/products");
    }
  };

  const selectCategory = (value: "all" | ProductType) => {
    setActiveCategory(value);
    if (value === "all") {
      setSelectedTypes(ALL_PRODUCT_TYPES);
    } else {
      setSelectedTypes([value]);
    }
  };

  const availableTags = useMemo(() => {
    const tagMap = new Map<string, { name: string; count: number }>();
    for (const tag of storeTags) {
      const trimmed = tag.name?.trim();
      if (trimmed) {
        tagMap.set(trimmed.toLowerCase(), { name: trimmed, count: 0 });
      }
    }
    for (const product of products) {
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
  }, [products, storeTags]);

  const filteredProducts = useMemo(() => {
    const query = activeSearchQuery.toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.tags?.some((t) => t.name?.toLowerCase().includes(query));
      const matchesCategory = activeCategory === "all" || product.productType === activeCategory;
      const matchesType = selectedTypes.includes(product.productType);
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((selected) =>
          product.tags?.some((t) => t.name?.trim().toLowerCase() === selected.toLowerCase()),
        );
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
        matchesTags &&
        matchesStatus &&
        matchesMinPrice &&
        matchesMaxPrice
      );
    });
  }, [
    products,
    activeSearchQuery,
    activeCategory,
    selectedTypes,
    selectedTags,
    selectedStatuses,
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
        selectedStatuses,
        selectedTags,
        selectedTypes,
        sort,
        activeSearchQuery,
      }),
    [
      activeCategory,
      maxPrice,
      minPrice,
      selectedStatuses,
      selectedTags,
      selectedTypes,
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
    if (typeof window !== "undefined") {
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
        <section aria-label="Cửa hàng sản phẩm" className="mx-auto w-full max-w-[1320px] px-4 py-8 lg:px-8">
          {/* Breadcrumb */}
          <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
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
                        className={`flex w-full cursor-pointer items-center justify-between border-2 p-2.5 text-xs font-bold uppercase transition-all ${
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
                    ["Gói sản phẩm", "BUNDLE"],
                    ["Gói thành viên", "SUBSCRIPTION"],
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
                            className="h-4 w-4 cursor-pointer border-2 border-black accent-primary-ink"
                          />
                          <span>{label}</span>
                        </span>
                        <span className="text-text-muted">({count})</span>
                      </label>
                    );
                  })}
                </div>

                {/* Product tags */}
                {availableTags.length > 0 && (
                  <>
                    <div className="mb-2.5 mt-5 flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-text-main">
                        <Tag size={13} className="text-primary-ink" />
                        <span>Thẻ sản phẩm</span>
                      </p>
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
                    <div className="flex flex-wrap gap-1.5">
                      {availableTags.map((tag) => {
                        const isTagSelected = selectedTags.includes(tag.name);
                        return (
                          <button
                            key={tag.name}
                            type="button"
                            onClick={() => toggleTag(tag.name)}
                            aria-pressed={isTagSelected}
                            className={`cursor-pointer border-2 border-black px-2 py-1 text-[11px] font-black uppercase transition-all ${
                              isTagSelected
                                ? "bg-primary text-black shadow-[2px_2px_0_0_#000]"
                                : "bg-gray-50 text-text-main hover:bg-primary/20"
                            }`}
                          >
                            #{tag.name}{" "}
                            <span className={isTagSelected ? "text-black/75" : "text-text-muted"}>
                              ({tag.count})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

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
                        count === 0
                          ? "cursor-not-allowed text-gray-400"
                          : "cursor-pointer text-text-main hover:text-black"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          disabled={count === 0}
                          checked={selectedStatuses.includes(status as "IN_STOCK" | "OUT_OF_STOCK")}
                          onChange={() => toggleStatus(status as "IN_STOCK" | "OUT_OF_STOCK")}
                          className="h-4 w-4 cursor-pointer border-2 border-black accent-primary-ink disabled:cursor-not-allowed"
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
            <div ref={catalogRef} className="flex min-w-0 flex-col">
              {/* Catalog Top bar (Title & Sort) */}
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-3">
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

              {/* Active tag filters */}
              {selectedTags.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black uppercase text-text-muted">
                    Đang lọc theo thẻ:
                  </span>
                  {selectedTags.map((tagName) => (
                    <button
                      key={tagName}
                      type="button"
                      onClick={() => toggleTag(tagName)}
                      className="flex cursor-pointer items-center gap-1 border-2 border-black bg-primary px-2.5 py-0.5 text-xs font-black uppercase text-black shadow-[2px_2px_0_0_#000] hover:bg-primary/80"
                      aria-label={`Bỏ lọc thẻ ${tagName}`}
                    >
                      <span>#{tagName}</span>
                      <X size={12} />
                    </button>
                  ))}
                </div>
              )}

              {/* Products Grid or Error / Empty / Loading State */}
              {loadingProducts || !gridReady ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: gridReady ? pageSize : 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="neo-box-no-hover flex animate-pulse flex-col overflow-hidden bg-white"
                      aria-label="Đang tải sản phẩm"
                    >
                      <div className="aspect-square border-b-2 border-black bg-gray-100" />
                      <div className="space-y-2.5 p-3.5">
                        <div className="h-3 w-16 bg-gray-200" />
                        <div className="h-4 w-full bg-gray-200" />
                        <div className="h-4 w-2/3 bg-gray-100" />
                        <div className="mt-2 border-t-2 border-dashed border-gray-200 pt-3">
                          <div className="h-4 w-24 bg-gray-200" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : loadError ? (
                <div role="alert" className="neo-box-no-hover bg-red-50 p-10 text-center">
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
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                  {paginatedProducts.map((product) => (
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

              {/* Bottom-Pinned Pagination & Quality Commitment Footer Banner */}
              <div className="mt-auto space-y-6 pt-6">
                {!loadingProducts && gridReady && !loadError && sortedProducts.length > 0 && (
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
                )}

                <div className="neo-box-no-hover flex items-center justify-center gap-2 bg-white p-3 text-xs font-bold uppercase tracking-wide text-black">
                  <Check size={16} className="text-primary-ink" />
                  <span>Sản phẩm chính hãng và tương thích 100% hệ sinh thái Lumintra</span>
                </div>
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
