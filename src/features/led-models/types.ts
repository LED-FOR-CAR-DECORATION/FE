export type LedModelStatus = "ACTIVE" | "OUT_OF_STOCK" | "DEPRECATED";

export interface LedModelFilters {
  page: number;
  size: number;
  keyword?: string;
  status?: LedModelStatus;
  widthPx?: number;
  heightPx?: number;
  lowStockOnly?: boolean;
  unlinkedToProductOnly?: boolean;
}

export interface LedModel {
  modelId: number;
  productId?: number | null;
  modelName: string;
  stockQuantity: number;
  isLowStock: boolean;
  status: LedModelStatus;
  spec: {
    widthPx: number;
    heightPx: number;
    attributes: { label: string; value: string }[];
  };
}

export interface LedModelPage {
  data: LedModel[];
  meta: {
    page: number;
    totalPages: number;
    totalElements: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
}
