import axios from "axios";
import {
  ApiError,
  LedModelItem,
  type UpdateStoreProductRequest,
  type UpdatedStoreProductResponse,
} from "@/api_client";
import { request } from "@/api_client/core/request";
import { getApiBaseUrl, OpenAPI } from "./client";
import { getSessionToken } from "../auth/session";
import { apiUpdateStoreProduct } from "./products";
import type { PaginationMeta } from "./ledInstances";

export interface ActiveFirmwareSummary {
  firmwareId: number;
  version: string;
  uploadedAt: string;
  installedDeviceCount?: number;
}

export interface ManagedLedModelItem extends LedModelItem {
  activeFirmware?: ActiveFirmwareSummary | null;
}

export interface LedSpecAttributeInput {
  label: string;
  value: string;
}

export interface LedModelSpecInput {
  widthPx: number;
  heightPx: number;
  attributes: LedSpecAttributeInput[];
}

export interface CreateLedModelPayload {
  modelName: string;
  stockQuantity: number;
  spec: LedModelSpecInput;
}

export interface UpdateLedModelPayload {
  modelName: string;
  stockQuantity: number;
  spec: LedModelSpecInput;
}

export interface FetchLedModelsParams {
  page?: number;
  size?: number;
  status?: LedModelItem.status;
  widthPx?: number;
  heightPx?: number;
  unlinkedToProductOnly?: boolean;
  lowStockOnly?: boolean;
  keyword?: string;
}

interface ApiEnvelope<T> {
  code?: number | string;
  message?: string;
  data?: T;
  meta?: Partial<PaginationMeta>;
}

function normalizePaginationMeta(
  rawMeta: unknown,
  fallbackPage: number,
  fallbackSize: number,
  itemCount: number,
): PaginationMeta {
  const meta = (
    rawMeta && typeof rawMeta === "object" ? rawMeta : {}
  ) as Partial<PaginationMeta>;
  const page = typeof meta.page === "number" ? meta.page : fallbackPage;
  const size = typeof meta.size === "number" ? meta.size : fallbackSize;
  const totalElements =
    typeof meta.totalElements === "number" ? meta.totalElements : itemCount;
  const totalPages =
    typeof meta.totalPages === "number"
      ? meta.totalPages
      : Math.max(1, Math.ceil(totalElements / Math.max(1, size)));
  const hasPrevious =
    typeof meta.hasPrevious === "boolean" ? meta.hasPrevious : page > 0;
  const hasNext =
    typeof meta.hasNext === "boolean" ? meta.hasNext : page + 1 < totalPages;

  return {
    page,
    size,
    totalElements,
    totalPages,
    hasNext,
    hasPrevious,
  };
}

export function formatLedModelError(
  error: unknown,
  fallbackMessage = "Thao tác với mẫu LED thất bại. Vui lòng thử lại.",
): string {
  const axiosErr = error as {
    response?: {
      status?: number;
      data?: {
        code?: string;
        message?: string;
        details?: Array<{ field?: string; message?: string; reason?: string }>;
      };
    };
    message?: string;
  };

  let status: number | undefined;
  let code: string | undefined;
  let serverMessage: string | undefined;
  let details: Array<{ field?: string; message?: string; reason?: string }> = [];

  if (error instanceof ApiError) {
    status = error.status;
    const body = error.body as
      | {
          code?: string;
          message?: string;
          details?: Array<{ field?: string; message?: string; reason?: string }>;
        }
      | undefined;
    code = body?.code;
    serverMessage = body?.message;
    details = Array.isArray(body?.details) ? body.details : [];
  } else if (axiosErr?.response) {
    status = axiosErr.response.status;
    code = axiosErr.response.data?.code;
    serverMessage = axiosErr.response.data?.message;
    details = Array.isArray(axiosErr.response.data?.details)
      ? axiosErr.response.data.details
      : [];
  }

  if (status === 401) {
    return "Phiên đăng nhập đã hết hạn hoặc thiếu xác thực (401). Vui lòng đăng nhập lại.";
  }
  if (status === 403) {
    return "Bạn không có quyền thực hiện thao tác này. Chỉ Quản lý hoặc Quản trị viên mới được thêm, cập nhật hoặc ngừng kinh doanh mẫu LED (403).";
  }
  if (code === "LED_MODEL_DIMENSIONS_LOCKED") {
    return "Không thể thay đổi kích thước điểm ảnh (Rộng × Cao) vì mẫu LED này đã có thiết bị thực tế trong kho hoặc đang lưu hành.";
  }
  if (code === "DUPLICATE_LED_MODEL_NAME") {
    return "Tên mẫu LED đã tồn tại trong kho. Vui lòng chọn một tên khác.";
  }
  if (code === "LED_MODEL_NOT_FOUND" || status === 404) {
    return "Không tìm thấy mẫu LED yêu cầu trên hệ thống (404).";
  }
  if (status === 400) {
    if (details.length > 0) {
      const detailText = details
        .map((d) =>
          d.field
            ? `${d.field}: ${d.message ?? d.reason ?? "không hợp lệ"}`
            : d.message ?? d.reason,
        )
        .filter(Boolean)
        .join("; ");
      if (detailText) {
        return `Dữ liệu không hợp lệ (400): ${detailText}`;
      }
    }
    if (serverMessage) return `Dữ liệu không hợp lệ (400): ${serverMessage}`;
    return "Dữ liệu mẫu LED không hợp lệ. Vui lòng kiểm tra lại các trường bắt buộc.";
  }
  if (status === 409) {
    return serverMessage || "Xung đột dữ liệu mẫu LED (409).";
  }
  if (serverMessage) return serverMessage;
  if (error instanceof Error && error.message) return error.message;
  return fallbackMessage;
}

