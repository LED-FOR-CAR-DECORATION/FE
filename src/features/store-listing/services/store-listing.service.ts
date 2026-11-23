import { apiDeleteStoreProduct, apiUpdateProductStatus, fetchStoreProducts } from "@/lib/api/products";
import { ProductFilterRequest, type CreatedStoreProductResponse } from "@/api_client";
import { request } from "@/api_client/core/request";
import { OpenAPI } from "@/lib/api/client";
import { fetchCharacterVersions } from "@/lib/api/designerCharacters";
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
  const draftsPromise = request<{
    data: {
      productId: number;
      productName: string;
      basePrice: number;
      description?: string | null;
      thumbnailUrl?: string | null;
      galleryUrls: string[];
      createdAt: string;
      updatedAt?: string | null;
    }[];
  }>(OpenAPI, {
    method: "GET",
    url: "/api/management/admin/store/products/drafts",
  })
    .then(({ data }) => data || [])
    .catch((error) => {
      console.warn("Failed to load Store drafts:", error);
      return [];
    });

  const backendCharactersPromise = fetchStoreProducts({
    productType: ProductFilterRequest.productType.CHARACTER,
    size: 100,
  })
    .then((res) => res.items)
    .catch((error) => {
      console.warn("Failed to load published store characters:", error);
      return [];
    });

  const [rawDrafts, rawPublished] = await Promise.all([
    draftsPromise,
    backendCharactersPromise,
  ]);

  const deletedIds = getDeletedProductIds();
  const createdProducts = getCreatedStoreProducts().filter(
    (item) => item.productType === "CHARACTER" && item.productId != null,
  );
  const createdById = new Map(createdProducts.map((item) => [String(item.productId), item]));

  const resultRows: StoreCharacterRow[] = [];
  const processedIds = new Set<string>();

  // 1. Process drafts (UNPUBLISHED character products awaiting approval)
  for (const draft of rawDrafts) {
    const id = String(draft.productId);
    if (processedIds.has(id)) continue;
    processedIds.add(id);

    const isDeleted = deletedIds.has(id);
    const createdRecord = createdById.get(id);
    const isActuallyPublished = createdRecord?.status === "PUBLISHED";

    const status: ListingStatus = isDeleted
      ? "Deleted"
      : isActuallyPublished
      ? "Published"
      : "Pending Review";

    const row: StoreCharacterRow = {
      characterId: id,
      name: draft.productName,
      description: draft.description ?? "",
      thumbnailUrl: draft.thumbnailUrl || "/images/products/characters/cyber-fox.png",
      creatorUserId: "usr-designer",
      creatorName: "Designer Studio",
      listingId: `lst-${id}`,
      visibility: isActuallyPublished ? "Visible" : "Hidden",
      status,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt ?? draft.createdAt,
      activeVersion: null,
      draft: {
        basePrice: Number(draft.basePrice ?? 0),
        thumbnailUrl: draft.thumbnailUrl,
        galleryUrls: draft.galleryUrls || [],
      },
    };
    resultRows.push(row);
  }

  // 2. Process published characters from Store Catalog
  for (const item of rawPublished) {
    const id = String(item.productId ?? item.id);
    if (processedIds.has(id)) continue;
    processedIds.add(id);

    const createdRecord = createdById.get(id);
    const isDeleted = deletedIds.has(id) || createdRecord?.status === "DELETED";
    const isArchived = !isDeleted && createdRecord?.status === "ARCHIVED";
    const isHidden = !isDeleted && !isArchived && createdRecord?.status === "UNPUBLISHED";

    const status: ListingStatus = isDeleted
      ? "Deleted"
      : isArchived
      ? "Archived"
      : isHidden
      ? "Hidden"
      : "Published";

    const row: StoreCharacterRow = {
      characterId: id,
      name: item.name,
      description: item.description ?? "",
      thumbnailUrl: item.previewUrl || "/images/products/characters/cyber-fox.png",
      creatorUserId: "usr-designer",
      creatorName: "Designer Studio",
      listingId: `lst-${id}`,
      visibility: status === "Published" ? "Visible" : "Hidden",
      status,
      createdAt: "2026-11-10T08:00:00Z",
      updatedAt: new Date().toISOString(),
      activeVersion: { versionId: `ver-${id}-1`, versionNumber: 1 },
    };
    resultRows.push(row);
  }

  // 3. Process any created character products in session that haven't appeared above
  for (const created of createdProducts) {
    const id = String(created.productId);
    if (processedIds.has(id)) continue;
    processedIds.add(id);

    const isDeleted = deletedIds.has(id) || created.status === "DELETED";
    const status: ListingStatus = isDeleted
      ? "Deleted"
      : created.status === "PUBLISHED"
      ? "Published"
      : created.status === "ARCHIVED"
      ? "Archived"
      : "Pending Review";

    const vNum = (created as any)?.characterVersionNumber ?? created.characterVersionId ?? 1;

    const row: StoreCharacterRow = {
      characterId: id,
      name: created.productName ?? `Character #${id}`,
      description: created.description ?? "",
      thumbnailUrl: created.thumbnailUrl || "/images/products/characters/cyber-fox.png",
      creatorUserId: "usr-designer",
      creatorName: "Designer Studio",
      listingId: `lst-${id}`,
      visibility: status === "Published" ? "Visible" : "Hidden",
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activeVersion: status === "Published" ? { versionId: `ver-${id}-${vNum}`, versionNumber: vNum } : null,
      draft: {
        basePrice: Number(created.basePrice ?? 0),
        thumbnailUrl: created.thumbnailUrl,
        galleryUrls: created.galleryUrls || [],
      },
    };
    resultRows.push(row);
  }

  // Update in-memory db cache
  db.characters = resultRows.map((r) => ({ ...r }));
  db.listings = resultRows.map((r) => ({
    listingId: r.listingId,
    publisherUserId: r.status === "Published" ? "usr-manager" : null,
    price: r.draft?.basePrice ?? 199000,
    isFree: (r.draft?.basePrice ?? 199000) === 0,
    status: r.status,
    publishedAt: r.status === "Published" ? r.createdAt : null,
    updatedAt: r.updatedAt,
  }));

  // Ensure db.versions has corresponding entries for active versions
  for (const row of resultRows) {
    if (!db.versions.some((v) => v.characterId === row.characterId)) {
      const vNum = row.activeVersion?.versionNumber ?? 1;
      db.versions.push({
        versionId: `ver-${row.characterId}-${vNum}`,
        characterId: row.characterId,
        storeListingId: row.status === "Published" ? row.listingId : null,
        versionNumber: vNum,
        fileUrl: row.thumbnailUrl,
        ledBinaryUrl: "",
        format: "LED_BINARY",
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
          ledBinaryUrl: "",
          format: "LED_BINARY",
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
