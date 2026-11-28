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
  fetchActiveCustomerSubscriptions,
  fetchCustomerGallery,
  formatOwnedCharactersError,
  type CustomerActiveSubscription,
  type CustomerGalleryItem,
} from "@/lib/api/customerCharacters";

interface GalleryContextValue {
  ownedCharacters: CustomerGalleryItem[];
  activeSubscription: CustomerActiveSubscription | null;
  activeSubscriptions: CustomerActiveSubscription[];
  hasAllAccessCharacters: boolean;
  maxCommissionRevisions: number;
  extraCommissionRevisions: number;
  maxMobileProfiles: number;
  ownedAllAccessOnlyPrice: number | null;
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
  const [activeSubscriptions, setActiveSubscriptions] =
    useState<CustomerActiveSubscription[]>([]);
  const activeSubscription = activeSubscriptions[0] ?? null;
  const hasAllAccessCharacters = activeSubscriptions.some((sub) => sub.allAccessCharacters);
  const maxCommissionRevisions = activeSubscriptions.reduce(
    (max, sub) => Math.max(max, sub.maxCommissionRevisions ?? 0),
    0,
  );
  const extraCommissionRevisions = maxCommissionRevisions;
  const maxMobileProfiles = activeSubscriptions.reduce(
    (max, sub) => Math.max(max, sub.maxMobileProfiles ?? 3),
    3,
  );
  const alreadyOwnsAllAccessUpgrade = activeSubscriptions.some(
    (sub) =>
      sub.allAccessCharacters &&
      ((sub.maxMobileProfiles ?? 3) > 3 || (sub.maxCommissionRevisions ?? 0) > 0),
  );
  const ownedAllAccessOnlyPrices = alreadyOwnsAllAccessUpgrade
    ? []
    : activeSubscriptions
        .filter(
          (sub) =>
            sub.allAccessCharacters &&
            (sub.maxMobileProfiles ?? 3) <= 3 &&
            (sub.maxCommissionRevisions ?? 0) <= 0 &&
            (sub.paidPrice ?? 0) > 0,
        )
        .map((sub) => sub.paidPrice as number);
  const ownedAllAccessOnlyPrice =
    ownedAllAccessOnlyPrices.length > 0 ? Math.max(...ownedAllAccessOnlyPrices) : null;
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
      setActiveSubscriptions([]);
      setEntitlements(localEntitlements);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    Promise.all([
      fetchCustomerGallery(),
      fetchActiveCustomerSubscriptions().catch(() => [] as CustomerActiveSubscription[]),
    ])
      .then(([items, subscriptions]) => {
        if (requestIdRef.current !== requestId) return;
        setOwnedCharacters(items);
        setActiveSubscriptions(subscriptions);

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
        setActiveSubscriptions([]);
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
        activeSubscriptions,
        hasAllAccessCharacters,
        maxCommissionRevisions,
        extraCommissionRevisions,
        maxMobileProfiles,
        ownedAllAccessOnlyPrice,
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
