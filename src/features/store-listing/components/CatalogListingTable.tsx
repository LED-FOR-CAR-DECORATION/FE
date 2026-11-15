import { useEffect, useState } from "react";
import Image from "next/image";
import { Archive, Edit, EyeOff, Info, Rocket, Trash2 } from "lucide-react";
import { fetchStoreProducts } from "@/lib/api/products";
import type { CatalogProduct } from "@/features/cart/catalog";
import type { ProductType } from "@/features/cart/types";
import { formatVnd } from "../format";
import { getDeletedProductIds } from "../services/store-listing.service";

type CatalogKind = Extract<ProductType, "LED_MODEL" | "BUNDLE">;

export interface StoreCatalogItem extends CatalogProduct {
  status?: "PUBLISHED" | "UNPUBLISHED" | "ARCHIVED" | "DELETED";
}

const COPY: Record<CatalogKind, { label: string; notice: string }> = {
  LED_MODEL: {
    label: "Model LED",
    notice:
      "Quản lý thiết bị phần cứng LED: Manager & Admin có quyền tạo mới (mặc định UNPUBLISHED), Publish lên Store, chỉnh sửa giá/mô tả/ảnh, ẩn, lưu trữ và xóa mềm sản phẩm.",
  },
  BUNDLE: {
    label: "Bundle",
    notice:
      "Chế độ xem thông tin. Bundle hiện chưa được mô hình hóa độc lập trong ERD; tính năng quản lý duyệt/ẩn hiển thị sẽ được tích hợp khi có đặc tả backend hoàn chỉnh.",
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
}: CatalogListingTableProps) {
  const [items, setItems] = useState<StoreCatalogItem[]>(initialItems ?? []);

  useEffect(() => {
    if (initialItems) {
      setItems(initialItems);
      return;
    }
    let active = true;
    fetchStoreProducts({ size: 100 })
      .then((res) => {
        if (active) {
          setItems(
            res.items
              .filter((product) => product.productType === kind)
              .map((product) => ({ ...product, status: "PUBLISHED" })),
          );
        }
      })
      .catch((err) => console.error("Failed to load catalog products:", err));
    return () => {
      active = false;
    };
  }, [initialItems, kind]);

  const isBundle = kind === "BUNDLE";
  const headings = [
    "Mã sản phẩm",
    "Thumbnail",
    "Tên sản phẩm",
    isBundle ? "Thành phần Bundle" : "Mô tả",
    "Giá bán",
    "Trạng thái Store",
    ...(canManage && !isBundle ? ["Thao tác"] : []),
  ];

  return (
    <>
      <p className="m-4 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800">
        <Info size={15} className="mt-0.5 shrink-0" />
        {COPY[kind].notice}
      </p>
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
            {items.map((item) => {
              const isDeleted =
                getDeletedProductIds().has(String(item.id)) ||
                item.status === "DELETED";
              const isArchived = !isDeleted && item.status === "ARCHIVED";
              const isUnpublished = !isDeleted && item.status === "UNPUBLISHED";

              return (
                <tr
                  key={item.id}
                  className={`border-b border-[#eef5f0] last:border-0 transition-all ${
                    isDeleted
                      ? "select-none bg-neutral-100/60 opacity-40 grayscale"
                      : "hover:bg-[#f9fdfa]"
                  }`}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-xs font-black text-primary-dark">
                    {item.id}
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
                    <span
                      className={isDeleted ? "text-neutral-500 line-through" : ""}
                    >
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
                    {isDeleted ? (
                      <span className="inline-flex rounded-full border border-neutral-300 bg-neutral-200 px-2.5 py-1 text-[11px] font-bold text-neutral-700">
                        Đã xóa
                      </span>
                    ) : isArchived ? (
                      <span className="inline-flex rounded-full border border-blue-300 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-800">
                        Đã lưu trữ
                      </span>
                    ) : isUnpublished ? (
                      <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                        Chưa mở bán (UNPUBLISHED)
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full border border-green-300 bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-800">
                        Hiển thị (PUBLISHED)
                      </span>
                    )}
                  </td>
                  {canManage && !isBundle && (
                    <td className="px-4 py-3">
                      {isDeleted ? null : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isUnpublished && onPublish && (
                            <button
                              type="button"
                              onClick={() => onPublish(item)}
                              className="inline-flex items-center gap-1 rounded-md border border-[#3b8555] bg-[#439660] px-2.5 py-1 text-xs font-bold text-white hover:bg-[#387e51]"
                            >
                              <Rocket size={12} /> Publish
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
                          {!isUnpublished && !isArchived && onUnlist && (
                            <button
                              type="button"
                              onClick={() => onUnlist(item)}
                              className="inline-flex items-center gap-1 rounded-md border border-[#cfe0d4] bg-white px-2 py-1 text-xs font-bold text-text-muted hover:bg-neutral-50"
                            >
                              <EyeOff size={12} /> Ẩn
                            </button>
                          )}
                          {!isArchived && onArchive && (
                            <button
                              type="button"
                              onClick={() => onArchive(item)}
                              className="inline-flex items-center gap-1 rounded-md border border-[#cfe0d4] bg-white px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50"
                            >
                              <Archive size={12} /> Lưu trữ
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
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={headings.length}
                  className="px-4 py-10 text-center text-xs font-semibold text-text-muted"
                >
                  Chưa có sản phẩm nào trong danh mục này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
