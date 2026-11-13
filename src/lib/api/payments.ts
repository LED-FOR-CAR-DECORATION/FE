import {
  ApiError,
  PaymentService,
  type ErrorResponse,
  type PaymentSessionResponse,
} from "@/api_client";

export type { PaymentSessionResponse };

const PAYMENT_ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_FAILED: "Mã giao dịch thanh toán không hợp lệ.",
  UNAUTHORIZED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  FORBIDDEN: "Bạn không có quyền truy cập phiên thanh toán này.",
  PAYMENT_SESSION_NOT_FOUND: "Không tìm thấy phiên thanh toán cho đơn hàng này.",
  INTERNAL_SERVER_ERROR: "Lỗi máy chủ khi tải thông tin thanh toán.",
};

export function getPaymentErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body as ErrorResponse | undefined;
    const code = (body as { code?: string } | undefined)?.code;
    if (code && PAYMENT_ERROR_MESSAGES[code]) {
      return PAYMENT_ERROR_MESSAGES[code];
    }
    if (error.status === 400) return PAYMENT_ERROR_MESSAGES.VALIDATION_FAILED;
    if (error.status === 401) return PAYMENT_ERROR_MESSAGES.UNAUTHORIZED;
    if (error.status === 403) return PAYMENT_ERROR_MESSAGES.FORBIDDEN;
    if (error.status === 404) return PAYMENT_ERROR_MESSAGES.PAYMENT_SESSION_NOT_FOUND;
    if (error.status >= 500) return PAYMENT_ERROR_MESSAGES.INTERNAL_SERVER_ERROR;

    const detail = body?.details?.find((d) => d.message)?.message;
    if (body?.message) return body.message;
    if (detail) return detail;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Không thể tải thông tin thanh toán SePay. Vui lòng thử lại.";
}

export async function fetchPaymentSession(paymentCode: string): Promise<PaymentSessionResponse> {
  const normalizedCode = paymentCode.trim();
  if (!normalizedCode) {
    throw new Error("Mã thanh toán không hợp lệ.");
  }

  try {
    const res = await PaymentService.getPaymentSession(normalizedCode);
    if (!res.data) {
      throw new Error("Không nhận được dữ liệu phiên thanh toán từ máy chủ.");
    }
    return res.data;
  } catch (error) {
    throw new Error(getPaymentErrorMessage(error));
  }
}

