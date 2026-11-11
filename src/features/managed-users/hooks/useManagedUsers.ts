import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { listManagedUsers } from "@/lib/api/users";
import type { ManagedUserList, ManagedUserQuery } from "../types";

type Result = {
  data?: ManagedUserList;
  error?: string;
  unauthorized?: boolean;
};

export function useManagedUsers(
  token: string,
  query: ManagedUserQuery,
  attempt: number,
) {
  const [result, setResult] = useState<{
    token: string;
    query: ManagedUserQuery;
    attempt: number;
    value: Result;
  }>();

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const finish = (value: Result) => {
      if (!controller.signal.aborted)
        setResult({ token, query, attempt, value });
    };
    listManagedUsers(query, token, controller.signal).then(
      (data) => finish({ data }),
      (error: unknown) => {
        const status = error instanceof ApiError ? error.status : undefined;
        finish({
          unauthorized: status === 401,
          error:
            status === 401
              ? "Phiên đã hết hạn. Vui lòng xác thực lại."
              : status === 403
                ? "Chỉ tài khoản Admin hoặc Manager được xem danh sách này."
                : "Không tải được danh sách người dùng.",
        });
      },
    );
    return () => controller.abort();
  }, [token, query, attempt]);

  return result?.token === token &&
    result.query === query &&
    result.attempt === attempt
    ? result.value
    : undefined;
}
