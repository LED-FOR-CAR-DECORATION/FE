/**
 * Store Listing Management — domain types.
 *
 * Shapes mirror the Conceptual ERD (`doc/ERD.md`): CHARACTER, CHARACTER_VERSION
 * and STORE_LISTING. Column names are camelCased and ids are strings, matching
 * the existing frontend convention.
 */

/** CHARACTER.status / STORE_LISTING.status as shown to the Manager. */
export type ListingStatus = "Pending Review" | "Published" | "Hidden";

/** CHARACTER.visibility. Only a Manager may set this to "Visible" (BR-14). */
export type CharacterVisibility = "Visible" | "Hidden";

/** STORE_LISTING */
export interface StoreListing {
  listingId: string;
  /** FK -> USER. Set to the Manager who published; null until first published. */
  publisherUserId: string | null;
  price: number;
  isFree: boolean;
  status: ListingStatus;
  publishedAt: string | null;
  updatedAt: string;
}

/** CHARACTER_VERSION */
export interface CharacterVersion {
  versionId: string;
  characterId: string;
  /** FK -> STORE_LISTING. Non-null only for the version the Store references (BR-10). */
  storeListingId: string | null;
  versionNumber: number;
  fileUrl: string;
  ledBinaryUrl: string;
  format: string;
  width: number;
  height: number;
  frameCount: number;
  frameDelayMs: number;
  byteSize: number;
  changelog: string;
  /** Designer's working/latest flag. Informational only — never used to auto-select (BR-10). */
  isCurrent: boolean;
  createdAt: string;
}

/** CHARACTER (+ designer name joined from USER.full_name, + its STORE_LISTING link). */
export interface StoreCharacter {
  characterId: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  /** FK -> USER (the Designer who uploaded it). */
  creatorUserId: string;
  creatorName: string;
  listingId: string;
  visibility: CharacterVisibility;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
}

/** The version the Store currently references for a character, if any. */
export interface ActiveVersionSummary {
  versionId: string;
  versionNumber: number;
}

/** A row of the Characters table: CHARACTER joined with its active CHARACTER_VERSION. */
export interface StoreCharacterRow extends StoreCharacter {
  activeVersion: ActiveVersionSummary | null;
}

/** Who is performing a store-visibility action. */
export interface ListingActor {
  userId: string;
  role: "CUSTOMER" | "DESIGNER" | "STAFF" | "MANAGER" | "ADMIN";
}

export type PublishMode = "review" | "change" | "republish";
