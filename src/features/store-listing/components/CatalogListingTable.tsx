import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Archive, Edit, EyeOff, Rocket, Trash2 } from "lucide-react";
import { fetchManagedStoreProducts, type BackendProductStatus } from "@/lib/api/products";
import type { CatalogProduct } from "@/features/cart/catalog";
import type { ProductType } from "@/features/cart/types";
import { formatVnd } from "../format";
import StatusBadge from "./StatusBadge";
import StoreListingToolbar, {
  computeStatusCounts,
  type StoreStatusFilter,
} from "./StoreListingToolbar";

type CatalogKind = Extract<ProductType, "LED_MODEL" | "BUNDLE">;

export interface StoreCatalogItem extends CatalogProduct {
  status?: BackendProductStatus;
}

const COPY: Record<CatalogKind, { label: string }> = {
  LED_MODEL: {
    label: "Mẫu LED",
  },
  BUNDLE: {
    label: "Gói sản phẩm",
  },
};

interface CatalogListingTableProps {
  kind: CatalogKind;
  items?: StoreCatalogItem[];
  canManage?: boolean;
  onPublish?: (product: StoreCatalogItem) => void;
  onEdit?: (product: StoreCatalogItem) => void;
  onArchive?: (product: StoreCatalogItem) => void;
  onUnlist?: (product: StoreCatalogItem) => void;
  onDelete?: (product: StoreCatalogItem) => void;
  onRefresh?: () => void;
}

/** Bảng xem thông tin và quản lý các sản phẩm bán trên Store */
export default function CatalogListingTable({
  kind,
  items: initialItems,
  canManage = false,
  onPublish,
  onEdit,
  onArchive,
  onUnlist,
  onDelete,
  onRefresh,
}: CatalogListingTableProps) {
  const [items, setItems] = useState<StoreCatalogItem[]>(initialItems ?? []);
  const [statusFilter, setStatusFilter] = useState<StoreStatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (initialItems) {
      setItems(initialItems);
      return;
    }
    let active = true;
    fetchManagedStoreProducts({
      productType: kind === "LED_MODEL" ? "LED" : "BUNDLE",
      size: 200,
    })
      .then((res) => {
        if (active) {
          setItems(
            res.items.map((item) => ({
              id: String(item.productId),
              productId: item.productId,
              productType: kind,
              name: item.productName,
              price: Number(item.basePrice ?? 0),
              description: item.description ?? "",
              previewUrl: item.thumbnailUrl || item.galleryUrls?.[0] || undefined,
              galleryUrls: item.galleryUrls ?? [],
              tags: item.tags ?? [],
              status: item.status,
            })),
          );
        }
      })
      .catch((err) => console.error("Failed to load managed catalog products:", err));
    return () => {
      active = false;
    };
  }, [initialItems, kind]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const currentStatus: BackendProductStatus = item.status ?? "UNPUBLISHED";
      if (statusFilter !== "ALL" && currentStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        String(item.id).includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    });
  }, [items, searchQuery, statusFilter]);

  const statusCounts = useMemo(
    () => computeStatusCounts(items, (item) => item.status),
    [items],
  );

  const isBundle = kind === "BUNDLE";
  const headings = [
    "Mã sản phẩm",
    "Ảnh đại diện",
    "Tên sản phẩm",
    isBundle ? "Thành phần gói" : "Mô tả",
    "Giá bán",
    "Trạng thái cửa hàng",
    ...(canManage && !isBundle ? ["Thao tác"] : []),
  ];

  return (
    <>
      <StoreListingToolbar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        counts={statusCounts}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={`Tìm kiếm ${COPY[kind].label.toLowerCase()} theo tên hoặc mã…`}
        onRefresh={onRefresh}
        onReset={() => {
          setStatusFilter("ALL");
          setSearchQuery("");
        }}
        canReset={statusFilter !== "ALL" || searchQuery !== ""}
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <caption className="sr-only">
            Danh sách {COPY[kind].label} đang quản lý trên Store
          </caption>
          <thead className="border-b border-[#e3efe6]">
            <tr>
              {headings.map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const status: BackendProductStatus = item.status ?? "UNPUBLISHED";
              const isDeleted = status === "DELETED";

              return (
                <tr
                  key={item.id}
                  className={`border-b border-[#eef5f0] last:border-0 transition-all ${
                    isDeleted
                      ? "select-none bg-neutral-100/60 opacity-45 grayscale"
                      : "hover:bg-[#f9fdfa]"
                  }`}
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-black text-primary-dark">
                    #{item.productId ?? item.id}
                  </td>
                  <td className="px-4 py-3">
                    {item.previewUrl ? (
                      <Image
                        src={item.previewUrl}
                        alt={`Thumbnail của ${item.name}`}
                        width={44}
                        height={44}
                        className="h-11 w-11 rounded-lg border border-[#d8e6dc] bg-[#f6fbf7] object-contain"
                      />
                    ) : (
                      <div className="grid h-11 w-11 place-items-center rounded-lg border border-[#d8e6dc] bg-[#f6fbf7] text-[10px] font-bold text-text-muted">
                        LED
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold">
                    <span className={isDeleted ? "text-neutral-500 line-through" : ""}>
                      {item.name}
                    </span>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-xs font-medium text-text-muted">
                    {isBundle
                      ? `${item.components?.length ?? 0} sản phẩm: ${(item.components ?? [])
                          .map((component) => component.name)
                          .join(", ")}`
                      : item.description || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-black">
                    {formatVnd(item.price)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={status} />
                  </td>
                  {canManage && !isBundle && (
                    <td className="px-4 py-3">
                      {isDeleted ? null : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(status === "UNPUBLISHED" || status === "ARCHIVED") && onPublish && (
                            <button
                              type="button"
                              onClick={() => onPublish(item)}
                              className="inline-flex items-center gap-1 rounded-md border border-[#3b8555] bg-[#439660] px-2.5 py-1 text-xs font-bold text-white hover:bg-[#387e51]"
                            >
                              <Rocket size={12} /> {status === "ARCHIVED" ? "Mở bán lại" : "Mở bán"}
                            </button>
                          )}
                          {onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(item)}
                              className="inline-flex items-center gap-1 rounded-md border border-[#cfe0d4] bg-white px-2 py-1 text-xs font-bold text-[#173b28] hover:bg-[#eef8f0]"
                            >
                              <Edit size={12} /> Sửa
                            </button>
                          )}
                          {status !== "ARCHIVED" && onArchive && (
                            <button
                              type="button"
                              onClick={() => onArchive(item)}
                              className="inline-flex items-center gap-1 rounded-md border border-[#cfe0d4] bg-white px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50"
                            >
                              <Archive size={12} /> Ngừng bán
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(item)}
                              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={12} /> Xóa
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {filteredItems.length === 0 && (
              <tr>
                <td
                  colSpan={headings.length}
                  className="px-4 py-10 text-center text-xs font-semibold text-text-muted"
                >
                  Chưa có sản phẩm nào phù hợp với bộ lọc trong danh mục này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
