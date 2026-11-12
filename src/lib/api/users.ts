import axios from "axios";
import type {
  CreateInternalUserPayload,
  ManagedUserDetail,
  ManagedUserList,
  ManagedUserQuery,
} from "@/features/managed-users/types";
import { getApiBaseUrl, OpenAPI } from "./client";
import { getSessionToken } from "../auth/session";

export async function getManagedUserDetail(
  id: string,
  signal?: AbortSignal,
): Promise<ManagedUserDetail> {
  const token = await getSessionToken();
  const { data } = await axios.get<{ data: ManagedUserDetail }>(
    `/api/management/admin/users/${encodeURIComponent(id)}`,
    {
      baseURL: getApiBaseUrl(),
      withCredentials: OpenAPI.WITH_CREDENTIALS,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal,
    },
  );
  return data.data;
}

export async function createInternalUser(
  payload: CreateInternalUserPayload,
): Promise<void> {
  const token = await getSessionToken();
  await axios.post(
    "/api/management/admin/users",
    {
      email: payload.email,
      role: payload.role,
      // BE (CreateInternalUserRequest) nhận trường "name".
      name: payload.fullName,
      phone: payload.phone || undefined,
    },
    {
      baseURL: getApiBaseUrl(),
      withCredentials: OpenAPI.WITH_CREDENTIALS,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
}

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
