import {
  ApiError,
  LedInstanceDetailResponse,
  LedInstanceFilterRequest,
  LedInstanceItem,
  LedModelItem,
  ModelInfo,
  type ApiResponseLedInstanceDetailResponse,
  type ApiResponseListLedInstanceItem,
  type ApiResponseListLedModelItem,
} from "@/api_client";
import { request } from "@/api_client/core/request";
import { OpenAPI } from "./client";

export {
  LedInstanceDetailResponse,
  LedInstanceFilterRequest,
  LedInstanceItem,
  LedModelItem,
  ModelInfo,
};

export interface PaginationMeta {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface FetchLedInstancesParams {
  page?: number;
  size?: number;
  modelId?: number;
  status?: LedInstanceFilterRequest.status;
  search?: string;
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

export function formatLedInventoryError(
  error: unknown,
  fallbackMessage = "Không thể tải dữ liệu thiết bị LED.",
): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    }
    if (error.status === 403) {
      return "Bạn không có quyền truy cập chức năng này (chỉ dành cho Quản lý hoặc Quản trị viên).";
    }
    if (error.status === 404) {
      return "Không tìm thấy thiết bị LED yêu cầu.";
    }
    const serverMessage =
      error.body &&
      typeof error.body === "object" &&
      typeof error.body.message === "string"
        ? error.body.message
        : null;
    if (serverMessage) return serverMessage;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallbackMessage;
}

export async function fetchLedInstances(
  params: FetchLedInstancesParams = {},
): Promise<{ items: LedInstanceItem[]; meta: PaginationMeta }> {
  const page = params.page ?? 0;
  const size = params.size ?? 10;
  const trimmedSearch = params.search?.trim();

  const res = await request<ApiResponseListLedInstanceItem>(OpenAPI, {
    method: "GET",
    url: "/api/management/admin/led-instances",
    query: {
      page,
      size,
      modelId: params.modelId,
      status: params.status,
      search: trimmedSearch ? trimmedSearch : undefined,
    },
    errors: {
      400: "Tham số lọc hoặc phân trang không hợp lệ.",
      401: "Vui lòng đăng nhập lại.",
      403: "Bạn không có quyền truy cập danh sách thiết bị LED.",
      500: "Lỗi máy chủ khi tải danh sách thiết bị LED.",
    },
  });

  const items = res.data ?? [];
  return {
    items,
    meta: normalizePaginationMeta(res.meta, page, size, items.length),
  };
}

export async function fetchLedInstanceDetail(
  id: number,
): Promise<LedInstanceDetailResponse> {
  const res = await request<ApiResponseLedInstanceDetailResponse>(OpenAPI, {
    method: "GET",
    url: "/api/management/admin/led-instances/{id}",
    path: { id },
    errors: {
      400: "Mã thiết bị LED không hợp lệ.",
      401: "Vui lòng đăng nhập lại.",
      403: "Bạn không có quyền xem chi tiết thiết bị LED.",
      404: "Không tìm thấy thiết bị LED này.",
      500: "Lỗi máy chủ khi tải chi tiết thiết bị LED.",
    },
  });

  if (!res.data) {
    throw new Error("Không tìm thấy dữ liệu chi tiết thiết bị LED.");
  }

  return res.data;
}

export async function fetchManagedLedModels(params?: {
  unlinkedToProductOnly?: boolean;
  keyword?: string;
}): Promise<LedModelItem[]> {
  try {
    const res = await request<ApiResponseListLedModelItem>(OpenAPI, {
      method: "GET",
      url: "/api/management/admin/led-models",
      query: {
        page: 0,
        size: 100,
        unlinkedToProductOnly: params?.unlinkedToProductOnly,
        keyword: params?.keyword?.trim() || undefined,
      },
    });
    return res.data ?? [];
  } catch {
    return [];
  }
}
