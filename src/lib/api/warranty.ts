import axios from "axios";
import { getApiBaseUrl, OpenAPI } from "./client";
import { getSessionToken } from "../auth/session";
import type { CustomerDeviceItem } from "@/api_client/models/CustomerDeviceItem";

export type WarrantyStatus = "NOT_ACTIVATED" | "ACTIVE" | "EXPIRED";
export type WarrantyTicketStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";

export interface WarrantyClaimItem {
  ticketId: number;
  deviceId?: number;
  deviceSerialNumber?: string;
  serialNumber?: string;
  deviceName?: string;
  status: WarrantyTicketStatus;
  issueDescription: string;
  evidenceMediaUrls: string[];
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerWarrantyResponse {
  deviceId: number;
  serialNumber: string;
  deviceSerialNumber: string;
  deviceName: string;
  warrantyStatus: WarrantyStatus;
  warrantyExpiresAt: string | null;
  remainingDays: number;
  remainingWarrantyDays: number;
  activeTicket: WarrantyClaimItem | null;
  ticketHistory: WarrantyClaimItem[];
  claims: WarrantyClaimItem[];
}

export interface CreateWarrantyClaimRequest {
  issueDescription: string;
  evidenceMediaUrls?: string[];
}

export interface ManagementWarrantyClaimItem extends WarrantyClaimItem {
  customerId: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
}

export interface ManagementWarrantyClaimsResponse {
  items: ManagementWarrantyClaimItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ProcessWarrantyClaimRequest {
  status: "APPROVED" | "REJECTED" | "COMPLETED";
  resolutionNotes?: string;
}

export const WARRANTY_CHANGED_EVENT = "lumintra-warranty-changed";

async function getAuthHeader() {
  const token = await getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Lấy danh sách thiết bị thuộc sở hữu của khách hàng
 * GET /api/devices?page=0&size=50
 */
export async function getCustomerDevices(): Promise<CustomerDeviceItem[]> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeader();

  try {
    const res = await axios.get<{
      code?: string;
      data?: CustomerDeviceItem[];
    }>(`${baseUrl}/api/devices?page=0&size=50`, {
      headers,
      withCredentials: OpenAPI.WITH_CREDENTIALS,
    });
    return res.data?.data || [];
  } catch (err: any) {
    console.error("Lỗi khi tải danh sách thiết bị:", err);
    throw new Error(err.response?.data?.message || "Không thể tải danh sách thiết bị.");
  }
}

/**
 * 4.1 Khách hàng xem thông tin bảo hành & lịch sử khiếu nại của thiết bị
 * GET /api/devices/{id}/warranty
 */
export async function getCustomerDeviceWarranty(
  deviceId: number
): Promise<CustomerWarrantyResponse> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeader();

