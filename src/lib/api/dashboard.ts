import axios from "axios";
import type {
  LowStockLedItem,
  ManagerKpiSummary,
  RevenueCategoryItem,
  TopProductItem,
  WarrantyAlertItem,
} from "@/features/dashboard/types";
import { getApiBaseUrl, OpenAPI } from "./client";
import { getSessionToken } from "../auth/session";

export interface ManagerKpiOverview {
  kpiSummary: ManagerKpiSummary;
  revenueByCategory: RevenueCategoryItem[];
  topSellingProducts: TopProductItem[];
  lowStockLeds: LowStockLedItem[];
  warrantyAlerts: WarrantyAlertItem[];
}

export interface StoreDraftItem {
  productId: number;
  productName: string;
  basePrice: number;
  description: string | null;
  thumbnailUrl: string | null;
  galleryUrls: string[];
  createdAt: string;
  updatedAt: string | null;
}

/** MGT-01: GET /api/management/admin/dashboard/kpi (MANAGER | ADMIN). Months use YYYY-MM. */
export async function fetchManagerKpiOverview(params?: {
  month?: string;
  compareWith?: string;
}): Promise<ManagerKpiOverview> {
  const token = await getSessionToken();
  const { data } = await axios.get<{ data: ManagerKpiOverview }>(
    "/api/management/admin/dashboard/kpi",
    {
      baseURL: getApiBaseUrl(),
      withCredentials: OpenAPI.WITH_CREDENTIALS,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      params: {
        month: params?.month || undefined,
        compareWith: params?.compareWith || undefined,
      },
    },
  );
  return data.data;
}

/** GET /api/management/admin/store/products/drafts (MANAGER | ADMIN). */
export async function fetchCharacterStoreDrafts(): Promise<StoreDraftItem[]> {
  const token = await getSessionToken();
  const { data } = await axios.get<{ data: StoreDraftItem[] }>(
    "/api/management/admin/store/products/drafts",
    {
      baseURL: getApiBaseUrl(),
      withCredentials: OpenAPI.WITH_CREDENTIALS,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
  return data.data ?? [];
}
