"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  getStoreCharacters,
  publishCharacterVersion,
  unlistCharacter,
} from "../services/store-listing.service";
import type { ListingActor, StoreCharacterRow } from "../types";

/**
 * Table data + mutations for the Characters tab.
 *
 * `canManage` reflects BR-14 in the UI (only a Manager can change visibility);
 * the service enforces the same rule independently.
 */
export function useStoreCharacters() {
  const { user } = useAuth();
  const [rows, setRows] = useState<StoreCharacterRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const actor = useMemo<ListingActor | null>(
    () => (user ? { userId: user.userId, role: user.role } : null),
    [user],
  );
  const canManage = actor?.role === "MANAGER";

  const load = useCallback(async () => {
    try {
      setRows(await getStoreCharacters());
      setError(null);
    } catch {
      setError("Không thể tải danh sách Character. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = useCallback(() => {
    setIsLoading(true);
    void load();
  }, [load]);

  /** Publish / change version / republish. `versionId` MUST be an explicit Manager choice (BR-10). */
  const publish = useCallback(
    async (characterId: string, versionId: string) => {
      const updated = await publishCharacterVersion({ characterId, versionId, actor });
      await load();
      return updated;
    },
    [actor, load],
  );

  const unlist = useCallback(
    async (characterId: string) => {
      const updated = await unlistCharacter({ characterId, actor });
      await load();
      return updated;
    },
    [actor, load],
  );

  return { rows, isLoading, error, retry, canManage, publish, unlist };
}