  try {
    const response = await axios.get<{
      code?: string;
      data: any;
    }>(`${baseUrl}/api/devices/${deviceId}/warranty`, {
      headers,
      withCredentials: OpenAPI.WITH_CREDENTIALS,
    });

    const raw = response.data?.data;
    if (!raw) {
      throw new Error("Không nhận được dữ liệu bảo hành từ máy chủ.");
    }

    const history: WarrantyClaimItem[] = (raw.ticketHistory || raw.claims || []).map((t: any) => ({
      ticketId: t.ticketId,
      deviceId: raw.deviceId ?? deviceId,
      serialNumber: raw.serialNumber || raw.deviceSerialNumber || "",
      deviceSerialNumber: raw.deviceSerialNumber || raw.serialNumber || "",
      deviceName: raw.deviceName || "",
      status: t.status,
      issueDescription: t.issueDescription || "",
      evidenceMediaUrls: Array.isArray(t.evidenceMediaUrls) ? t.evidenceMediaUrls : [],
      resolutionNotes: t.resolutionNotes || null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    const active: WarrantyClaimItem | null = raw.activeTicket
      ? {
          ticketId: raw.activeTicket.ticketId,
          deviceId: raw.deviceId ?? deviceId,
          serialNumber: raw.serialNumber || raw.deviceSerialNumber || "",
          deviceSerialNumber: raw.deviceSerialNumber || raw.serialNumber || "",
          deviceName: raw.deviceName || "",
          status: raw.activeTicket.status,
          issueDescription: raw.activeTicket.issueDescription || "",
          evidenceMediaUrls: Array.isArray(raw.activeTicket.evidenceMediaUrls) ? raw.activeTicket.evidenceMediaUrls : [],
          resolutionNotes: raw.activeTicket.resolutionNotes || null,
          createdAt: raw.activeTicket.createdAt,
          updatedAt: raw.activeTicket.updatedAt,
        }
      : history.find((t) => t.status === "PENDING" || t.status === "APPROVED") || null;

    const sn = raw.serialNumber || raw.deviceSerialNumber || "";
    const days =
      typeof raw.remainingDays === "number"
        ? raw.remainingDays
        : typeof raw.remainingWarrantyDays === "number"
        ? raw.remainingWarrantyDays
        : 0;

    return {
      deviceId: raw.deviceId ?? deviceId,
      serialNumber: sn,
      deviceSerialNumber: sn,
      deviceName: raw.deviceName || "",
      warrantyStatus: raw.warrantyStatus || "ACTIVE",
      warrantyExpiresAt: raw.warrantyExpiresAt || null,
      remainingDays: days,
      remainingWarrantyDays: days,
      activeTicket: active,
      ticketHistory: history,
      claims: history,
    };
  } catch (error: any) {
    console.error(`Lỗi khi lấy thông tin bảo hành thiết bị #${deviceId}:`, error);
    throw new Error(error.response?.data?.message || "Không thể tải thông tin bảo hành của thiết bị.");
  }
}

/**
 * 4.2 Khách hàng gửi yêu cầu khiếu nại bảo hành
 * POST /api/devices/{id}/warranty
 */
export async function createWarrantyClaim(
  deviceId: number,
  payload: CreateWarrantyClaimRequest
): Promise<WarrantyClaimItem> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeader();

  // Evidence là objectKey trả về từ POST /api/media/upload-url (purpose WARRANTY_EVIDENCE), không phải URL
  const validEvidence = (payload.evidenceMediaUrls || [])
    .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    .map((u) => u.trim());

  const requestBody = {
    issueDescription: payload.issueDescription.trim(),
    evidenceMediaUrls: validEvidence,
  };

  try {
    const response = await axios.post<{
      code?: string;
      data: WarrantyClaimItem;
    }>(`${baseUrl}/api/devices/${deviceId}/warranty`, requestBody, {
      headers,
      withCredentials: OpenAPI.WITH_CREDENTIALS,
    });

    if (!response.data?.data) {
      throw new Error("Không nhận được dữ liệu phản hồi từ máy chủ.");
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(WARRANTY_CHANGED_EVENT));
    }

    return response.data.data;
  } catch (error: any) {
    console.error("Lỗi khi tạo yêu cầu bảo hành:", error);
    throw new Error(error.response?.data?.message || error.message || "Gửi yêu cầu bảo hành thất bại.");
  }
}

/**
 * 4.3 Quản lý / Nhân viên xem danh sách yêu cầu bảo hành
 * GET /api/management/manager/warranty-claims (hoặc alias /api/management/staff/warranty-claims)
 */
export async function getManagementWarrantyClaims(params: {
  status?: string;
  search?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
}): Promise<ManagementWarrantyClaimsResponse> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeader();

  const queryParams = new URLSearchParams();
  if (params.status && params.status !== "ALL") queryParams.set("status", params.status);
  if (params.search && params.search.trim()) {
    // Backend expects 'query' in WarrantyClaimFilterRequest
    queryParams.set("query", params.search.trim());
    queryParams.set("search", params.search.trim());
  }
  queryParams.set("page", String(params.page ?? 0));
  queryParams.set("size", String(params.size ?? 50));
  if (params.sortBy) queryParams.set("sortBy", params.sortBy);
  if (params.sortDirection) queryParams.set("sortDirection", params.sortDirection);

  const qs = queryParams.toString();
  const primaryUrl = `${baseUrl}/api/management/manager/warranty-claims${qs ? `?${qs}` : ""}`;
  const aliasUrl = `${baseUrl}/api/management/staff/warranty-claims${qs ? `?${qs}` : ""}`;

