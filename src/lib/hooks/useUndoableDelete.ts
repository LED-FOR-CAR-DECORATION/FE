"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface PendingDelete {
  id: string;
  label: string;
}

interface Options {
  /** Performs the real delete once the undo window expires. Throwing surfaces `error`. */
  onCommit: (id: string) => Promise<void> | void;
  delayMs?: number;
}

/**
 * Hide-now, delete-later pattern (UI standard §5.2, Railway "Reversible Actions").
 * One pending delete at a time: scheduling another commits the previous one immediately.
 * A pending delete is committed when the component unmounts.
 */
export function useUndoableDelete({ onCommit, delayMs = 5000 }: Options) {
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [error, setError] = useState("");
  const pendingRef = useRef<PendingDelete | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCommitRef = useRef(onCommit);

  useEffect(() => {
    onCommitRef.current = onCommit;
  });

  const commit = useCallback(async () => {
    const target = pendingRef.current;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    pendingRef.current = null;
    setPending(null);
    if (!target) return;
    try {
      await onCommitRef.current(target.id);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : `Không thể xóa “${target.label}”. Vui lòng thử lại.`);
    }
  }, []);

  const schedule = useCallback(
    (id: string, label: string) => {
      if (pendingRef.current) void commit();
      setError("");
      const next = { id, label };
      pendingRef.current = next;
      setPending(next);
      timerRef.current = setTimeout(() => void commit(), delayMs);
    },
    [commit, delayMs],
  );

  const undo = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    pendingRef.current = null;
    setPending(null);
  }, []);

  useEffect(
    () => () => {
      if (pendingRef.current) void commit();
    },
    [commit],
  );

  return {
    pending,
    isPending: (id: string) => pending?.id === id,
    schedule,
    undo,
    error,
    clearError: () => setError(""),
  };
}
