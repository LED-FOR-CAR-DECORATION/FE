import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { listManagedUsers } from "@/lib/api/users";
import type { ManagedUserList, ManagedUserQuery } from "../types";

type Result = {
  data?: ManagedUserList;
  error?: string;
  unauthorized?: boolean;
};

export function useManagedUsers(
  accountId: string | undefined,
  query: ManagedUserQuery,
  attempt: number,
) {
  const [result, setResult] = useState<{
    accountId: string | undefined;
    query: ManagedUserQuery;
    attempt: number;
    value: Result;
  }>();

  useEffect(() => {
    if (!accountId) return;
    const controller = new AbortController();
    const finish = (value: Result) => {
      if (!controller.signal.aborted)
        setResult({ accountId, query, attempt, value });
    };
    listManagedUsers(query, controller.signal).then(
      (data) => finish({ data }),
      (error: unknown) => {
        const status = isAxiosError(error) ? error.response?.status : undefined;
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
  }, [accountId, query, attempt]);

  return result?.accountId === accountId &&
    result &&
    result.query === query &&
    result.attempt === attempt
    ? result.value
    : undefined;
}
