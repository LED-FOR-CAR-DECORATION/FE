"use client";

import { useEffect, useState } from "react";

export type GridColumnCount = 1 | 2 | 3 | 4;

function computeGridColumns(width: number): GridColumnCount {
  if (width >= 1280) return 4;
  if (width >= 1024) return 3;
  if (width >= 640) return 2;
  return 1;
}

function computeAdaptiveRows(
  viewportHeight: number,
  estimatedRowHeight: number,
  chromeHeight: number,
  maxRows: number,
  rowGap = 12,
  minRows = 1,
): number {
  const available = Math.max(0, viewportHeight - chromeHeight);
  const raw = Math.floor((available + rowGap) / (estimatedRowHeight + rowGap));
  return Math.max(minRows, Math.min(maxRows, raw));
}

/**
 * Matches Tailwind grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
 * so paginated pages always fit cleanly without scrolling.
 */
export function useResponsiveGridColumns(): { columns: GridColumnCount; ready: boolean } {
  const [state, setState] = useState<{ columns: GridColumnCount; ready: boolean }>({
    columns: 4,
    ready: false,
  });

  useEffect(() => {
    const update = () => {
      setState({
        columns: computeGridColumns(window.innerWidth),
        ready: true,
      });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return state;
}

/**
 * Computes BOTH responsive columns (1..4 by width) and adaptive rows (1..maxRows by viewport height)
 * so every page shows as many full card rows as fit on the current machine without vertical scrolling.
 */
export function useAdaptiveGridLayout({
  estimatedRowHeight = 224,
  chromeHeight = 240,
  maxRows = 3,
}: {
  estimatedRowHeight?: number;
  chromeHeight?: number;
  maxRows?: number;
} = {}): { columns: GridColumnCount; rows: number; pageSize: number; ready: boolean } {
  const [state, setState] = useState<{
    columns: GridColumnCount;
    rows: number;
    ready: boolean;
  }>({
    columns: 4,
    rows: 2,
    ready: false,
  });

  useEffect(() => {
    let timer: number | undefined;
    const compute = () => {
      const cols = computeGridColumns(window.innerWidth);
      const effectiveMaxRows = cols === 1 ? Math.min(2, maxRows) : maxRows;
      const rows = computeAdaptiveRows(
        window.innerHeight,
        estimatedRowHeight,
        chromeHeight,
        effectiveMaxRows,
      );
      setState({ columns: cols, rows, ready: true });
    };

    compute();
    const onResize = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(compute, 120);
    };
    window.addEventListener("resize", onResize);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [estimatedRowHeight, chromeHeight, maxRows]);

  return {
    columns: state.columns,
    rows: state.rows,
    pageSize: state.columns * state.rows,
    ready: state.ready,
  };
}

/**
 * Computes compact list row limit from viewport height for vertical stacked lists
 * (e.g. sidebars / publish character & version selectors) with 120ms resize debounce.
 */
export function useAdaptiveListRows({
  estimatedRowHeight = 64,
  rowGap = 6,
  chromeHeight = 300,
  minRows = 3,
  maxRows = 8,
  defaultRows = 4,
}: {
  estimatedRowHeight?: number;
  rowGap?: number;
  chromeHeight?: number;
  minRows?: number;
  maxRows?: number;
  defaultRows?: number;
} = {}): { rows: number; ready: boolean } {
  const [state, setState] = useState<{ rows: number; ready: boolean }>({
    rows: defaultRows,
    ready: false,
  });

  useEffect(() => {
    let timer: number | undefined;
    const compute = () => {
      const rows = computeAdaptiveRows(
        window.innerHeight,
        estimatedRowHeight,
        chromeHeight,
        maxRows,
        rowGap,
        minRows,
      );
      setState({ rows, ready: true });
    };

    compute();
    const onResize = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(compute, 120);
    };
    window.addEventListener("resize", onResize);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [estimatedRowHeight, rowGap, chromeHeight, minRows, maxRows]);

  return state;
}

/**
 * Computes compact list page size (3-8 rows) based on viewport height
 * with 120ms resize debounce so /designer/dashboard stays within one screen
 * without vertical scrolling.
 */
export function useDashboardRowLimit(): { rows: number; ready: boolean } {
  return useAdaptiveListRows({
    estimatedRowHeight: 54,
    rowGap: 0,
    chromeHeight: 388,
    minRows: 3,
    maxRows: 8,
    defaultRows: 4,
  });
}
