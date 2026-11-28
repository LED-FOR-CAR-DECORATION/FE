import { isServer, QueryClient } from "@tanstack/react-query";

/** Lỗi 4xx (trừ 408/429) là lỗi nghiệp vụ, gọi lại cũng vô ích. */
function isClientError(error: unknown): boolean {
  const status =
    (error as { status?: number } | null)?.status ??
    (error as { response?: { status?: number } } | null)?.response?.status;
  return typeof status === "number" && status >= 400 && status < 500 && status !== 408 && status !== 429;
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Dữ liệu mới trong 30s: chuyển trang qua lại không gọi lại API.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        // Một lần duy nhất khi quay lại tab, và chỉ với query đã cũ.
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchIntervalInBackground: false,
        retry: (failureCount, error) => !isClientError(error) && failureCount < 1,
      },
      mutations: { retry: false },
    },
  });
}

let browserClient: QueryClient | undefined;

/** Server: mỗi request một client. Browser: một client dùng chung cho cả phiên. */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  browserClient ??= makeQueryClient();
  return browserClient;
}

/** Xoá toàn bộ cache, dùng khi đăng xuất/đổi tài khoản để không lộ dữ liệu của người trước. */
export function clearQueryCache(): void {
  if (isServer || !browserClient) return;
  browserClient.cancelQueries();
  browserClient.clear();
}
