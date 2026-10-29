import axios from "axios";
import { clearSession, getAccessToken } from "@/lib/auth/session";

export interface ApiResponse<T> { data: T }

export interface ApiErrorBody {
  code: string;
  message: string;
  status: number;
  timestamp: string;
  traceId: string;
  details: unknown[];
}

export class ApiError extends Error {
  constructor(message: string, public readonly body?: ApiErrorBody, options?: ErrorOptions) {
    super(message, options);
    this.name = "ApiError";
  }
}

export const apiClient = axios.create({
  baseURL: "/api",
  timeout: 15_000,
  headers: { Accept: "application/json" },
});

apiClient.interceptors.request.use((config) => {
  if (config.url !== "/auth/login" && config.url !== "/auth/register") {
    const token = getAccessToken();
    if (token) config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

apiClient.interceptors.response.use((response) => response, (error: unknown) => {
  if (!axios.isAxiosError(error)) return Promise.reject(error);
  if (error.response?.status === 401 && error.config?.url !== "/auth/login" && error.config?.url !== "/auth/register") clearSession();
  const body = error.response?.data;
  const apiError = body && typeof body.code === "string" && typeof body.message === "string"
    && Array.isArray(body.details) ? body as ApiErrorBody : undefined;
  const message = apiError?.message || (error.code === "ECONNABORTED"
    ? "Máy chủ phản hồi quá lâu. Vui lòng thử lại."
    : !error.response ? "Không thể kết nối máy chủ. Vui lòng thử lại."
    : "Yêu cầu không thành công. Vui lòng thử lại.");
  return Promise.reject(new ApiError(message, apiError, { cause: error }));
});
