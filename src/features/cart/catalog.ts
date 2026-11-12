import type { ProductDefinition } from "./types";

export type Product = ProductDefinition;
export type CatalogProduct = Product;

// Mock product catalog has been removed. Storefront products are fetched from Backend API (/api/store/products).
export const PRODUCTS: CatalogProduct[] = [];

export function getProductById(productId: string) {
  return PRODUCTS.find((product) => product.id === productId);
}
