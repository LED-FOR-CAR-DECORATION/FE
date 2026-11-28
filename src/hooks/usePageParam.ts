"use client";

import { useCallback, useEffect, useState } from "react";

function readPage(param: string): number {
  if (typeof window === "undefined") return 1;
  const value = Number(new URLSearchParams(window.location.search).get(param));
  return Number.isInteger(value) && value > 0 ? value : 1;
}

/**
 * Trang hiện tại (đánh số từ 1), đồng bộ với `?page=` trên URL để F5 và nút Back giữ đúng trang.
 * Dùng history.replaceState nên không tạo thêm mục lịch sử và không cần bọc Suspense như useSearchParams.
 */
export function usePageParam(param = "page") {
  const [page, setPageState] = useState(1);

  useEffect(() => {
    setPageState(readPage(param));
  }, [param]);

  const setPage = useCallback(
    (next: number) => {
      const value = Math.max(1, Math.floor(next));
      setPageState(value);
      const url = new URL(window.location.href);
      if (value === 1) url.searchParams.delete(param);
      else url.searchParams.set(param, String(value));
      window.history.replaceState(window.history.state, "", url);
    },
    [param],
  );

  return [page, setPage] as const;
}

/** Cuộn mượt tới phần tử (thường là đầu danh sách) sau khi đổi trang. */
export function scrollToTop(element: HTMLElement | null) {
  if (!element) return;
  // Sticky Header (72px) + marquee banner (32px) + borders ≈ 106px
  const top = Math.max(0, element.getBoundingClientRect().top + window.scrollY - 120);
  if (top < window.scrollY) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
  }
}
