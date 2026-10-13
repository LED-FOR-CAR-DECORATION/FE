import type { Character } from "./types";

export const CHARACTERS: Character[] = [
  {
    characterId: "sprite-pack-a",
    name: "Character Sprite Pack A",
    description: "Bộ nhân vật pixel art dùng ngay trên bảng LED.",
    previewUrl: "/characters/sprite-pack-a.png",
    format: "LED_BINARY",
    animationType: "SPRITE",
    visibility: "PUBLIC",
    status: "PUBLISHED",
  },
  {
    characterId: "character-cat-hero",
    name: "Mirage Cat Hero",
    description: "Chú mèo pixel năng động với hoạt ảnh chào mừng.",
    previewUrl: "/characters/pixel-cat-hero.png",
    format: "LED_BINARY",
    animationType: "LOOP",
    visibility: "PUBLIC",
    status: "PUBLISHED",
  },
  {
    characterId: "character-space-robot",
    name: "Space Robot",
    description: "Robot không gian với hiệu ứng chuyển động futuristic.",
    previewUrl: "/characters/space-robot.png",
    format: "LED_BINARY",
    animationType: "LOOP",
    visibility: "PUBLIC",
    status: "PUBLISHED",
  },
  {
    characterId: "character-ninja",
    name: "Neon Ninja",
    description: "Ninja neon tốc độ cao dành cho các thiết kế cá tính.",
    previewUrl: "/characters/neon-ninja.png",
    format: "LED_BINARY",
    animationType: "SPRITE",
    visibility: "PUBLIC",
    status: "PUBLISHED",
  },
  {
    characterId: "character-cherry-bloom",
    name: "Cherry Bloom",
    description: "Hoa anh đào pixel nhẹ nhàng với hoạt ảnh rơi.",
    previewUrl: "/characters/cherry-bloom.png",
    format: "LED_BINARY",
    animationType: "LOOP",
    visibility: "PUBLIC",
    status: "PUBLISHED",
  },
  {
    characterId: "character-dragon",
    name: "Mini Dragon",
    description: "Rồng mini phun lửa, nổi bật trên bảng LED.",
    previewUrl: "/characters/mini-dragon.png",
    format: "LED_BINARY",
    animationType: "SPRITE",
    visibility: "PUBLIC",
    status: "PUBLISHED",
  },
];

export function getCharacterById(characterId: string) {
  return CHARACTERS.find((character) => character.characterId === characterId);
}
