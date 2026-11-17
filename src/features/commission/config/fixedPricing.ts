export const COMMISSION_SIZES = { "32x32": 50_000, "32x64": 100_000, "64x64": 200_000 };
export const MIN_COMMISSION_FRAMES = 2;
export const MAX_COMMISSION_FRAMES = 8;
export const COMMISSION_FRAME_PRICE = 50_000;

export type CommissionDesign = {
  size: keyof typeof COMMISSION_SIZES;
  format: "image" | "gif";
  frames: string;
  detail: string;
  background: string;
  artStyle: string;
  framing: string;
  characterCount: string;
  palette: string;
  pose: string;
  subject: string;
  outline: string;
};

export type CommissionDesignField = {
  key: Exclude<keyof CommissionDesign, "frames">;
  label: string;
  options: readonly { value: string; label: string }[];
};

const options = (...labels: string[]) => labels.map((label) => ({ value: label, label }));

export const COMMISSION_DESIGN_FIELDS: readonly CommissionDesignField[] = [
  { key: "subject", label: "Đối tượng chính", options: options("Nhân vật", "Biểu tượng (icon)", "Logo", "Đồ vật") },
  { key: "format", label: "Định dạng", options: [
    { value: "image", label: "Ảnh tĩnh" }, { value: "gif", label: "GIF động" },
  ] },
  { key: "size", label: "Kích thước ma trận LED", options:
    Object.keys(COMMISSION_SIZES).map((value) => ({ value, label: value.replace("x", " × ") })),
  },
  { key: "detail", label: "Độ chi tiết", options: options("Cơ bản", "Vừa", "Cao") },
  { key: "background", label: "Phông nền", options: options("Trong suốt", "Đơn sắc", "Nền đơn giản", "Bối cảnh tùy chỉnh") },
  { key: "artStyle", label: "Phong cách", options: [{ value: "", label: "Chưa chọn" }, ...options("Pixel art thường", "Chibi")] },
  { key: "framing", label: "Khung hình nhân vật", options: [{ value: "", label: "Chưa chọn" }, ...options("Chân dung", "Từ ngực trở lên", "Nửa người", "Toàn thân")] },
  { key: "characterCount", label: "Số nhân vật", options: [
    { value: "1", label: "1 nhân vật" }, { value: "2", label: "2 nhân vật" },
    { value: "3+", label: "3 nhân vật trở lên (ghi rõ trong brief)" },
  ] },
  { key: "palette", label: "Bảng màu", options: [
    { value: "", label: "Chưa chọn" }, ...options("Ấm", "Lạnh", "Tương phản cao", "Neon", "Theo ảnh tham khảo"),
  ] },
  { key: "outline", label: "Đường viền", options: options("Không viền", "Viền trắng", "Viền màu sáng", "Theo brief") },
  { key: "pose", label: "Tư thế nhân vật", options: [
    { value: "", label: "Chưa chọn" }, ...options("Đứng yên", "Đang chuyển động", "Theo brief"),
  ] },
];

export function commissionTotal(design: CommissionDesign): number | null {
  if (design.format === "image") return COMMISSION_SIZES[design.size];
  const frames = Number(design.frames);
  return Number.isInteger(frames) && frames >= MIN_COMMISSION_FRAMES && frames <= MAX_COMMISSION_FRAMES
    ? frames * COMMISSION_FRAME_PRICE
    : null;
}

export const formatCommissionMoney = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
