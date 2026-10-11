export type ProductType = "LED_MODEL" | "CHARACTER";

export interface CartItem {
  id: string;
  productType: ProductType;
  name: string;
  price: number;
  quantity: number;
  description?: string;
  previewUrl?: string;
  format?: string;
  animationType?: string;
}