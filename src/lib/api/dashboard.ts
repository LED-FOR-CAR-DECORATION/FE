import axios from "axios";
import type {
  DailyRevenuePoint,
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
  dailyRevenue?: DailyRevenuePoint[];
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

export interface RevenueSourceItem {
  sourceType: "ORDER" | "COMMISSION";
  referenceId: number;
  referenceCode: string;
  customerName: string | null;
  customerEmail: string | null;
  status: string;
  orderType: string;
  productId: number | null;
  itemName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  contributionAmount: number;
  orderTotalAmount: number;
  createdAt: string | null;
}

export interface ManagerRevenueDrilldown {
  month: string;
  scopeType: "ALL" | "CATEGORY" | "PRODUCT";
  scopeLabel: string;
  category: string | null;
  productId: number | null;
  periodStart: string;
  periodEnd: string;
  totalRevenue: number;
  totalUnits: number;
  distinctSourceCount: number;
  items: RevenueSourceItem[];
}

export interface ManagerOrderAuditLineItem {
  orderItemId: number;
  productId: number;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ManagerOrderAuditDetail {
  orderId: number;
  referenceCode: string;
  customerName: string | null;
  customerEmail: string | null;
  status: string;
  orderType: string;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  createdAt: string | null;
  paymentCode: string | null;
  paymentGateway: string | null;
  paymentStatus: string | null;
  paidAt: string | null;
  items: ManagerOrderAuditLineItem[];
}

/** MGT-01: GET /api/management/admin/dashboard/kpi (MANAGER | ADMIN). Months use YYYY-MM. */
export async function fetchManagerKpiOverview(params?: {
  month?: string;
  compareWith?: string;
  refresh?: boolean;
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
        refresh: params?.refresh ? true : undefined,
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

/** GET /api/management/admin/dashboard/revenue-sources (MANAGER | ADMIN). */
export async function fetchManagerRevenueDrilldown(params: {
  month: string;
  category?: string;
  productId?: number;
}): Promise<ManagerRevenueDrilldown> {
  const token = await getSessionToken();
  const { data } = await axios.get<{ data: ManagerRevenueDrilldown }>(
    "/api/management/admin/dashboard/revenue-sources",
    {
      baseURL: getApiBaseUrl(),
      withCredentials: OpenAPI.WITH_CREDENTIALS,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      params: {
        month: params.month || undefined,
        category: params.category || undefined,
        productId: params.productId != null ? params.productId : undefined,
      },
    },
  );
  return data.data;
}

/** GET /api/management/admin/dashboard/revenue-sources/orders/{orderId} (MANAGER | ADMIN). */
export async function fetchManagerOrderAuditDetail(
  orderId: number,
): Promise<ManagerOrderAuditDetail> {
  const token = await getSessionToken();
  const { data } = await axios.get<{ data: ManagerOrderAuditDetail }>(
    `/api/management/admin/dashboard/revenue-sources/orders/${orderId}`,
    {
      baseURL: getApiBaseUrl(),
      withCredentials: OpenAPI.WITH_CREDENTIALS,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
  return data.data;
}
