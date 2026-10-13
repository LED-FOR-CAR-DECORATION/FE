import type { CartItem } from "./types";

export type CatalogProduct = Omit<CartItem, "quantity">;

export const PRODUCTS: CatalogProduct[] = [
  { id: "matrix-32", productType: "LED_MODEL", name: "32 × 32 Matrix Panel", price: 20, description: "Bảng LED ma trận 32×32 cho pixel art.", previewUrl: "/images/products/led/matrix-32.png" },
  { id: "matrix-64", productType: "LED_MODEL", name: "64 × 64 Matrix Panel", price: 120, description: "Độ phân giải cao cho các thiết kế chi tiết.", previewUrl: "/images/products/led/matrix-64.png" },
  { id: "sprite-pack-a", productType: "CHARACTER", name: "Character Sprite Pack A", price: 5, description: "Bộ nhân vật pixel art tải xuống kỹ thuật số.", previewUrl: "/images/products/characters/sprite-pack-a.png", format: "LED_BINARY", animationType: "SPRITE" },
  { id: "character-cat-hero", productType: "CHARACTER", name: "Mirage Cat Hero", price: 3.5, description: "Chú mèo pixel năng động với hoạt ảnh chào mừng.", previewUrl: "/images/products/characters/mirage-cat.png", format: "LED_BINARY", animationType: "LOOP" },
  { id: "character-space-robot", productType: "CHARACTER", name: "Space Robot", price: 4, description: "Robot không gian với hiệu ứng chuyển động futuristic.", previewUrl: "/images/products/characters/space-robot.png", format: "LED_BINARY", animationType: "LOOP" },
  { id: "character-ninja", productType: "CHARACTER", name: "Neon Ninja", price: 4.5, description: "Ninja neon tốc độ cao dành cho các thiết kế cá tính.", previewUrl: "/images/products/characters/neon-ninja.png", format: "LED_BINARY", animationType: "SPRITE" },
  { id: "character-cherry-bloom", productType: "CHARACTER", name: "Cherry Bloom", price: 2.5, description: "Hoa anh đào pixel nhẹ nhàng với hoạt ảnh rơi.", previewUrl: "/images/products/characters/cherry-bloom.png", format: "LED_BINARY", animationType: "LOOP" },
  { id: "character-dragon", productType: "CHARACTER", name: "Mini Dragon", price: 6, description: "Rồng mini phun lửa, nổi bật trên bảng LED.", previewUrl: "/images/products/characters/mini-dragon.png", format: "LED_BINARY", animationType: "SPRITE" },
  { id: "matrix-16", productType: "LED_MODEL", name: "16 × 16 Matrix Panel", price: 15, description: "Kích thước nhỏ gọn, dễ lắp đặt." },
  { id: "controller-box", productType: "LED_MODEL", name: "LED Controller Box", price: 12.5, description: "Hộp điều khiển thông minh giúp quản lý nhiều bảng LED cùng lúc." },
];

export function getProductById(productId: string) {
  return PRODUCTS.find((product) => product.id === productId);
}