/**
 * DEV-01: Lấy danh sách Mẫu LED phần cứng có phân trang & bộ lọc
 * GET /api/management/admin/led-models
 */
export async function fetchLedModelsPage(
  params: FetchLedModelsParams = {},
): Promise<{ items: ManagedLedModelItem[]; meta: PaginationMeta }> {
  const page = params.page ?? 0;
  const size = params.size ?? 10;
  const trimmedKeyword = params.keyword?.trim();

  const res = await request<ApiEnvelope<ManagedLedModelItem[]>>(OpenAPI, {
    method: "GET",
    url: "/api/management/admin/led-models",
    query: {
      page,
      size,
      status: params.status,
      widthPx: params.widthPx,
      heightPx: params.heightPx,
      unlinkedToProductOnly: params.unlinkedToProductOnly,
      lowStockOnly: params.lowStockOnly,
      keyword: trimmedKeyword ? trimmedKeyword : undefined,
    },
  });

  const items = Array.isArray(res.data) ? res.data : [];
  return {
    items,
    meta: normalizePaginationMeta(res.meta, page, size, items.length),
  };
}

/**
 * DEV-02: Tạo mới Mẫu LED phần cứng trong kho
 * POST /api/management/admin/led-models
 */
export async function apiCreateLedModel(
  payload: CreateLedModelPayload,
): Promise<ManagedLedModelItem> {
  const token = await getSessionToken();
  const { data } = await axios.post<ApiEnvelope<ManagedLedModelItem>>(
    "/api/management/admin/led-models",
    payload,
    {
      baseURL: getApiBaseUrl(),
      withCredentials: OpenAPI.WITH_CREDENTIALS,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
  if (!data?.data) {
    throw new Error("Không nhận được dữ liệu mẫu LED từ máy chủ.");
  }
  return data.data;
}

/**
 * DEV-03: Cập nhật Mẫu LED phần cứng trong kho
 * PUT /api/management/admin/led-models/{id}
 */
export async function apiUpdateLedModel(
  modelId: number,
  payload: UpdateLedModelPayload,
): Promise<ManagedLedModelItem> {
  const token = await getSessionToken();
  const { data } = await axios.put<ApiEnvelope<ManagedLedModelItem>>(
    `/api/management/admin/led-models/${modelId}`,
    payload,
    {
      baseURL: getApiBaseUrl(),
      withCredentials: OpenAPI.WITH_CREDENTIALS,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
  if (!data?.data) {
    throw new Error("Không nhận được dữ liệu mẫu LED sau khi cập nhật.");
  }
  return data.data;
}

export interface UpdateLedModelWithProductResult {
  model: ManagedLedModelItem;
  product?: UpdatedStoreProductResponse;
  productSyncError?: string;
}

/**
 * DEV-03 + Store Product Update: Cập nhật Mẫu LED và đồng bộ sản phẩm Cửa hàng liên kết (nếu có)
 * PUT /api/management/admin/led-models/{id}
 * PUT /api/management/admin/store/products/{productId}
 */
export async function apiUpdateLedModelWithProduct(
  modelId: number,
  payload: UpdateLedModelPayload,
  productSync?: {
    productId?: number | null;
    payload: UpdateStoreProductRequest;
  },
): Promise<UpdateLedModelWithProductResult> {
  const updatedModel = await apiUpdateLedModel(modelId, payload);
  const targetProductId = updatedModel.productId ?? productSync?.productId ?? null;

  if (targetProductId == null || !productSync?.payload) {
    return { model: updatedModel };
  }

  try {
    const updatedProduct = await apiUpdateStoreProduct(
      targetProductId,
      productSync.payload,
    );
    return {
      model: updatedModel,
      product: updatedProduct,
    };
  } catch (err) {
    return {
      model: updatedModel,
      productSyncError: formatLedModelError(
        err,
        "Cập nhật sản phẩm Cửa hàng liên kết thất bại.",
      ),
    };
  }
}

/**
 * DEV-04: Ngừng kinh doanh (soft-deprecate) Mẫu LED phần cứng
 * DELETE /api/management/admin/led-models/{id}
 */
export async function apiDeprecateLedModel(modelId: number): Promise<void> {
  const token = await getSessionToken();
  await axios.delete(`/api/management/admin/led-models/${modelId}`, {
    baseURL: getApiBaseUrl(),
    withCredentials: OpenAPI.WITH_CREDENTIALS,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}
