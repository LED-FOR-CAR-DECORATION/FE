export const COMMISSION_STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Chờ duyệt",
  PENDING_PAYMENT: "Chờ thanh toán",
  PAID: "Đã thanh toán · Chờ phân công",
  IN_PROGRESS: "Đang thiết kế",
  INTERNAL_REVIEW: "Đang duyệt nội bộ",
  INTERNAL_REVISION_REQUIRED: "Đang chỉnh sửa nội bộ",
  PREVIEW_DELIVERED: "Đã gửi bản xem trước",
  AWAITING_EXTRA_PAYMENT: "Chờ thanh toán bổ sung",
  AWAITING_ESTIMATE: "Chờ designer dự kiến thời gian sửa",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  EXPIRED: "Hết hạn",
};

export function commissionStatusLabel(status?: string | null) {
  return status ? COMMISSION_STATUS_LABELS[status] ?? status : "—";
}

function formatDepositVnd(rawAmount: string): string {
  const numeric = Number(rawAmount.replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric.toLocaleString("vi-VN") : rawAmount;
}

const LEGACY_SYSTEM_MESSAGE_MAP: Record<string, string> = {
  "Payment confirmed. Initial deposit of the required deposit received. Commission workflow and chat room are now unlocked.":
    "Đã xác nhận thanh toán. Đã nhận khoản cọc theo yêu cầu. Quy trình thiết kế và phòng trò chuyện hiện đã được mở khóa.",
  "This commission has been reassigned to a new staff member and designer.":
    "Yêu cầu thiết kế này đã được phân công lại cho nhân viên hỗ trợ và nhà thiết kế mới.",
  "This commission has been reassigned to a new designer.":
    "Yêu cầu thiết kế này đã được phân công lại cho nhà thiết kế mới.",
  "This commission has been reassigned to a new staff member.":
    "Yêu cầu thiết kế này đã được phân công lại cho nhân viên hỗ trợ mới.",
};

/**
 * Chuẩn hóa thông báo SYSTEM tiếng Anh cũ đã lưu trong DB sang tiếng Việt để hiển thị thống nhất trên UI.
 */
export function formatCommissionSystemMessage(content?: string | null): string {
  if (!content) return "";
  const trimmed = content.trim();
  const directMatch = LEGACY_SYSTEM_MESSAGE_MAP[trimmed];
  if (directMatch) return directMatch;

  const paymentMatch = trimmed.match(
    /^Payment confirmed\. Initial deposit of ([\d.,]+)\s*VND received\. Commission workflow and chat room are now unlocked\.$/i,
  );
  if (paymentMatch) {
    return `Đã xác nhận thanh toán. Đã nhận khoản cọc ban đầu ${formatDepositVnd(paymentMatch[1])} VNĐ. Quy trình thiết kế và phòng trò chuyện hiện đã được mở khóa.`;
  }

  const autoCompleteMatch = trimmed.match(
    /^No response within 7 days [—–-] preview version (\d+) was accepted automatically\. The commission is now completed\.$/i,
  );
  if (autoCompleteMatch) {
    return `Không có phản hồi trong vòng 7 ngày — bản xem trước phiên bản ${autoCompleteMatch[1]} đã được tự động chấp nhận. Yêu cầu thiết kế hiện đã hoàn tất.`;
  }

  const customerApprovedMatch = trimmed.match(
    /^Customer approved preview version (\d+)\. The commission is now completed\.$/i,
  );
  if (customerApprovedMatch) {
    return `Khách hàng đã phê duyệt bản xem trước phiên bản ${customerApprovedMatch[1]}. Yêu cầu thiết kế hiện đã hoàn tất.`;
  }

  const revisionEstimateMatch = trimmed.match(
    /^Revision #(\d+) is now in progress\. Expected delivery by (.+)\.$/i,
  );
  if (revisionEstimateMatch) {
    return `Yêu cầu chỉnh sửa #${revisionEstimateMatch[1]} đang được thực hiện. Dự kiến bàn giao trước ${revisionEstimateMatch[2]}.`;
  }

  return content;
}
