"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { SESSION_EXPIRED_EVENT } from "@/lib/auth/session";
import { clearQueryCache, getQueryClient } from "./client";

export default function QueryProvider({ children }: { children: ReactNode }) {
  // useState giữ một client ổn định cho cây React này (không tạo lại khi render lại).
  const [queryClient] = useState(getQueryClient);

  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, clearQueryCache);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, clearQueryCache);
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
