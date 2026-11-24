import {
  apiDeleteStoreProduct,
  apiUpdateProductStatus,
  fetchManagedStoreProducts,
} from "@/lib/api/products";
import { type CreatedStoreProductResponse } from "@/api_client";
import { fetchCharacterVersions } from "@/lib/api/designerCharacters";
import type {
  CharacterVersion,
  ListingActor,
  StoreCharacter,
  StoreCharacterRow,
  StoreListing,
  StoreProductStatus,
} from "../types";

/**
 * Store Listing Service.
 *
 * Đồng bộ trực tiếp với Backend API theo `ProductStatus`:
 * - UNPUBLISHED (Chờ duyệt)
 * - PUBLISHED (Đang bán)
 * - ARCHIVED (Ngừng bán)
 * - DELETED (Đã xóa)
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
  const set = new Set<string>();
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

/** GET /api/management/admin/store/products?productType=CHARACTER */
export async function getStoreCharacters(): Promise<StoreCharacterRow[]> {
  const res = await fetchManagedStoreProducts({
    productType: "CHARACTER",
    size: 200,
  });

  const now = new Date().toISOString();
  const resultRows: StoreCharacterRow[] = res.items.map((item) => {
    const id = String(item.productId);
    const status: StoreProductStatus = item.status;
    const isPublished = status === "PUBLISHED";
    const basePrice = Number(item.basePrice ?? 0);
    const galleryUrls = item.galleryUrls ?? [];

    return {
      characterId: id,
      name: item.productName,
      description: item.description ?? "",
      thumbnailUrl: item.thumbnailUrl || "/images/products/characters/cyber-fox.png",
      creatorUserId: "usr-designer",
      creatorName: "Designer Studio",
      listingId: `lst-${id}`,
      visibility: isPublished ? "Visible" : "Hidden",
      status,
      basePrice,
      galleryUrls,
      tags: item.tags ?? [],
      createdAt: item.createdAt ?? now,
      updatedAt: item.updatedAt ?? item.createdAt ?? now,
      activeVersion: isPublished || status === "ARCHIVED"
        ? { versionId: `ver-${id}-1`, versionNumber: 1 }
        : null,
      draft: {
        basePrice,
        thumbnailUrl: item.thumbnailUrl,
        galleryUrls,
      },
      rawProduct: item,
    };
  });

  // Update in-memory db cache
  db.characters = resultRows.map((r) => ({ ...r }));
  db.listings = resultRows.map((r) => ({
    listingId: r.listingId,
    publisherUserId: r.status === "PUBLISHED" ? "usr-manager" : null,
    price: r.basePrice ?? 199000,
    isFree: (r.basePrice ?? 199000) === 0,
    status: r.status,
    publishedAt: r.status === "PUBLISHED" ? r.createdAt : null,
    updatedAt: r.updatedAt,
  }));

  // Ensure db.versions has corresponding entries for active versions
  for (const row of resultRows) {
    if (!db.versions.some((v) => v.characterId === row.characterId)) {
      const vNum = row.activeVersion?.versionNumber ?? 1;
      db.versions.push({
        versionId: `ver-${row.characterId}-${vNum}`,
        characterId: row.characterId,
        storeListingId: row.status === "PUBLISHED" ? row.listingId : null,
        versionNumber: vNum,
        fileUrl: row.thumbnailUrl,
        format: "GIF",
        width: 64,
        height: 64,
        frameCount: 16,
        frameDelayMs: 60,
        byteSize: 1024,
        changelog: `Phiên bản #${vNum}`,
        isCurrent: true,
        createdAt: row.createdAt,
      });
    }
  }

  return resultRows;
}

/** GET /manager/store-listings/characters/:characterId/versions — every CHARACTER_VERSION of the character. */
export async function getCharacterVersions(characterId: string): Promise<CharacterVersion[]> {
  await delay(100);
  const character = db.characters.find((c) => c.characterId === characterId);
  const numericId = Number(characterId);

  // If we already have multiple versions cached in db.versions for this characterId
  const cached = db.versions.filter((item) => item.characterId === characterId);
  if (cached.length > 1) {
    return structuredClone(cached.sort((a, b) => b.versionNumber - a.versionNumber));
  }

  // Try fetching actual versions from backend if numericId > 0
  if (Number.isFinite(numericId) && numericId > 0) {
    try {
      const realVersions = await fetchCharacterVersions(numericId);
      if (realVersions && realVersions.length > 0) {
        const mapped: CharacterVersion[] = realVersions.map((rv) => ({
          versionId: String(rv.versionId),
          characterId,
          storeListingId: rv.isListedOnStore ? (character?.listingId ?? `lst-${characterId}`) : null,
          versionNumber: rv.versionNumber,
          fileUrl: rv.previewGifUrl || character?.thumbnailUrl || "",
          format: "GIF",
          width: 64,
          height: 64,
          frameCount: rv.frameCount ?? 16,
          frameDelayMs: rv.frameDelayMs ?? 60,
          byteSize: rv.byteSize ?? 1024,
          changelog: `Phiên bản #${rv.versionNumber} từ Designer`,
          isCurrent: rv.isCurrent,
          createdAt: rv.createdAt,
        }));

        db.versions = db.versions.filter((item) => item.characterId !== characterId).concat(mapped);
        return structuredClone(mapped.sort((a, b) => b.versionNumber - a.versionNumber));
      }
    } catch (err) {
      console.warn("fetchCharacterVersions backend call failed:", err);
    }
  }

  return structuredClone(cached.sort((a, b) => b.versionNumber - a.versionNumber));
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
  const wasPublished = character.status === "PUBLISHED";

  // The Store references exactly one version: unlink siblings, link the chosen one.
  for (const item of db.versions) {
    if (item.characterId === character.characterId) {
      item.storeListingId = item.versionId === selected.versionId ? listing.listingId : null;
    }
  }

  character.status = "PUBLISHED";
  character.visibility = "Visible";
  character.updatedAt = now;
  listing.status = "PUBLISHED";
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
 * Hides the character from the Store (UNPUBLISHED).
 */
export async function unlistCharacter({ characterId, actor }: UnlistCharacterInput) {
  assertManager(actor);

  const character = findCharacter(characterId);
  if (character.status !== "PUBLISHED") {
    throw new StoreListingError("Chỉ có thể chuyển về Chờ duyệt khi nhân vật Đang bán.", "VALIDATION");
  }

  // Cập nhật trạng thái UNPUBLISHED lên Backend database
  const numericId = Number(characterId);
  if (Number.isFinite(numericId) && numericId > 0) {
    await apiUpdateProductStatus(numericId, "UNPUBLISHED");
  }
  updateCreatedStoreProductStatus(characterId, "UNPUBLISHED");

  const listing = findListing(character.listingId);
  const now = new Date().toISOString();

  character.status = "UNPUBLISHED";
  character.visibility = "Hidden";
  character.updatedAt = now;
  listing.status = "UNPUBLISHED";
  listing.updatedAt = now;

  return structuredClone(toRow(character));
}

/**
 * Ngừng bán / Lưu trữ sản phẩm (ARCHIVED).
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

  character.status = "ARCHIVED";
  character.visibility = "Hidden";
  character.updatedAt = now;
  listing.status = "ARCHIVED";
  listing.updatedAt = now;

  return structuredClone(toRow(character));
}

/**
 * Xóa mềm sản phẩm (DELETED).
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
    character.status = "DELETED";
    character.visibility = "Hidden";
    const listing = db.listings.find((l) => l.listingId === character.listingId);
    if (listing) {
      listing.status = "DELETED";
    }
  }
}
