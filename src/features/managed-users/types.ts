export interface ManagedUserQuery {
  page: number;
  size: number;
  search?: string;
  role?: string;
  active?: boolean;
}

export interface ManagedUser {
  accountId: number;
  name: string | null;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  status: string;
  active: boolean;
}

export interface ManagedUserList {
  items: ManagedUser[];
  meta: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export const INTERNAL_ROLES = ["STAFF", "MANAGER", "DESIGNER"] as const;
export type InternalRole = (typeof INTERNAL_ROLES)[number];

export interface ManagedUserDetail {
  accountId: number;
  name: string | null;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  lockout: {
    locked: boolean;
    lockoutUntil: string | null;
    failedAttempts: number;
  };
}

export interface CreateInternalUserPayload {
  email: string;
  fullName: string;
  role: InternalRole;
  phone: string;
}
