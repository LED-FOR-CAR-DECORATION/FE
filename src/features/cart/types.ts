import type {
  BundleDetail,
  CharacterDetail,
  LedDetail,
  SubscriptionDetail,
  TagItem,
} from "@/api_client";

export type ProductType = "LED_MODEL" | "CHARACTER" | "BUNDLE" | "SUBSCRIPTION";

export interface ProductDefinition {
  id: string;
  productId?: number;
  productType: ProductType;
  name: string;
  price: number;
  quantity?: number;
  description?: string;
  previewUrl?: string;
  galleryUrls?: string[];
  tags?: TagItem[];
  format?: string;
  animationType?: string;
  components?: ProductDefinition[];
  ledDetails?: LedDetail;
  characterDetails?: CharacterDetail;
  bundleDetails?: BundleDetail;
  subscriptionDetails?: SubscriptionDetail;
}

export interface CartItem extends ProductDefinition {
  cartItemId?: number;
  quantity: number;
  isAvailable?: boolean;
  unavailableReason?: string | null;
}
