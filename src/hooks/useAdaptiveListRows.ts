"use client";

import { useEffect, useState } from "react";

export function computeAdaptiveRows(
  viewportHeight: number,
  estimatedRowHeight: number,
  chromeHeight: number,
  maxRows: number,
  rowGap = 0,
  minRows = 1,
): number {
  const available = Math.max(0, viewportHeight - chromeHeight);
  const raw = Math.floor((available + rowGap) / (estimatedRowHeight + rowGap));
  return Math.max(minRows, Math.min(maxRows, raw));
}

/**
 * Computes compact list/table row count from viewport height (debounced 120ms on resize)
 * so management tables fit cleanly within one screen without vertical scrolling.
 */
export function useAdaptiveListRows({
  estimatedRowHeight = 64,
  rowGap = 0,
  chromeHeight = 360,
  minRows = 3,
  maxRows = 10,
  defaultRows = 5,
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
      setState({
        rows: computeAdaptiveRows(
          window.innerHeight,
          estimatedRowHeight,
          chromeHeight,
          maxRows,
          rowGap,
          minRows,
        ),
        ready: true,
      });
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
