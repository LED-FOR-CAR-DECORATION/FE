import { CheckCircle2, Clock3, EyeOff } from "lucide-react";
import type { ListingStatus } from "../types";

/** Vietnamese display labels. Underlying values stay as defined in the domain types. */
export const STATUS_LABEL: Record<ListingStatus, string> = {
  "Pending Review": "Chờ duyệt",
  Published: "Đã publish",
  Hidden: "Đã ẩn",
};

const STATUS_STYLE: Record<ListingStatus, { className: string; icon: React.ReactNode }> = {
  "Pending Review": { className: "border-amber-300 bg-amber-50 text-amber-800", icon: <Clock3 size={12} /> },
  Published: { className: "border-green-300 bg-green-50 text-green-800", icon: <CheckCircle2 size={12} /> },
  Hidden: { className: "border-gray-300 bg-gray-100 text-gray-600", icon: <EyeOff size={12} /> },
};

export default function StatusBadge({ status }: { status: ListingStatus }) {
  const { className, icon } = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${className}`}>
      {icon}
      {STATUS_LABEL[status]}
    </span>
  );
}
