export const COMMISSION_STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Chờ duyệt",
  PENDING_PAYMENT: "Chờ thanh toán",
  PAID: "Đã thanh toán · Chờ phân công",
  IN_PROGRESS: "Đang thiết kế",
  INTERNAL_REVIEW: "Đang duyệt nội bộ",
  INTERNAL_REVISION_REQUIRED: "Đang chỉnh sửa nội bộ",
  PREVIEW_DELIVERED: "Đã gửi bản xem trước",
  AWAITING_EXTRA_PAYMENT: "Chờ thanh toán bổ sung",
  CUSTOMER_REVISION_REQUESTED: "Khách yêu cầu chỉnh sửa",
  AWAITING_ESTIMATE: "Chờ báo giá",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  EXPIRED: "Hết hạn",
};

export function commissionStatusLabel(status?: string | null) {
  return status ? COMMISSION_STATUS_LABELS[status] ?? status : "—";
}
