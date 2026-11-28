"use client";

import { fetchCharacterVersionsCached } from "../designer-characters-cache";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { getApiBaseUrl, OpenAPI } from "@/lib/api/client";
import { getSessionToken } from "@/lib/auth/session";
import {
  createDesignerCharacter,
  deleteCharacterVersion,
  fetchMyCharacters,
  formatDesignerApiError,
  isStoreCharacterType,
  type CharacterType,
  type CharacterVersionItem,
  type DesignerCharacterItem,
  type PaginationMeta,
} from "@/lib/api/designerCharacters";
import type { CreatedStoreProductResponse } from "@/api_client";

export type MatrixSize = "32x32" | "64x32" | "64x64";

const MATRIX_STORAGE_PREFIX = "character_matrix_size_";
const DEFAULT_PAGE_SIZE = 12;

export function getStoredMatrixSize(characterId: number): MatrixSize {
  if (typeof window === "undefined") return "32x32";
  const saved = window.localStorage.getItem(`${MATRIX_STORAGE_PREFIX}${characterId}`);
  return saved === "64x32" || saved === "64x64" ? saved : "32x32";
}

export function setStoredMatrixSize(characterId: number, size: MatrixSize) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${MATRIX_STORAGE_PREFIX}${characterId}`, size);
}

export function sortVersionsNewestFirst(versions: CharacterVersionItem[]): CharacterVersionItem[] {
  return [...versions].sort((a, b) => {
    if (b.versionNumber !== a.versionNumber) {
      return b.versionNumber - a.versionNumber;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export interface PublishToStoreInput {
  character: DesignerCharacterItem;
  version: CharacterVersionItem;
  productName: string;
  description?: string;
  tagIds?: number[];
}

export interface DesignerCharactersProviderProps {
  children: React.ReactNode;
  /** Responsive page size (number of items per page). Defaults to 12. */
  pageSize?: number;
  /** When true and pageSize >= 2, page 0 reserves 1 slot for an inline Create card. */
  reserveCreateSlotOnFirstPage?: boolean;
  /** Delay initial fetch until client breakpoint detection completes. Defaults to true. */
  ready?: boolean;
  /** Set false on pages that manage their own character fetch (e.g. /designer/publish). */
  autoLoadCharacters?: boolean;
}

interface DesignerCharactersContextValue {
  characters: DesignerCharacterItem[];
  meta: PaginationMeta;
  page: number;
  setPage: (page: number) => void;
  query: string;
  setQuery: (query: string) => void;
  characterTypeFilter: CharacterType | "ALL";
  setCharacterTypeFilter: (characterType: CharacterType | "ALL") => void;
  loading: boolean;
  error: string;
  versionsByCharacter: Record<number, CharacterVersionItem[]>;
  loadingVersions: Record<number, boolean>;
  matrixSizes: Record<number, MatrixSize>;
  refreshCharacters: () => Promise<void>;
  createCharacter: (input: {
    characterName: string;
    description?: string;
    matrixSize: MatrixSize;
    characterType?: CharacterType;
    commissionId?: number;
  }) => Promise<DesignerCharacterItem>;
  loadVersions: (characterId: number) => Promise<void>;
  deleteVersion: (characterId: number, versionId: number) => Promise<void>;
  getMatrixSize: (characterId: number) => MatrixSize;
  publishVersionToStore: (input: PublishToStoreInput) => Promise<CreatedStoreProductResponse>;
}

const DesignerCharactersContext = createContext<DesignerCharactersContextValue | null>(null);

export function DesignerCharactersProvider({
  children,
  pageSize = DEFAULT_PAGE_SIZE,
  reserveCreateSlotOnFirstPage = false,
  ready = true,
  autoLoadCharacters = true,
}: DesignerCharactersProviderProps) {
  const safePageSize = Math.max(1, pageSize);
  const hasCreateSlot = Boolean(reserveCreateSlotOnFirstPage && safePageSize >= 2);

  const [characters, setCharacters] = useState<DesignerCharacterItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 0,
    size: safePageSize,
    totalElements: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  });
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [characterTypeFilter, setCharacterTypeFilter] = useState<CharacterType | "ALL">("ALL");
  const [loading, setLoading] = useState(autoLoadCharacters);
  const [error, setError] = useState("");
  const [versionsByCharacter, setVersionsByCharacter] = useState<
    Record<number, CharacterVersionItem[]>
  >({});
  const [loadingVersions, setLoadingVersions] = useState<Record<number, boolean>>({});
  const latestVersionRequests = useRef(new Map<number, symbol>());
  const latestCharactersRequest = useRef<symbol | null>(null);
  const [matrixSizes, setMatrixSizes] = useState<Record<number, MatrixSize>>({});

  const refreshCharacters = useCallback(async () => {
    if (!ready || !autoLoadCharacters) return;
    const requestToken = Symbol();
    latestCharactersRequest.current = requestToken;
    setLoading(true);
    setError("");

    const trimmedQuery = query.trim() || undefined;
    const resolvedType = characterTypeFilter === "ALL" ? undefined : characterTypeFilter;

    let redirected = false;
    try {
      let resolvedItems: DesignerCharacterItem[];
      let resolvedMeta: PaginationMeta;

      if (!hasCreateSlot) {
        const res = await fetchMyCharacters({
          page,
          size: safePageSize,
          query: trimmedQuery,
          characterType: resolvedType,
        });
        resolvedItems = res.items;
        resolvedMeta = res.meta;
      } else {
        // Reserve 1 slot on page 0 for the inline Create card without skipping items across pages
        const firstPageCount = safePageSize - 1;
        const offset = page === 0 ? 0 : firstPageCount + (page - 1) * safePageSize;
        const count = page === 0 ? firstPageCount : safePageSize;

        const firstBePage = Math.floor(offset / safePageSize);
        const lastBePage = Math.floor((offset + count - 1) / safePageSize);

        const firstRes = await fetchMyCharacters({
          page: firstBePage,
          size: safePageSize,
          query: trimmedQuery,
          characterType: resolvedType,
        });

        const totalElements = firstRes.meta.totalElements;
        const totalPages =
          totalElements <= firstPageCount
            ? 1
            : 1 + Math.ceil((totalElements - firstPageCount) / safePageSize);

        if (page > 0 && page >= totalPages) {
          if (latestCharactersRequest.current === requestToken) {
            redirected = true;
            setPage(Math.max(0, totalPages - 1));
          }
          return;
        }

        const combined: DesignerCharacterItem[] = [...firstRes.items];
        if (lastBePage > firstBePage && firstRes.meta.hasNext) {
          const secondRes = await fetchMyCharacters({
            page: lastBePage,
            size: safePageSize,
            query: trimmedQuery,
            characterType: resolvedType,
          });
          combined.push(...secondRes.items);
        }

        const sliceStart = offset - firstBePage * safePageSize;
        resolvedItems = combined.slice(sliceStart, sliceStart + count);
        resolvedMeta = {
          page,
          size: count,
          totalElements,
          totalPages,
          hasPrevious: page > 0,
          hasNext: page + 1 < totalPages,
        };
      }

      if (latestCharactersRequest.current !== requestToken) return;

      if (!hasCreateSlot && page > 0 && page >= resolvedMeta.totalPages) {
        redirected = true;
        setPage(Math.max(0, resolvedMeta.totalPages - 1));
        return;
      }

      setCharacters(resolvedItems);
      setMeta(resolvedMeta);

      const nextMatrixMap: Record<number, MatrixSize> = {};
      for (const item of resolvedItems) {
        nextMatrixMap[item.characterId] = getStoredMatrixSize(item.characterId);
      }
      setMatrixSizes((prev) => ({ ...prev, ...nextMatrixMap }));
    } catch (err) {
      if (latestCharactersRequest.current === requestToken) {
        setError(formatDesignerApiError(err, "Không thể tải danh sách nhân vật của bạn."));
      }
    } finally {
      if (latestCharactersRequest.current === requestToken && !redirected) {
        setLoading(false);
      }
    }
  }, [ready, autoLoadCharacters, page, safePageSize, hasCreateSlot, query, characterTypeFilter]);

  useEffect(() => {
    void refreshCharacters();
  }, [refreshCharacters]);

  const getMatrixSize = useCallback(
    (characterId: number): MatrixSize => {
      return matrixSizes[characterId] ?? getStoredMatrixSize(characterId);
    },
    [matrixSizes],
  );

  const createCharacter = useCallback(
    async ({
      characterName,
      description,
      matrixSize,
      characterType = "STORE",
      commissionId,
    }: {
      characterName: string;
      description?: string;
      matrixSize: MatrixSize;
      characterType?: CharacterType;
      commissionId?: number;
    }): Promise<DesignerCharacterItem> => {
      const created = await createDesignerCharacter({
        characterName: characterName.trim(),
        description: description?.trim() || undefined,
        characterType,
        commissionId,
      });

      setStoredMatrixSize(created.characterId, matrixSize);
      setMatrixSizes((prev) => ({ ...prev, [created.characterId]: matrixSize }));

      const newCharacter: DesignerCharacterItem = {
        characterId: created.characterId,
        characterName: created.characterName,
        description: created.description ?? null,
        characterType: created.characterType ?? characterType,
        commissionId: created.commissionId ?? commissionId ?? null,
        totalVersions: 0,
        currentVersion: null,
        createdAt: created.createdAt ?? new Date().toISOString(),
      };

      setVersionsByCharacter((prev) => ({ ...prev, [created.characterId]: [] }));
      await refreshCharacters();
      return newCharacter;
    },
    [refreshCharacters],
  );

  const loadVersions = useCallback(
    async (characterId: number) => {
      const requestId = Symbol();
      latestVersionRequests.current.set(characterId, requestId);
      setLoadingVersions((prev) => ({ ...prev, [characterId]: true }));
      try {
        const list = await fetchCharacterVersionsCached(characterId);
        if (latestVersionRequests.current.get(characterId) === requestId) {
          setVersionsByCharacter((prev) => ({ ...prev, [characterId]: sortVersionsNewestFirst(list) }));
        }
      } catch (error) {
        if (latestVersionRequests.current.get(characterId) === requestId) throw error;
      } finally {
        if (latestVersionRequests.current.get(characterId) === requestId) {
          latestVersionRequests.current.delete(characterId);
          setLoadingVersions((prev) => ({ ...prev, [characterId]: false }));
        }
      }
    },
    [],
  );

  const deleteVersion = useCallback(
    async (characterId: number, versionId: number) => {
      await deleteCharacterVersion(characterId, versionId);
      await loadVersions(characterId);
      await refreshCharacters();
    },
    [loadVersions, refreshCharacters],
  );

  const publishVersionToStore = useCallback(
    async ({
      character,
      version,
      productName,
      description,
      tagIds,
    }: PublishToStoreInput): Promise<CreatedStoreProductResponse> => {
      if (!isStoreCharacterType(character.characterType)) {
        throw new Error("Nhân vật thuộc loại Commission không thể đăng bán lên Store.");
      }
      if (version.isListedOnStore) {
        throw new Error("Phiên bản này đã được đăng bán trên Store trước đó.");
      }

      const token = await getSessionToken();
      const safeThumb =
        version.previewGifUrl && /^https?:\/\/\S+$/i.test(version.previewGifUrl)
          ? version.previewGifUrl
          : undefined;

      const payload = {
        productName: productName.trim(),
        productType: "CHARACTER",
        basePrice: 0,
        description: description?.trim() || character.description || undefined,
        thumbnailUrl: safeThumb,
        characterVersionId: version.versionId,
        tagIds: tagIds && tagIds.length > 0 ? tagIds : undefined,
      };

      const { data: envelope } = await axios.post<{
        data: CreatedStoreProductResponse;
      }>("/api/management/designer/store/drafts", payload, {
        baseURL: getApiBaseUrl(),
        withCredentials: OpenAPI.WITH_CREDENTIALS,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const created = envelope.data;
      await loadVersions(character.characterId).catch(() => {
        // The draft was saved. The details dialog will retry the history request when it opens.
      });
      await refreshCharacters();
      return created;
    },
    [loadVersions, refreshCharacters],
  );

  return (
    <DesignerCharactersContext.Provider
      value={{
        characters,
        meta,
        page,
        setPage,
        query,
        setQuery,
        characterTypeFilter,
        setCharacterTypeFilter,
        loading,
        error,
        versionsByCharacter,
        loadingVersions,
        matrixSizes,
        refreshCharacters,
        createCharacter,
        loadVersions,
        deleteVersion,
        getMatrixSize,
        publishVersionToStore,
      }}
    >
      {children}
    </DesignerCharactersContext.Provider>
  );
}

export function useDesignerCharacters(): DesignerCharactersContextValue {
  const ctx = useContext(DesignerCharactersContext);
  if (!ctx) {
    throw new Error("useDesignerCharacters must be used within DesignerCharactersProvider");
  }
  return ctx;
}
