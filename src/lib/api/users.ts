import axios from "axios";
import type {
  ManagedUserList,
  ManagedUserQuery,
} from "@/features/managed-users/types";
import { getApiBaseUrl, OpenAPI } from "./client";
import { getSessionToken } from "../auth/session";

export async function listManagedUsers(
  query: ManagedUserQuery,
  signal?: AbortSignal,
): Promise<ManagedUserList> {
  const token = await getSessionToken();
  const { data } = await axios.get<{ data: ManagedUserList }>(
    "/api/management/admin/users",
    {
      baseURL: getApiBaseUrl(),
      withCredentials: OpenAPI.WITH_CREDENTIALS,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      params: {
        ...query,
        search: query.search?.trim() || undefined,
        role: query.role || undefined,
      },
      signal,
    },
  );
  return data.data;
}
