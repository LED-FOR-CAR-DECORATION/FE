import { request } from "@/api_client/core/request";
import { OpenAPI } from "@/lib/api/client";

const endpoint = "/api/management/commissions";

export type CommissionQueueItem = {
  commissionId: number;
  title: string;
  status: string;
  customerName?: string | null;
  targetMatrixDimensions?: string | null;
  totalPrice?: number;
  assignedStaffName?: string | null;
  assignedDesignerName?: string | null;
};

export type CommissionManagementDetail = CommissionQueueItem & {
  description?: string | null;
  attachments?: { attachmentId: number; imageUrl: string; caption?: string | null }[];
};

export type DesignerOption = { designerId: number; fullName: string };

export function getCommissionQueue(page: number, assigned: boolean) {
  return request<{ data: CommissionQueueItem[]; meta?: { hasNext: boolean } }>(OpenAPI, {
    method: "GET",
    url: assigned ? endpoint + "/assigned" : endpoint,
    query: { page, size: 20 },
  });
}

export function getManagementCommission(id: number) {
  return request<{ data: CommissionManagementDetail }>(OpenAPI, {
    method: "GET", url: endpoint + "/{id}", path: { id },
  });
}

export function listCommissionDesigners() {
  return request<{ data: DesignerOption[] }>(OpenAPI, { method: "GET", url: endpoint + "/designers" });
}

export function approveCommission(id: number) {
  return request(OpenAPI, { method: "POST", url: endpoint + "/{id}/approve", path: { id } });
}

export function assignCommissionDesigner(id: number, designerId: number) {
  return request(OpenAPI, {
    method: "POST", url: endpoint + "/{id}/assign", path: { id }, mediaType: "application/json", body: { designerId },
  });
}
