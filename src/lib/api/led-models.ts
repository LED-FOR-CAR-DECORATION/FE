import axios from "axios";
import type {
  LedModelFilters,
  LedModelPage,
} from "@/features/led-models/types";
import { getSessionToken } from "../auth/session";
import { getApiBaseUrl, OpenAPI } from "./client";

export async function listLedModels(
  filters: LedModelFilters,
  signal?: AbortSignal,
) {
  const token = await getSessionToken();
  const { data } = await axios.get<LedModelPage>(
    "/api/management/admin/led-models",
    {
      baseURL: getApiBaseUrl(),
      withCredentials: OpenAPI.WITH_CREDENTIALS,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      params: { ...filters, keyword: filters.keyword?.trim() || undefined },
      signal,
    },
  );
  return data;
}
