/**
 * Ảnh đại diện theo commission (không theo khách): một khách có thể đặt nhiều commission,
 * nên mỗi commission có màu riêng (băm từ mã) và hiện mã #id để phân biệt nhanh trong hộp thư.
 */
const PALETTE = ["#1f432b", "#2d6a4f", "#7c3aed", "#b45309", "#be185d", "#1d4ed8", "#0f766e", "#9a3412"];

export default function CommissionAvatar({ commissionId, size = "md", badge }: {
  commissionId: number;
  size?: "sm" | "md";
  /** Chấm nhỏ ở góc, ví dụ bản nháp đang chờ duyệt. */
  badge?: boolean;
}) {
  const color = PALETTE[commissionId % PALETTE.length];
  const dimension = size === "sm" ? "h-10 w-10 text-[11px]" : "h-12 w-12 text-xs";
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: color }}
      className={`relative flex ${dimension} shrink-0 items-center justify-center border-2 border-black font-mono font-black text-white shadow-[2px_2px_0_0_#000]`}
    >
      #{commissionId}
      {badge && (
        <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 border-2 border-black bg-amber-400" />
      )}
    </span>
  );
}
