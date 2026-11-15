import { apiDeleteStoreProduct, apiUpdateProductStatus, fetchStoreProducts } from "@/lib/api/products";
import type { CreatedStoreProductResponse } from "@/api_client";
import type {
  CharacterVersion,
  ListingActor,
  ListingStatus,
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

const DELETED_KEY = "mirage_deleted_product_ids";

export function getDeletedProductIds(): Set<string> {
  const set = new Set<string>(["4"]);
  if (typeof window === "undefined") return set;
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach((id) => set.add(String(id)));
      }
    }
  } catch {}
  return set;
}

export function markProductAsDeleted(id: string | number): void {
  if (typeof window === "undefined") return;
  try {
    const set = getDeletedProductIds();
    set.add(String(id));
    localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(set)));
  } catch {}
  updateCreatedStoreProductStatus(id, "DELETED");
}

const CREATED_PRODUCTS_KEY = "mirage_created_store_products";

export function getCreatedStoreProducts(): CreatedStoreProductResponse[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CREATED_PRODUCTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CreatedStoreProductResponse[]) : [];
  } catch {
    return [];
  }
}

export function saveCreatedStoreProduct(created: CreatedStoreProductResponse): void {
  if (typeof window === "undefined" || created.productId == null) return;
  try {
    const current = getCreatedStoreProducts().filter(
      (item) => String(item.productId) !== String(created.productId),
    );
    current.unshift(created);
    localStorage.setItem(CREATED_PRODUCTS_KEY, JSON.stringify(current));
  } catch {}
}

