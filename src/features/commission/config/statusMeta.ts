/**
 * Shared presentation helpers for customer-facing Commission status badges,
 * tier labels, date formatting, and price breakdown snapshot parsing.
 */

export type CommissionStatusTone = "warning" | "info" | "accent" | "success" | "danger";

export interface CommissionStatusMeta {
  label: string;
  helper: string;
  tone: CommissionStatusTone;
}

export const COMMISSION_STATUS_META: Record<string, CommissionStatusMeta> = {
  PENDING_REVIEW: {
    label: "Chờ nhân viên duyệt",
    helper: "Nhân viên đang kiểm tra yêu cầu và xác nhận báo giá cho bạn.",
    tone: "warning",
  },
  PENDING_PAYMENT: {
    label: "Chờ thanh toán",
    helper: "Thanh toán đơn đặt cọc để mở phòng trao đổi trực tiếp với họa sĩ.",
    tone: "warning",
  },
  PAID: {
    label: "Đã thanh toán · Chờ phân công",
    helper: "Phòng trao đổi đã mở — hệ thống đang phân công họa sĩ phụ trách.",
    tone: "info",
  },
  IN_PROGRESS: {
    label: "Đang thiết kế",
    helper: "Họa sĩ đang thực hiện bản vẽ. Bạn có thể trao đổi trực tiếp trong phòng chat.",
    tone: "info",
  },
  INTERNAL_REVIEW: {
    label: "Đang kiểm duyệt bản nháp",
    helper: "Bản nháp đang được kiểm tra chất lượng trước khi gửi đến bạn.",
    tone: "info",
  },
  INTERNAL_REVISION_REQUIRED: {
    label: "Đang hoàn thiện bản nháp",
    helper: "Họa sĩ đang tinh chỉnh lại bản nháp theo chuẩn hiển thị LED.",
    tone: "info",
  },
  PREVIEW_DELIVERED: {
    label: "Đã gửi bản xem trước",
    helper: "Bản xem trước đã sẵn sàng! Mở trao đổi để xem, duyệt hoặc yêu cầu chỉnh sửa.",
    tone: "accent",
  },
  AWAITING_EXTRA_PAYMENT: {
    label: "Chờ thanh toán phí sửa",
    helper: "Cần thanh toán phí chỉnh sửa phát sinh để họa sĩ tiếp tục.",
    tone: "warning",
  },
  CUSTOMER_REVISION_REQUESTED: {
    label: "Đã gửi yêu cầu chỉnh sửa",
    helper: "Yêu cầu chỉnh sửa của bạn đang được xử lý.",
    tone: "info",
  },
  AWAITING_ESTIMATE: {
    label: "Chờ dự kiến thời gian sửa",
    helper: "Họa sĩ đang cập nhật thời gian hoàn thiện bản chỉnh sửa.",
    tone: "info",
  },
  COMPLETED: {
    label: "Hoàn thành",
    helper: "Thiết kế đã hoàn tất. Bạn có thể xem lại toàn bộ lịch sử trao đổi.",
    tone: "success",
  },
  CANCELLED: {
    label: "Đã hủy",
    helper: "Yêu cầu thiết kế này đã được hủy.",
    tone: "danger",
  },
  EXPIRED: {
    label: "Hết hạn thanh toán",
    helper: "Quá thời hạn thanh toán báo giá.",
    tone: "danger",
  },
};

export const STATUS_TONE_CLASS: Record<CommissionStatusTone, string> = {
  warning: "border-amber-600 bg-amber-50 text-amber-900",
  info: "border-black bg-primary/15 text-primary-ink",
  accent: "border-black bg-primary text-black",
  success: "border-black bg-primary/25 text-primary-ink",
  danger: "border-red-600 bg-red-50 text-red-700",
};

const TIER_LABELS: Record<string, string> = {
  BASIC: "Gói Cơ bản",
  ADVANCED: "Gói Nâng cao",
  CUSTOM: "Gói Tùy chỉnh",
};

export function getTierLabel(tierCode?: string | null): string {
  if (!tierCode) return "Tùy chỉnh";
  return TIER_LABELS[tierCode] ?? tierCode;
}

export function getStatusMeta(status?: string | null): CommissionStatusMeta {
  if (!status) {
    return { label: "Không xác định", helper: "", tone: "info" };
  }
  return (
    COMMISSION_STATUS_META[status] ?? {
      label: status,
      helper: "",
      tone: "info",
    }
  );
}

export function isPaymentPendingStatus(status?: string | null): boolean {
  return status === "PENDING_PAYMENT" || status === "AWAITING_EXTRA_PAYMENT";
}

export function formatCommissionDate(iso?: string | null, withTime = false): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", withTime
    ? {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    : {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
}

export interface ParsedPriceBreakdown {
  tierCode?: string;
  tierName?: string;
  basePrice?: number;
  maxRevisions?: number;
  selections?: Array<{
    configId?: number;
    ruleName?: string;
    selectionType?: string;
    quantity?: number | null;
    textValue?: string | null;
    computedLineAmount?: number;
    selectedOptions?: Array<{
      optionId?: number;
      optionLabel?: string;
      includedInPreset?: boolean;
      computedAmount?: number;
    }>;
  }>;
  computedInitialPrice?: number;
  totalPrice?: number;
}

export function parsePriceBreakdown(raw?: string | null): ParsedPriceBreakdown | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ParsedPriceBreakdown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}
