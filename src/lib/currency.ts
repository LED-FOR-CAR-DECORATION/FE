/**
 * Định dạng tiền tệ thống nhất theo chuẩn Việt Nam Đồng (VNĐ).
 * Ví dụ: 699000 -> "699.000 VNĐ"
 */
export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || isNaN(price)) {
    return "0 VNĐ";
  }
  return `${price.toLocaleString("vi-VN")} VNĐ`;
}