export function updateCreatedStoreProductStatus(
  productId: number | string,
  status: "PUBLISHED" | "UNPUBLISHED" | "ARCHIVED" | "DELETED",
): void {
  if (typeof window === "undefined") return;
  try {
    const current = getCreatedStoreProducts();
    let changed = false;
    const next = current.map((item) => {
      if (String(item.productId) === String(productId)) {
        changed = true;
        return { ...item, status: status as CreatedStoreProductResponse.status };
      }
      return item;
    });
    if (changed) {
      localStorage.setItem(CREATED_PRODUCTS_KEY, JSON.stringify(next));
    }
  } catch {}
}

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
  if (!actor || (actor.role !== "MANAGER" && actor.role !== "ADMIN")) {
    throw new StoreListingError(
      "Chỉ Manager hoặc Admin mới có quyền thay đổi nội dung hiển thị trên Store.",
      "FORBIDDEN",
    );
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
    const deletedIds = getDeletedProductIds();
    const createdProducts = getCreatedStoreProducts().filter(
      (item) => item.productType === "CHARACTER" && item.productId != null,
    );
    const createdById = new Map(createdProducts.map((item) => [String(item.productId), item]));

    // Kết hợp KNOWN_CHARACTERS, các characters từ Backend (PUBLISHED) và các character mới tạo (UNPUBLISHED)
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
    for (const created of createdProducts) {
      const id = String(created.productId);
      if (!allCharacters.some((c) => c.id === id)) {
        allCharacters.unshift({
          id,
          name: created.productName ?? `Character #${id}`,
          price: Number(created.basePrice ?? 0),
          description: created.description ?? "",
          thumbnailUrl: created.thumbnailUrl || "/images/products/characters/cyber-fox.png",
        });
      }
    }

    for (const charDef of allCharacters) {
      const createdRecord = createdById.get(charDef.id);
      const isDeleted = deletedIds.has(charDef.id) || createdRecord?.status === "DELETED";
      const isPublished = !isDeleted && publishedIds.has(charDef.id);
      if (isPublished && createdRecord && createdRecord.status !== "PUBLISHED") {
        updateCreatedStoreProductStatus(charDef.id, "PUBLISHED");
      }
      const isArchived = !isDeleted && !isPublished && createdRecord?.status === "ARCHIVED";
      const currentStatus: ListingStatus = isDeleted
        ? "Deleted"
        : isPublished
        ? "Published"
        : isArchived
        ? "Archived"
        : createdRecord?.status === "UNPUBLISHED"
        ? "Pending Review"
        : "Hidden";

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
          status: currentStatus,
          createdAt: "2026-11-10T08:00:00Z",
          updatedAt: "2026-11-11T10:00:00Z",
        };
        const listing: StoreListing = {
          listingId,
          publisherUserId: isPublished ? "usr-manager-1" : null,
          price: charDef.price,
          isFree: charDef.price === 0,
          status: currentStatus,
          publishedAt: isPublished ? "2026-11-10T08:00:00Z" : null,
          updatedAt: "2026-11-11T10:00:00Z",
        };

        if (createdRecord?.characterVersionId) {
          db.versions.push({
            versionId: `ver-${charDef.id}-${createdRecord.characterVersionId}`,
            characterId: charDef.id,
            storeListingId: isPublished ? listingId : null,
            versionNumber: createdRecord.characterVersionId,
            fileUrl: charDef.thumbnailUrl,
            ledBinaryUrl: "",
            format: "LED_BINARY",
            width: 64,
            height: 64,
            frameCount: 16,
            frameDelayMs: 60,
            byteSize: 1024,
            changelog: `Phiên bản liên kết #${createdRecord.characterVersionId} từ Store Product`,
            isCurrent: true,
            createdAt: new Date().toISOString(),
          });
        } else {
          const v1: CharacterVersion = {
            versionId: `ver-${charDef.id}-1`,
            characterId: charDef.id,
            storeListingId: currentStatus === "Pending Review" ? null : listingId,
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
            storeListingId: currentStatus === "Pending Review" ? null : listingId,
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
          db.versions.push(v1, v2);
        }

        if (createdRecord) {
          db.characters.unshift(character);
        } else {
          db.characters.push(character);
        }
        db.listings.push(listing);
      } else {
        // Đồng bộ trạng thái thực tế từ Backend PostgreSQL
        existing.status = currentStatus;
        existing.visibility = isPublished ? "Visible" : "Hidden";
        const listing = db.listings.find((l) => l.listingId === existing.listingId);
        if (listing) {
          listing.status = currentStatus;
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
  updateCreatedStoreProductStatus(characterId, "PUBLISHED");

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
  updateCreatedStoreProductStatus(characterId, "UNPUBLISHED");

  const listing = findListing(character.listingId);
  const now = new Date().toISOString();

  character.status = "Hidden";
  character.visibility = "Hidden";
  character.updatedAt = now;
  listing.status = "Hidden";
  listing.updatedAt = now;

  return structuredClone(toRow(character));
}

/**
 * Lưu trữ sản phẩm (ARCHIVED) per Story 3.
 */
export async function archiveCharacter({ characterId, actor }: UnlistCharacterInput) {
  assertManager(actor);

  const numericId = Number(characterId);
  if (Number.isFinite(numericId) && numericId > 0) {
    await apiUpdateProductStatus(numericId, "ARCHIVED");
  }
  updateCreatedStoreProductStatus(characterId, "ARCHIVED");

  const character = findCharacter(characterId);
  const listing = findListing(character.listingId);
  const now = new Date().toISOString();

  character.status = "Archived";
  character.visibility = "Hidden";
  character.updatedAt = now;
  listing.status = "Archived";
  listing.updatedAt = now;

  return structuredClone(toRow(character));
}

/**
 * Xóa mềm sản phẩm (DELETED) per Story 4.
 */
export async function deleteCharacter({ characterId, actor }: UnlistCharacterInput) {
  assertManager(actor);
  markProductAsDeleted(characterId);

  const numericId = Number(characterId);
  if (Number.isFinite(numericId) && numericId > 0) {
    try {
      await apiDeleteStoreProduct(numericId);
    } catch {}
  }

  const character = db.characters.find((c) => c.characterId === characterId);
  if (character) {
    character.status = "Deleted";
    character.visibility = "Hidden";
    const listing = db.listings.find((l) => l.listingId === character.listingId);
    if (listing) {
      listing.status = "Deleted";
    }
  }
}
