import { apiUpdateProductStatus, fetchStoreProducts } from "@/lib/api/products";
import type {
  CharacterVersion,
  ListingActor,
  StoreCharacter,
  StoreCharacterRow,
  StoreListing,
} from "../types";

/**
 * Store Listing Service.
 *
 * Đồng bộ hai chiều với Backend API:
 * - BR-14: Chỉ Manager mới có quyền publish / unlist (ẩn).
 * - BR-10: Publish/Republish yêu cầu chọn chính xác versionId.
 * - Trạng thái PUBLISHED / UNPUBLISHED được gửi trực tiếp lên Backend:
 *   PATCH /api/management/admin/store/products/{id}/status
 * - Khách hàng (Customer) duyệt Store qua GET /api/store/products (BE chỉ trả về PUBLISHED).
 * - Khi sản phẩm bị ẩn (UNPUBLISHED), BE sẽ không trả về ở Storefront, và Manager
 *   vẫn quản lý được với trạng thái "Đã ẩn" (Hidden) kèm nút "Republish".
 */

export class StoreListingError extends Error {
  constructor(message: string, readonly code: "FORBIDDEN" | "NOT_FOUND" | "VALIDATION") {
    super(message);
    this.name = "StoreListingError";
  }
}

const LATENCY_MS = 250;

/** Danh sách Character cơ sở trong hệ cơ sở dữ liệu mẫu */
const KNOWN_CHARACTERS: Array<{
  id: string;
  name: string;
  price: number;
  description: string;
  thumbnailUrl: string;
}> = [
  {
    id: "4",
    name: "Cyber Kitsune — Cáo Chín Đuôi Neon",
    price: 199000,
    description:
      "Nhân vật Cáo Chín Đuôi phong cách Cyberpunk với hiệu ứng lửa neon chuyển màu mượt mà 60 khung hình, tối ưu hóa cho bảng LED 64x64.",
    thumbnailUrl: "/images/products/characters/cyber-fox.png",
  },
  {
    id: "5",
    name: "Mecha Ronin — Chiến Binh Ninja Neon",
    price: 249000,
    description:
      "Hoạt ảnh Pixel Art Ninja giáp máy vung kiếm ánh sáng plasma, gồm 48 frame lặp hoàn hảo không giật nhịp.",
    thumbnailUrl: "/images/products/characters/neon-ninja.png",
  },
  {
    id: "6",
    name: "Astro Cat — Mèo Phi Hành Gia Mirage",
    price: 149000,
    description:
      "Chú mèo phi hành gia bồng bềnh giữa không gian sao lấp lánh.",
    thumbnailUrl: "/images/products/characters/mirage-cat.png",
  },
  {
    id: "7",
    name: "Retro Arcade Dragon — Rồng Lửa 8-Bit",
    price: 199000,
    description:
      "Rồng phun lửa phong cách arcade hoài niệm.",
    thumbnailUrl: "/images/products/characters/arcade-dragon.png",
  },
];

// In-memory cache cho UI session
const db = {
  characters: [] as StoreCharacter[],
  listings: [] as StoreListing[],
  versions: [] as CharacterVersion[],
};

function delay(ms = LATENCY_MS) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function assertManager(actor: ListingActor | null) {
  if (!actor || actor.role !== "MANAGER") {
    throw new StoreListingError("Chỉ Manager mới có quyền thay đổi nội dung hiển thị trên Store.", "FORBIDDEN");
  }
}

function findCharacter(characterId: string): StoreCharacter {
  const character = db.characters.find((item) => item.characterId === characterId);
  if (!character) throw new StoreListingError("Không tìm thấy Character.", "NOT_FOUND");
  return character;
}

function findListing(listingId: string): StoreListing {
  const listing = db.listings.find((item) => item.listingId === listingId);
  if (!listing) throw new StoreListingError("Không tìm thấy Store Listing.", "NOT_FOUND");
  return listing;
}

function toRow(character: StoreCharacter): StoreCharacterRow {
  const active = db.versions.find(
    (item) => item.characterId === character.characterId && item.storeListingId === character.listingId,
  );
  return {
    ...character,
    activeVersion: active ? { versionId: active.versionId, versionNumber: active.versionNumber } : null,
  };
}

