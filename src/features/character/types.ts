export interface Character {
  characterId: string;
  name: string;
  description: string;
  thumbnailUrl?: string;
  fileUrl?: string;
  previewUrl?: string;
  format: string;
  animationType: string;
  creatorUserId?: string;
  visibility: "PUBLIC" | "PRIVATE";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

export interface UserEntitlement {
  entitlementId: string;
  userId: string;
  characterId: string;
  sourceType: "ORDER" | "PAYMENT";
  sourceReferenceId: string;
  grantedAt: string;
}
