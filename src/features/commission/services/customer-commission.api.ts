import axios from "axios";
import type { CustomerCommissionDetailResponse } from "@/api_client/models/CustomerCommissionDetailResponse";
import type { PublicCommissionPricingResponse } from "@/api_client/models/PublicCommissionPricingResponse";
import { request } from "@/api_client/core/request";
import { OpenAPI } from "@/lib/api/client";

type CommissionSubmission = {
  title: string;
  description: string;
  tierCode: string;
  step1Selections: { configId: number; optionId: number }[];
  selectedOptions: { configId: number; optionIds?: number[]; textValue?: string }[];
  attachments: { imageUrl: string }[];
};

export function getCommissionPricing() {
  return request<{ data: PublicCommissionPricingResponse }>(OpenAPI, {
    method: "GET",
    url: "/api/commissions/pricing",
  });
}

export function submitCommission(body: CommissionSubmission) {
  return request<{ data: CustomerCommissionDetailResponse }>(OpenAPI, {
    method: "POST",
    url: "/api/commissions",
    mediaType: "application/json",
    body,
  });
}

export async function uploadCommissionReference(file: File) {
  const { data } = await request<{ data: { signedUploadUrl: string; publicUrl: string } }>(OpenAPI, {
    method: "POST",
    url: "/api/media/upload-url",
    mediaType: "application/json",
    body: { purpose: "COMMISSION_REFERENCE", fileName: file.name, fileSize: file.size, contentType: file.type },
  });
  await axios.put(data.signedUploadUrl, file, { headers: { "Content-Type": file.type } });
  return { imageUrl: data.publicUrl };
}
