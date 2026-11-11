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
