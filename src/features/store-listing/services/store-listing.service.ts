import { SEED_CHARACTERS, SEED_LISTINGS, SEED_VERSIONS } from "../mock-data";
import type {
  CharacterVersion,
  ListingActor,
  StoreCharacter,
  StoreCharacterRow,
  StoreListing,
} from "../types";

/**
 * Mock Store Listing API.
 *
 * Stands in for the backend until the contract exists: every function is async,
 * simulates latency, and enforces the business rules the real API must enforce:
 *
 * - BR-14: only a Manager may publish / change / unlist (set `status`/`visibility`).
 * - BR-10: publishing REQUIRES an explicit `versionId` that belongs to the character.
 *   There is deliberately no code path that picks a version (e.g. highest number).
 */

export class StoreListingError extends Error {
  constructor(message: string, readonly code: "FORBIDDEN" | "NOT_FOUND" | "VALIDATION") {
    super(message);
    this.name = "StoreListingError";
  }
}

const LATENCY_MS = 450;

// In-memory "database" so changes survive client-side navigation like a real backend.
const db = {
  characters: structuredClone(SEED_CHARACTERS),
  listings: structuredClone(SEED_LISTINGS),
  versions: structuredClone(SEED_VERSIONS),
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
  await delay();
  return structuredClone(db.characters.map(toRow));
}

/** GET /manager/store-listings/characters/:characterId/versions — every CHARACTER_VERSION of the character. */
export async function getCharacterVersions(characterId: string): Promise<CharacterVersion[]> {
  await delay(350);
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
  await delay();
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
 * Hides the character from the Store. The last published version stays linked so it
 * can be shown as a hint later, but republishing still requires an explicit choice.
 */
export async function unlistCharacter({ characterId, actor }: UnlistCharacterInput) {
  await delay();
  assertManager(actor);

  const character = findCharacter(characterId);
  if (character.status !== "Published") {
    throw new StoreListingError("Chỉ có thể ẩn Character đang được publish.", "VALIDATION");
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
