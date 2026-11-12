export type ProductType = "LED_MODEL" | "CHARACTER" | "BUNDLE";

export interface ProductDefinition {
  id: string;
  productType: ProductType;
  name: string;
  price: number;
  quantity?: number;
  description?: string;
  previewUrl?: string;
  format?: string;
  animationType?: string;
  components?: ProductDefinition[];
}

export interface CartItem extends ProductDefinition {
  quantity: number;
}