  let responseData: any = null;

  try {
    const res = await axios.get(primaryUrl, {
      headers,
      withCredentials: OpenAPI.WITH_CREDENTIALS,
    });
    responseData = res.data;
  } catch (primaryErr: any) {
    if (primaryErr?.response?.status === 403 || primaryErr?.response?.status === 404) {
      try {
        const res = await axios.get(aliasUrl, {
          headers,
          withCredentials: OpenAPI.WITH_CREDENTIALS,
        });
        responseData = res.data;
      } catch (aliasErr: any) {
        throw new Error(aliasErr.response?.data?.message || "Không thể tải danh sách phiếu bảo hành.");
      }
    } else {
      throw new Error(primaryErr.response?.data?.message || "Không thể tải danh sách phiếu bảo hành.");
    }
  }

  const rawData = responseData?.data;
  const rawMeta = responseData?.meta;

  // Backend returns data as array: List<ManagedWarrantyClaimResponse>
  const rawItems: any[] = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.items)
    ? rawData.items
    : [];

  const items: ManagementWarrantyClaimItem[] = rawItems.map((item: any) => ({
    ticketId: item.ticketId,
    customerId: item.customerId,
    customerName: item.customerName || "Khách hàng",
    customerEmail: item.customerEmail || "",
    customerPhone: item.customerPhone || "",
    deviceId: item.deviceId,
    deviceSerialNumber: item.deviceSerialNumber || item.serialNumber || "",
    deviceName: item.deviceName || "",
    status: item.status,
    issueDescription: item.issueDescription || "",
    evidenceMediaUrls: Array.isArray(item.evidenceMediaUrls) ? item.evidenceMediaUrls : [],
    resolutionNotes: item.resolutionNotes || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));

  const totalElements = typeof rawMeta?.totalElements === "number" ? rawMeta.totalElements : items.length;
  const page = typeof rawMeta?.page === "number" ? rawMeta.page : (params.page ?? 0);
  const size = typeof rawMeta?.size === "number" ? rawMeta.size : (params.size ?? 50);
  const totalPages =
    typeof rawMeta?.totalPages === "number" ? rawMeta.totalPages : Math.max(1, Math.ceil(totalElements / size));

  return {
    items,
    page,
    size,
    totalElements,
    totalPages,
    hasNext: page + 1 < totalPages,
    hasPrevious: page > 0,
  };
}

/**
 * 4.4 Quản lý / Nhân viên xử lý phiếu yêu cầu bảo hành
 * PATCH /api/management/manager/warranty-claims/{id}
 * hoặc PATCH /api/management/staff/warranty-claims/{id}
 */
export async function processWarrantyClaim(
  ticketId: number,
  payload: ProcessWarrantyClaimRequest
): Promise<ManagementWarrantyClaimItem> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeader();

  const primaryUrl = `${baseUrl}/api/management/manager/warranty-claims/${ticketId}`;
  const aliasUrl = `${baseUrl}/api/management/staff/warranty-claims/${ticketId}`;

  const requestBody = {
    status: payload.status,
    resolutionNotes: payload.resolutionNotes?.trim() || undefined,
  };

  try {
    const response = await axios.patch<{
      code?: string;
      data: ManagementWarrantyClaimItem;
    }>(primaryUrl, requestBody, {
      headers,
      withCredentials: OpenAPI.WITH_CREDENTIALS,
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(WARRANTY_CHANGED_EVENT));
    }

    return response.data.data;
  } catch (primaryErr: any) {
    if (primaryErr?.response?.status === 403 || primaryErr?.response?.status === 404) {
      try {
        const response = await axios.patch<{
          code?: string;
          data: ManagementWarrantyClaimItem;
        }>(aliasUrl, requestBody, {
          headers,
          withCredentials: OpenAPI.WITH_CREDENTIALS,
        });

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event(WARRANTY_CHANGED_EVENT));
        }

        return response.data.data;
      } catch (aliasErr: any) {
        throw new Error(aliasErr.response?.data?.message || "Xử lý phiếu bảo hành thất bại.");
      }
    }
    throw new Error(primaryErr.response?.data?.message || "Xử lý phiếu bảo hành thất bại.");
  }
}