/** GET /manager/store-listings/characters */
export async function getStoreCharacters(): Promise<StoreCharacterRow[]> {
  try {
    const { items } = await fetchStoreProducts({ size: 100 });
    const charactersFromBackend = items.filter((p) => p.productType === "CHARACTER");
    const publishedIds = new Set(charactersFromBackend.map((p) => String(p.id)));

    // Kết hợp KNOWN_CHARACTERS và các characters động trả về từ Backend
    const allCharacters = [...KNOWN_CHARACTERS];
    for (const bChar of charactersFromBackend) {
      if (!allCharacters.some((c) => c.id === String(bChar.id))) {
        allCharacters.push({
          id: String(bChar.id),
          name: bChar.name,
          price: bChar.price,
          description: bChar.description ?? "",
          thumbnailUrl: bChar.previewUrl || "/images/products/characters/cyber-fox.png",
        });
      }
    }

    for (const charDef of allCharacters) {
      const isPublished = publishedIds.has(charDef.id);
      const listingId = `lst-${charDef.id}`;
      const existing = db.characters.find((c) => c.characterId === charDef.id);

      if (!existing) {
        const character: StoreCharacter = {
          characterId: charDef.id,
          name: charDef.name,
          description: charDef.description,
          thumbnailUrl: charDef.thumbnailUrl,
          creatorUserId: "usr-designer-1",
          creatorName: "KuroPixel Studio",
          listingId,
          visibility: isPublished ? "Visible" : "Hidden",
          status: isPublished ? "Published" : "Hidden",
          createdAt: "2026-11-10T08:00:00Z",
          updatedAt: "2026-11-11T10:00:00Z",
        };
        const listing: StoreListing = {
          listingId,
          publisherUserId: "usr-manager-1",
          price: charDef.price,
          isFree: charDef.price === 0,
          status: isPublished ? "Published" : "Hidden",
          publishedAt: isPublished ? "2026-11-10T08:00:00Z" : null,
          updatedAt: "2026-11-11T10:00:00Z",
        };

        const v1: CharacterVersion = {
          versionId: `ver-${charDef.id}-1`,
          characterId: charDef.id,
          storeListingId: listingId,
          versionNumber: 1,
          fileUrl: charDef.thumbnailUrl,
          ledBinaryUrl: "",
          format: "LED_BINARY",
          width: 64,
          height: 64,
          frameCount: 16,
          frameDelayMs: 60,
          byteSize: 1024,
          changelog: "Phiên bản khởi tạo chính thức",
          isCurrent: false,
          createdAt: "2026-11-10T08:00:00Z",
        };
        const v2: CharacterVersion = {
          versionId: `ver-${charDef.id}-2`,
          characterId: charDef.id,
          storeListingId: listingId,
          versionNumber: 2,
          fileUrl: charDef.thumbnailUrl,
          ledBinaryUrl: "",
          format: "LED_BINARY",
          width: 64,
          height: 64,
          frameCount: 24,
          frameDelayMs: 50,
          byteSize: 2048,
          changelog: "Tối ưu hóa khung hình mượt mà 60 FPS",
          isCurrent: true,
          createdAt: "2026-11-11T10:00:00Z",
        };

        db.characters.push(character);
        db.listings.push(listing);
        db.versions.push(v1, v2);
      } else {
        // Đồng bộ trạng thái thực tế từ Backend PostgreSQL
        existing.status = isPublished ? "Published" : "Hidden";
        existing.visibility = isPublished ? "Visible" : "Hidden";
        const listing = db.listings.find((l) => l.listingId === existing.listingId);
        if (listing) {
          listing.status = isPublished ? "Published" : "Hidden";
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch characters from backend:", err);
  }
  return structuredClone(db.characters.map(toRow));
}

/** GET /manager/store-listings/characters/:characterId/versions — every CHARACTER_VERSION of the character. */
export async function getCharacterVersions(characterId: string): Promise<CharacterVersion[]> {
  await delay(150);
  findCharacter(characterId);
  return structuredClone(
    db.versions
      .filter((item) => item.characterId === characterId)
      .sort((first, second) => second.versionNumber - first.versionNumber),
  );
}

export interface PublishCharacterVersionInput {
  characterId: string;
  /** Must be chosen explicitly by the Manager (BR-10). */
  versionId: string;
  actor: ListingActor | null;
}

/**
 * POST /manager/store-listings/characters/:characterId/publish
 * Handles first publish, "change version" and republish — all require an explicit version.
 */
export async function publishCharacterVersion({ characterId, versionId, actor }: PublishCharacterVersionInput) {
  assertManager(actor);
  if (!versionId) {
    throw new StoreListingError("Vui lòng chọn chính xác version cần publish.", "VALIDATION");
  }

  const character = findCharacter(characterId);
  const listing = findListing(character.listingId);
  const selected = db.versions.find((item) => item.versionId === versionId);
  if (!selected || selected.characterId !== character.characterId) {
    throw new StoreListingError("Version đã chọn không thuộc Character này.", "VALIDATION");
  }

  // Cập nhật trạng thái PUBLISHED lên Backend database
  const numericId = Number(characterId);
  if (Number.isFinite(numericId) && numericId > 0) {
    await apiUpdateProductStatus(numericId, "PUBLISHED");
  }

  const now = new Date().toISOString();
  const wasPublished = character.status === "Published";

  // The Store references exactly one version: unlink siblings, link the chosen one.
  for (const item of db.versions) {
    if (item.characterId === character.characterId) {
      item.storeListingId = item.versionId === selected.versionId ? listing.listingId : null;
    }
  }

  character.status = "Published";
  character.visibility = "Visible";
  character.updatedAt = now;
  listing.status = "Published";
  listing.publisherUserId = actor!.userId;
  listing.publishedAt = wasPublished ? listing.publishedAt : now;
  listing.updatedAt = now;

  return structuredClone(toRow(character));
}

export interface UnlistCharacterInput {
  characterId: string;
  actor: ListingActor | null;
}

/**
 * POST /manager/store-listings/characters/:characterId/unlist
 * Hides the character from the Store.
 */
export async function unlistCharacter({ characterId, actor }: UnlistCharacterInput) {
  assertManager(actor);

  const character = findCharacter(characterId);
  if (character.status !== "Published") {
    throw new StoreListingError("Chỉ có thể ẩn Character đang được publish.", "VALIDATION");
  }

  // Cập nhật trạng thái UNPUBLISHED lên Backend database
  const numericId = Number(characterId);
  if (Number.isFinite(numericId) && numericId > 0) {
    await apiUpdateProductStatus(numericId, "UNPUBLISHED");
  }

  const listing = findListing(character.listingId);
  const now = new Date().toISOString();

  character.status = "Hidden";
  character.visibility = "Hidden";
  character.updatedAt = now;
  listing.status = "Hidden";
  listing.updatedAt = now;

  return structuredClone(toRow(character));
}
