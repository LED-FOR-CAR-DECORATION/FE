import type { StoreProductStatus } from "../types";

/** Labels aligned 1-to-1 with backend `ProductStatus`. */
export const STATUS_LABEL: Record<StoreProductStatus, string> = {
  UNPUBLISHED: "Chờ duyệt",
  PUBLISHED: "Đang bán",
  ARCHIVED: "Ngừng bán",
  DELETED: "Đã xóa",
};

const STATUS_STYLE: Record<StoreProductStatus, string> = {
  UNPUBLISHED: "border-amber-300 bg-amber-50 text-amber-800",
  PUBLISHED: "border-green-300 bg-green-50 text-green-800",
  ARCHIVED: "border-blue-300 bg-blue-50 text-blue-800",
  DELETED: "border-neutral-300 bg-neutral-200 text-neutral-700",
};

export default function StatusBadge({ status }: { status: StoreProductStatus | string }) {
  const normalized = (status in STATUS_STYLE ? status : "UNPUBLISHED") as StoreProductStatus;
  const className = STATUS_STYLE[normalized];
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${className}`}>
      {STATUS_LABEL[normalized]}
    </span>
  );
}
