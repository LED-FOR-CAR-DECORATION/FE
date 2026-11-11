export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`/backend-api/${path}`, {
    ...init,
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.message ?? "Không thể kết nối với API.",
    );
  }
  if (body?.data == null) throw new Error("Phản hồi API không hợp lệ.");
  return body.data as T;
}
