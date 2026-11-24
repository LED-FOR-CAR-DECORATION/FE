import { ApiError } from "@/api_client/core/ApiError";
import { getApiErrorMessage } from "@/lib/api/auth";

/** Chuyển mã lỗi nghiệp vụ Commission của backend thành câu dễ hiểu; còn lại dùng message backend trả về. */
export function commissionErrorMessage(failure: unknown, fallback: string) {
  const code = failure instanceof ApiError ? (failure.body as { code?: string } | undefined)?.code : undefined;
  switch (code) {
    case "COMMISSION_STAFF_LOCKED":
      return "Chỉ staff được giao commission này mới thực hiện được thao tác này.";
    case "COMMISSION_OWNERSHIP_MISMATCH":
      return "Bạn không có quyền với commission này.";
    case "INVALID_COMMISSION_STATUS_TRANSITION":
      return "Trạng thái commission đã thay đổi nên thao tác không còn hợp lệ. Nội dung sẽ được tải lại.";
    case "PAYMENT_SESSION_NOT_CANCELLABLE":
      return "Phiên thanh toán không thể hủy (có thể đã thanh toán hoặc đã hết hạn).";
    default:
      return getApiErrorMessage(failure, fallback);
  }
}
