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
};

export function commissionTotal(design: CommissionDesign): number | null {
  if (design.format === "image") return COMMISSION_SIZES[design.size];
  const frames = Number(design.frames);
  return Number.isInteger(frames) && frames >= MIN_COMMISSION_FRAMES && frames <= MAX_COMMISSION_FRAMES
    ? frames * COMMISSION_FRAME_PRICE
    : null;
}

export const formatCommissionMoney = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
