"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ENTITLEMENTS_CHANGED_EVENT,
  entitlementService,
} from "@/features/character/services/entitlement.service";
import type { UserEntitlement } from "@/features/character/types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ORDERS_CHANGED_EVENT } from "@/features/order/services/order.service";
import {
  fetchActiveCustomerSubscription,
  fetchCustomerGallery,
  formatOwnedCharactersError,
  type CustomerActiveSubscription,
  type CustomerGalleryItem,
} from "@/lib/api/customerCharacters";

interface GalleryContextValue {
  ownedCharacters: CustomerGalleryItem[];
  activeSubscription: CustomerActiveSubscription | null;
  entitlements: UserEntitlement[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const GalleryContext = createContext<GalleryContextValue | null>(null);

export function GalleryProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [ownedCharacters, setOwnedCharacters] = useState<
    CustomerGalleryItem[]
  >([]);
  const [activeSubscription, setActiveSubscription] =
    useState<CustomerActiveSubscription | null>(null);
  const [entitlements, setEntitlements] = useState<UserEntitlement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refresh = useCallback(() => {
    const requestId = ++requestIdRef.current;
    if (isAuthLoading) return;

    const currentUser = user;
    const localEntitlements = currentUser
      ? entitlementService.listByUser(currentUser.userId)
      : [];

    if (!isAuthenticated || !currentUser || currentUser.role !== "CUSTOMER") {
      setOwnedCharacters([]);
      setActiveSubscription(null);
      setEntitlements(localEntitlements);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    Promise.all([
      fetchCustomerGallery(),
      fetchActiveCustomerSubscription().catch(() => null),
    ])
      .then(([items, subscription]) => {
        if (requestIdRef.current !== requestId) return;
        setOwnedCharacters(items);
        setActiveSubscription(subscription);

        // An accepted image is not a CharacterVersion and cannot grant LED/store access.
        const apiEntitlements: UserEntitlement[] = items.filter((item) => item.characterId !== null).map((item) => ({
          entitlementId: `OWNED-${item.orderId}-${item.characterId}`,
          userId: currentUser.userId,
          characterId: String(item.characterId),
          sourceType: "ORDER",
          sourceReferenceId: String(item.orderId),
          grantedAt: item.purchasedAt,
        }));

        const seen = new Set(
          apiEntitlements.map(
            (entry) => `${entry.sourceReferenceId}:${entry.characterId}`,
          ),
        );
        const mergedEntitlements = [
          ...apiEntitlements,
          ...localEntitlements.filter(
            (entry) =>
              !seen.has(`${entry.sourceReferenceId}:${entry.characterId}`),
          ),
        ];
        setEntitlements(mergedEntitlements);
      })
      .catch((err) => {
        if (requestIdRef.current !== requestId) return;
        setOwnedCharacters([]);
        setActiveSubscription(null);
        setEntitlements(localEntitlements);
        setError(formatOwnedCharactersError(err));
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
        }
      });
  }, [isAuthLoading, isAuthenticated, user]);

  useEffect(() => {
    refresh();
    window.addEventListener(ENTITLEMENTS_CHANGED_EVENT, refresh);
    window.addEventListener(ORDERS_CHANGED_EVENT, refresh);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      ++requestIdRef.current;
      window.removeEventListener(ENTITLEMENTS_CHANGED_EVENT, refresh);
      window.removeEventListener(ORDERS_CHANGED_EVENT, refresh);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refresh]);

  return (
    <GalleryContext.Provider
      value={{
        ownedCharacters,
        activeSubscription,
        entitlements,
        isLoading,
        error,
        refresh,
      }}
    >
      {children}
    </GalleryContext.Provider>
  );
}

export function useGallery() {
  const context = useContext(GalleryContext);
  if (!context) {
    throw new Error("useGallery must be used inside <GalleryProvider>");
  }
  return context;
}
