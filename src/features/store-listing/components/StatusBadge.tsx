import type { StoreProductStatus } from "../types";

/** Labels aligned 1-to-1 with backend `ProductStatus`. */
export const STATUS_LABEL: Record<StoreProductStatus, string> = {
  UNPUBLISHED: "Chờ duyệt",
  PUBLISHED: "Đang bán",
  ARCHIVED: "Ngừng bán",
  DELETED: "Đã xóa",
};

const STATUS_STYLE: Record<StoreProductStatus, string> = {
  UNPUBLISHED: "bg-[#fef08a] text-black",
  PUBLISHED: "bg-primary text-black",
  ARCHIVED: "bg-gray-200 text-black",
  DELETED: "bg-[#fecaca] text-black",
};

export default function StatusBadge({ status }: { status: StoreProductStatus | string }) {
  const normalized = (status in STATUS_STYLE ? status : "UNPUBLISHED") as StoreProductStatus;
  const className = STATUS_STYLE[normalized];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap border border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-[1px_1px_0_0_#000] ${className}`}
    >
      {STATUS_LABEL[normalized]}
    </span>
  );
}
