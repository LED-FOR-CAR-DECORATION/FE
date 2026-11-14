import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import { listLedModels } from "@/lib/api/led-models";
import type { LedModelFilters, LedModelPage } from "../types";

type Result =
  | { page: LedModelPage; error?: never }
  | { page?: never; error: string };

export function useLedModels(filters: LedModelFilters, attempt: number) {
  const [state, setState] = useState<{
    filters: LedModelFilters;
    attempt: number;
    result: Result;
  }>();

  useEffect(() => {
    const controller = new AbortController();
    function finish(result: Result) {
      if (!controller.signal.aborted) setState({ filters, attempt, result });
    }

    listLedModels(filters, controller.signal).then(
      (page) => finish({ page }),
      (error: unknown) => {
        const status = isAxiosError(error) ? error.response?.status : undefined;
        if (status === 401)
          return finish({
            error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
          });
        if (status === 403)
          return finish({
            error: "Bạn không có quyền xem danh sách model LED.",
          });
        finish({ error: "Không tải được danh sách model LED." });
      },
    );

    return () => controller.abort();
  }, [filters, attempt]);

  return state?.filters === filters && state.attempt === attempt
    ? state.result
    : undefined;
}
