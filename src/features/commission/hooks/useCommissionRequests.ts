"use client";

import { useCallback, useEffect, useState } from "react";
import { getCommissionRequests, updateCommissionStatus } from "../services/commission.service";
import type { CommissionStatus } from "../types";

export function useCommissionRequests() {
  const [requests, setRequests] = useState(getCommissionRequests);
  const refresh = useCallback(() => setRequests(getCommissionRequests()), []);

  useEffect(() => {
    refresh();
    window.addEventListener("commission-requests-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("commission-requests-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const setStatus = (id: string, status: CommissionStatus) => {
    updateCommissionStatus(id, status);
    refresh();
  };

  return { requests, setStatus };
}
