import type { FirmwareStatus } from "@/lib/api/firmware";

const STYLES: Record<FirmwareStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Đang phát hành", className: "border-emerald-200 bg-emerald-50 text-[#0F5B38]" },
  SUPERSEDED: { label: "Bản cũ", className: "border-gray-200 bg-gray-50 text-gray-600" },
  DEPRECATED: { label: "Đã thu hồi", className: "border-red-200 bg-red-50 text-red-700" },
};

export const FIRMWARE_STATUS_LABELS: Record<FirmwareStatus, string> = {
  ACTIVE: STYLES.ACTIVE.label,
  SUPERSEDED: STYLES.SUPERSEDED.label,
  DEPRECATED: STYLES.DEPRECATED.label,
};

export default function FirmwareStatusBadge({ status }: { status: FirmwareStatus }) {
  const style = STYLES[status];
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${style.className}`}>
      {style.label}
    </span>
  );
}
