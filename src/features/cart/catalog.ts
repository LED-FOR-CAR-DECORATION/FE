import type { ProductDefinition } from "./types";

// Prices are in VND to match the current storefront UI.
// Bundle price is its own selling price; do not recalculate it from component prices.

export type Product = ProductDefinition;
export type CatalogProduct = Product;

export const PRODUCTS: CatalogProduct[] = [
  {
    "id": "led-pixel-mini-8",
    "productType": "LED_MODEL",
    "name": "PIXEL Mini 8×8",
    "price": 299000,
    "description": "Bảng LED pixel mini 8×8 nhỏ gọn, phù hợp làm vật trang trí bàn học hoặc bàn làm việc.",
    "previewUrl": "/images/products/led/pixel-mini-8.png"
  },
  {
    "id": "led-matrix-16",
    "productType": "LED_MODEL",
    "name": "16 × 16 Matrix Panel",
    "price": 499000,
    "description": "Bảng LED ma trận 16×16 để hiển thị Character pixel và biểu tượng đơn giản.",
    "previewUrl": "/images/products/led/matrix-16.png"
  },
  {
    "id": "matrix-32",
    "productType": "LED_MODEL",
    "name": "32 × 32 Matrix Panel",
    "price": 699000,
    "description": "Bảng LED ma trận 32×32 cho pixel art chi tiết và hoạt ảnh ngắn.",
    "previewUrl": "/images/products/led/matrix-32.png"
  },
  {
    "id": "led-matrix-64x32",
    "productType": "LED_MODEL",
    "name": "64 × 32 Matrix Panel",
    "price": 1290000,
    "description": "Màn hình LED ngang 64×32, phù hợp hiển thị banner pixel và hoạt ảnh.",
    "previewUrl": "/images/products/led/matrix-64x32.png"
  },
  {
    "id": "led-matrix-64",
    "productType": "LED_MODEL",
    "name": "64 × 64 Matrix Pro",
    "price": 1890000,
    "description": "Bảng LED độ phân giải cao 64×64 dành cho các thiết kế pixel art phức tạp.",
    "previewUrl": "/images/products/led/matrix-64.png"
  },
  {
    "id": "led-pixel-bar",
    "productType": "LED_MODEL",
    "name": "PIXEL Bar RGB",
    "price": 699000,
    "description": "Đèn LED dạng thanh RGB để trang trí không gian chơi game hoặc bàn làm việc.",
    "previewUrl": "/images/products/led/pixel-bar-rgb.png"
  },
  {
    "id": "led-pixel-dock",
    "productType": "LED_MODEL",
    "name": "PIXEL Dock",
    "price": 599000,
    "description": "Đế hiển thị pixel để bàn, thiết kế gọn nhẹ cho góc làm việc.",
    "previewUrl": "/images/products/led/pixel-dock.png"
  },
  {
    "id": "character-cat-hero",
    "productType": "CHARACTER",
    "name": "Mirage Cat Hero",
    "price": 85750,
    "description": "Chú mèo pixel năng động với hoạt ảnh chào mừng.",
    "previewUrl": "/images/products/characters/mirage-cat.png",
    "format": "LED_BINARY",
    "animationType": "LOOP"
  },
  {
    "id": "character-cherry-bloom",
    "productType": "CHARACTER",
    "name": "Cherry Bloom",
    "price": 61250,
    "description": "Cành hoa anh đào pixel với hiệu ứng nở nhẹ.",
    "previewUrl": "/images/products/characters/cherry-bloom.png",
    "format": "LED_BINARY",
    "animationType": "LOOP"
  },
  {
    "id": "character-space-robot",
    "productType": "CHARACTER",
    "name": "Space Robot",
    "price": 98000,
    "description": "Robot không gian vui nhộn với màn hình phát sáng.",
    "previewUrl": "/images/products/characters/space-robot.png",
    "format": "LED_BINARY",
    "animationType": "LOOP"
  },
  {
    "id": "character-neon-ninja",
    "productType": "CHARACTER",
    "name": "Neon Ninja",
    "price": 110250,
    "description": "Ninja pixel với khăn choàng chuyển động.",
    "previewUrl": "/images/products/characters/neon-ninja.png",
    "format": "LED_BINARY",
    "animationType": "LOOP"
  },
  {
    "id": "character-mini-dragon",
    "productType": "CHARACTER",
    "name": "Mini Dragon",
    "price": 147000,
    "description": "Rồng pixel nhỏ với hoạt ảnh vỗ cánh.",
    "previewUrl": "/images/products/characters/mini-dragon.png",
    "format": "LED_BINARY",
    "animationType": "LOOP"
  },
  {
    "id": "character-sprite-pack-a",
    "productType": "CHARACTER",
    "name": "Character Sprite Pack A",
    "price": 122500,
    "description": "Bộ sưu tập sprite pixel nhiều tư thế và biểu cảm.",
    "previewUrl": "/images/products/characters/sprite-pack-a.png",
    "format": "LED_BINARY",
    "animationType": "MULTI_FRAME"
  },
  {
    "id": "character-pixel-wizard",
    "productType": "CHARACTER",
    "name": "Pixel Wizard",
    "price": 69000,
    "description": "Pháp sư pixel với hiệu ứng phép thuật lấp lánh.",
    "previewUrl": "/images/products/characters/pixel-wizard.png",
    "format": "LED_BINARY",
    "animationType": "LOOP"
  },
  {
    "id": "character-tiny-ghost",
    "productType": "CHARACTER",
    "name": "Tiny Ghost",
    "price": 39000,
    "description": "Bóng ma nhỏ dễ thương chuyển động lên xuống.",
    "previewUrl": "/images/products/characters/tiny-ghost.png",
    "format": "LED_BINARY",
    "animationType": "LOOP"
  },
  {
    "id": "character-lazy-frog",
    "productType": "CHARACTER",
    "name": "Lazy Frog",
    "price": 39000,
    "description": "Chú ếch pixel thư giãn với hoạt ảnh chớp mắt.",
    "previewUrl": "/images/products/characters/lazy-frog.png",
    "format": "LED_BINARY",
    "animationType": "LOOP"
  },
  {
    "id": "character-shiba-buddy",
    "productType": "CHARACTER",
    "name": "Shiba Buddy",
    "price": 49000,
    "description": "Chú chó Shiba pixel vẫy đuôi thân thiện.",
    "previewUrl": "/images/products/characters/shiba-buddy.png",
    "format": "LED_BINARY",
    "animationType": "LOOP"
  },
  {
    "id": "character-sakura-spirit",
    "productType": "CHARACTER",
    "name": "Sakura Spirit",
    "price": 59000,
    "description": "Linh hồn hoa anh đào với hạt phấn bay nhẹ.",
    "previewUrl": "/images/products/characters/sakura-spirit.png",
    "format": "LED_BINARY",
    "animationType": "LOOP"
  },
  {
    "id": "character-astro-kid",
    "productType": "CHARACTER",
    "name": "Astro Kid",
    "price": 59000,
    "description": "Nhà du hành vũ trụ pixel trong bộ đồ phi hành gia.",
    "previewUrl": "/images/products/characters/astro-kid.png",
    "format": "LED_BINARY",
    "animationType": "STATIC"
  },
  {
    "id": "character-ember-dragon",
    "productType": "CHARACTER",
    "name": "Ember Dragon",
    "price": 69000,
    "description": "Rồng lửa pixel với hiệu ứng than hồng.",
    "previewUrl": "/images/products/characters/ember-dragon.png",
    "format": "LED_BINARY",
    "animationType": "LOOP"
  },
  {
    "id": "character-heartbeat",
    "productType": "CHARACTER",
    "name": "Heartbeat",
    "price": 29000,
    "description": "Biểu tượng trái tim pixel nhấp nháy.",
    "previewUrl": "/images/products/characters/heartbeat.png",
    "format": "LED_BINARY",
    "animationType": "LOOP"
  },
  {
    "id": "character-electric-pulse",
    "productType": "CHARACTER",
    "name": "Electric Pulse",
    "price": 35000,
    "description": "Hiệu ứng xung điện pixel chuyển động tuần hoàn.",
    "previewUrl": "/images/products/characters/electric-pulse.png",
    "format": "LED_BINARY",
    "animationType": "LOOP"
  },
  {
    "id": "character-dreamy-moon",
    "productType": "CHARACTER",
    "name": "Dreamy Moon",
    "price": 39000,
    "description": "Mặt trăng pixel với những ngôi sao lấp lánh.",
    "previewUrl": "/images/products/characters/dreamy-moon.png",
    "format": "LED_BINARY",
    "animationType": "LOOP"
  },
  {
    "id": "character-forest-guardian",
    "productType": "CHARACTER",
    "name": "Forest Guardian",
    "price": 79000,
    "description": "Người bảo hộ khu rừng phong cách pixel fantasy.",
    "previewUrl": "/images/products/characters/forest-guardian.png",
    "format": "LED_BINARY",
    "animationType": "STATIC"
  },
  {
    "id": "character-cloud-rabbit",
    "productType": "CHARACTER",
    "name": "Cloud Rabbit",
    "price": 45000,
    "description": "Thỏ mây pixel với hoạt ảnh nhảy nhẹ nhàng.",
    "previewUrl": "/images/products/characters/cloud-rabbit.png",
    "format": "LED_BINARY",
    "animationType": "LOOP"
  },
  {
    "id": "character-cyber-fox",
    "productType": "CHARACTER",
    "name": "Cyber Fox",
    "price": 89000,
    "description": "Cáo cyberpunk pixel với các điểm sáng neon.",
    "previewUrl": "/images/products/characters/cyber-fox.png",
    "format": "LED_BINARY",
    "animationType": "LOOP"
  },
  {
    "id": "character-ocean-spirit",
    "productType": "CHARACTER",
    "name": "Ocean Spirit",
    "price": 65000,
    "description": "Linh hồn đại dương pixel với hiệu ứng sóng nước.",
    "previewUrl": "/images/products/characters/ocean-spirit.png",
    "format": "LED_BINARY",
    "animationType": "LOOP"
  },
  {
    "id": "bundle-starter",
    "productType": "BUNDLE",
    "name": "LED Starter Bundle",
    "price": 749000,
    "description": "Gói khởi đầu gồm một bảng LED 16×16 và hai Character để trải nghiệm PIXEL HUB.",
    "previewUrl": "/images/products/bundles/starter.png",
    "components": [
      {
        "id": "led-matrix-16",
        "productType": "LED_MODEL",
        "name": "16 × 16 Matrix Panel",
        "price": 499000,
        "quantity": 1
      },
      {
        "id": "character-cat-hero",
        "productType": "CHARACTER",
        "name": "Mirage Cat Hero",
        "price": 85750,
        "quantity": 1
      },
      {
        "id": "character-tiny-ghost",
        "productType": "CHARACTER",
        "name": "Tiny Ghost",
        "price": 39000,
        "quantity": 1
      }
    ]
  },
  {
    "id": "bundle-creator",
    "productType": "BUNDLE",
    "name": "Creator Starter Bundle",
    "price": 1099000,
    "description": "Gói sáng tạo gồm LED 32×32 cùng ba Character phổ biến.",
    "previewUrl": "/images/products/bundles/creator.png",
    "components": [
      {
        "id": "matrix-32",
        "productType": "LED_MODEL",
        "name": "32 × 32 Matrix Panel",
        "price": 699000,
        "quantity": 1
      },
      {
        "id": "character-space-robot",
        "productType": "CHARACTER",
        "name": "Space Robot",
        "price": 98000,
        "quantity": 1
      },
      {
        "id": "character-cherry-bloom",
        "productType": "CHARACTER",
        "name": "Cherry Bloom",
        "price": 61250,
        "quantity": 1
      },
      {
        "id": "character-heartbeat",
        "productType": "CHARACTER",
        "name": "Heartbeat",
        "price": 29000,
        "quantity": 1
      }
    ]
  },
  {
    "id": "bundle-desk-setup",
    "productType": "BUNDLE",
    "name": "Desktop Setup Bundle",
    "price": 1599000,
    "description": "Gói trang trí bàn làm việc gồm PIXEL Dock và PIXEL Bar RGB.",
    "previewUrl": "/images/products/bundles/desk-setup.png",
    "components": [
      {
        "id": "led-pixel-dock",
        "productType": "LED_MODEL",
        "name": "PIXEL Dock",
        "price": 599000,
        "quantity": 1
      },
      {
        "id": "led-pixel-bar",
        "productType": "LED_MODEL",
        "name": "PIXEL Bar RGB",
        "price": 699000,
        "quantity": 1
      },
      {
        "id": "character-dreamy-moon",
        "productType": "CHARACTER",
        "name": "Dreamy Moon",
        "price": 39000,
        "quantity": 1
      }
    ]
  },
  {
    "id": "bundle-pixel-pro",
    "productType": "BUNDLE",
    "name": "Pixel Pro Bundle",
    "price": 1999000,
    "description": "Gói nâng cấp gồm Matrix Pro 64×64 và ba Character.",
    "previewUrl": "/images/products/bundles/pixel-pro.png",
    "components": [
      {
        "id": "led-matrix-64",
        "productType": "LED_MODEL",
        "name": "64 × 64 Matrix Pro",
        "price": 1890000,
        "quantity": 1
      },
      {
        "id": "character-mini-dragon",
        "productType": "CHARACTER",
        "name": "Mini Dragon",
        "price": 147000,
        "quantity": 1
      },
      {
        "id": "character-pixel-wizard",
        "productType": "CHARACTER",
        "name": "Pixel Wizard",
        "price": 69000,
        "quantity": 1
      },
      {
        "id": "character-electric-pulse",
        "productType": "CHARACTER",
        "name": "Electric Pulse",
        "price": 35000,
        "quantity": 1
      }
    ]
  },
  {
    "id": "bundle-retro-fun",
    "productType": "BUNDLE",
    "name": "Retro Fun Bundle",
    "price": 849000,
    "description": "Gói phong cách retro gồm LED Retro TV và bộ sprite.",
    "previewUrl": "/images/products/bundles/retro-fun.png",
    "components": [
      {
        "id": "character-sprite-pack-a",
        "productType": "CHARACTER",
        "name": "Character Sprite Pack A",
        "price": 122500,
        "quantity": 1
      }
    ]
  },
  {
    "id": "bundle-travel",
    "productType": "BUNDLE",
    "name": "Pixel On-the-Go Bundle",
    "price": 229000,
    "description": "Gói nhỏ gọn gồm PIXEL Keychain và hai Character mini.",
    "previewUrl": "/images/products/bundles/travel.png",
    "components": [
      {
        "id": "character-tiny-ghost",
        "productType": "CHARACTER",
        "name": "Tiny Ghost",
        "price": 39000,
        "quantity": 1
      },
      {
        "id": "character-cloud-rabbit",
        "productType": "CHARACTER",
        "name": "Cloud Rabbit",
        "price": 45000,
        "quantity": 1
      }
    ]
  },
  {
    "id": "bundle-artist",
    "productType": "BUNDLE",
    "name": "Pixel Artist Bundle",
    "price": 1399000,
    "description": "Gói dành cho người vẽ pixel art gồm LED 64×32 và các Character lấy cảm hứng fantasy.",
    "previewUrl": "/images/products/bundles/artist.png",
    "components": [
      {
        "id": "led-matrix-64x32",
        "productType": "LED_MODEL",
        "name": "64 × 32 Matrix Panel",
        "price": 1290000,
        "quantity": 1
      },
      {
        "id": "character-forest-guardian",
        "productType": "CHARACTER",
        "name": "Forest Guardian",
        "price": 79000,
        "quantity": 1
      },
      {
        "id": "character-ember-dragon",
        "productType": "CHARACTER",
        "name": "Ember Dragon",
        "price": 69000,
        "quantity": 1
      },
      {
        "id": "character-sakura-spirit",
        "productType": "CHARACTER",
        "name": "Sakura Spirit",
        "price": 59000,
        "quantity": 1
      }
    ]
  },
  {
    "id": "bundle-home",
    "productType": "BUNDLE",
    "name": "Home Pixel Bundle",
    "price": 1299000,
    "description": "Gói trang trí gia đình gồm LED Desktop Panel, Shiba Buddy và Cherry Bloom.",
    "previewUrl": "/images/products/bundles/home.png",
    "components": [
      {
        "id": "character-shiba-buddy",
        "productType": "CHARACTER",
        "name": "Shiba Buddy",
        "price": 49000,
        "quantity": 1
      },
      {
        "id": "character-cherry-bloom",
        "productType": "CHARACTER",
        "name": "Cherry Bloom",
        "price": 61250,
        "quantity": 1
      }
    ]
  }
];

export function getProductById(productId: string) {
  return PRODUCTS.find((product) => product.id === productId);
}
