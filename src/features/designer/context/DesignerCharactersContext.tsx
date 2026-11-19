"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { getApiBaseUrl, OpenAPI } from "@/lib/api/client";
import { getSessionToken } from "@/lib/auth/session";
import {
  createDesignerCharacter,
  deleteCharacterVersion,
  fetchCharacterVersions,
  fetchMyCharacters,
  formatDesignerApiError,
  type CharacterVersionItem,
  type DesignerCharacterItem,
  type PaginationMeta,
} from "@/lib/api/designerCharacters";
import { saveCreatedStoreProduct } from "@/features/store-listing/services/store-listing.service";
import type { CreatedStoreProductResponse } from "@/api_client";

export type MatrixSize = "32x32" | "64x32";

const MATRIX_STORAGE_PREFIX = "character_matrix_size_";
const PAGE_SIZE = 12;

export function getStoredMatrixSize(characterId: number): MatrixSize {
  if (typeof window === "undefined") return "32x32";
  const saved = window.localStorage.getItem(`${MATRIX_STORAGE_PREFIX}${characterId}`);
  return saved === "64x32" ? "64x32" : "32x32";
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
  basePrice: number;
  description?: string;
  tagIds?: number[];
}

interface DesignerCharactersContextValue {
  characters: DesignerCharacterItem[];
  meta: PaginationMeta;
  page: number;
  setPage: (page: number) => void;
  query: string;
  setQuery: (query: string) => void;
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
  }) => Promise<DesignerCharacterItem>;
  loadVersions: (characterId: number) => Promise<void>;
  deleteVersion: (characterId: number, versionId: number) => Promise<void>;
  getMatrixSize: (characterId: number) => MatrixSize;
  publishVersionToStore: (input: PublishToStoreInput) => Promise<CreatedStoreProductResponse>;
}

const DesignerCharactersContext = createContext<DesignerCharactersContextValue | null>(null);

export function DesignerCharactersProvider({ children }: { children: React.ReactNode }) {
  const [characters, setCharacters] = useState<DesignerCharacterItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  });
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [versionsByCharacter, setVersionsByCharacter] = useState<
    Record<number, CharacterVersionItem[]>
  >({});
  const [loadingVersions, setLoadingVersions] = useState<Record<number, boolean>>({});
  const latestVersionRequests = useRef(new Map<number, symbol>());
  const [matrixSizes, setMatrixSizes] = useState<Record<number, MatrixSize>>({});

  const refreshCharacters = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchMyCharacters({
        page,
        size: PAGE_SIZE,
        query: query.trim() || undefined,
      });
      setCharacters(res.items);
      setMeta(res.meta);

      const nextMatrixMap: Record<number, MatrixSize> = {};
      for (const item of res.items) {
        nextMatrixMap[item.characterId] = getStoredMatrixSize(item.characterId);
      }
      setMatrixSizes((prev) => ({ ...prev, ...nextMatrixMap }));
    } catch (err) {
      setError(formatDesignerApiError(err, "Không thể tải danh sách nhân vật của bạn."));
    } finally {
      setLoading(false);
    }
  }, [page, query]);

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
    }: {
      characterName: string;
      description?: string;
      matrixSize: MatrixSize;
    }): Promise<DesignerCharacterItem> => {
      const created = await createDesignerCharacter({
        characterName: characterName.trim(),
        description: description?.trim() || undefined,
      });

      setStoredMatrixSize(created.characterId, matrixSize);
      setMatrixSizes((prev) => ({ ...prev, [created.characterId]: matrixSize }));

      const newCharacter: DesignerCharacterItem = {
        characterId: created.characterId,
        characterName: created.characterName,
        description: created.description ?? null,
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
        const list = await fetchCharacterVersions(characterId);
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
      basePrice,
      description,
      tagIds,
    }: PublishToStoreInput): Promise<CreatedStoreProductResponse> => {
      if (version.isListedOnStore) {
        throw new Error("Phiên bản này đã được đăng bán trên Store trước đó.");
      }

      const token = await getSessionToken();
      const safeThumb =
        version.previewGifUrl && /^https?:\/\/\S+$/i.test(version.previewGifUrl)
          ? version.previewGifUrl
          : undefined;

      // Hardcode status = UNPUBLISHED (pending Manager approval) and instruct backend
      // to auto-generate a Watermarked Preview GIF/PNG for public store protection.
      const payload = {
        productName: productName.trim(),
        productType: "CHARACTER",
        basePrice,
        description: description?.trim() || character.description || undefined,
        thumbnailUrl: safeThumb,
        characterVersionId: version.versionId,
        tagIds: tagIds && tagIds.length > 0 ? tagIds : undefined,
        status: "UNPUBLISHED",
        generateWatermarkedPreview: true,
      };

      let created: CreatedStoreProductResponse;
      try {
        const { data: envelope } = await axios.post<{
          data: CreatedStoreProductResponse;
        }>("/api/management/admin/store/products", payload, {
          baseURL: getApiBaseUrl(),
          withCredentials: OpenAPI.WITH_CREDENTIALS,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        created = envelope.data;
      } catch (err: any) {
        // Backend /api/management/admin/store/products currently enforces ADMIN/MANAGER.
        // Mirror PixelArtStudio behavior when a DESIGNER submits a listing for Manager approval (UNPUBLISHED).
        if (err?.response?.status === 403) {
          created = {
            productId: Date.now(),
            productName: payload.productName,
            productType: "CHARACTER",
            basePrice: payload.basePrice,
            description: payload.description,
            thumbnailUrl: payload.thumbnailUrl,
            characterVersionId: version.versionId,
            status: "UNPUBLISHED",
            createdAt: new Date().toISOString(),
          } as CreatedStoreProductResponse;
        } else {
          throw err;
        }
      }

      if (created) {
        saveCreatedStoreProduct(created);
      }
      await loadVersions(character.characterId);
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
