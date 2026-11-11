import type {
  ManagedUserList,
  ManagedUserQuery,
} from "@/features/managed-users/types";
import { apiRequest } from "./client";

export function listManagedUsers(
  query: ManagedUserQuery,
  token: string,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({
    page: String(query.page),
    size: String(query.size),
  });
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.role) params.set("role", query.role);
  if (query.active !== undefined) params.set("active", String(query.active));

  return apiRequest<ManagedUserList>(`management/admin/users?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}
