"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCustomerCommission } from "@/features/commission/services/customer-commission.api";
import { queryKeys } from "@/lib/query/keys";
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

const EMPTY_OWNED: CustomerGalleryItem[] = [];
const EMPTY_SUBSCRIPTIONS: CustomerActiveSubscription[] = [];
/** Gallery/gói hội viên ít khi đổi ngoài các sự kiện ORDERS/ENTITLEMENTS (đã invalidate thẳng) → giữ 60s. */
const GALLERY_STALE_MS = 60_000;

/**
 * Dữ liệu sở hữu của khách qua TanStack Query.
 * Trước đây tải lại mỗi lần focus cửa sổ VÀ mỗi lần đổi visibility (2 lần/lần quay lại), mỗi lần gọi chi tiết từng
 * commission đã hoàn thành. Giờ: chỉ refetch khi dữ liệu cũ hơn GALLERY_STALE_MS, chi tiết commission COMPLETED cache cả phiên.
 */
export function GalleryProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const isCustomer = !isAuthLoading && isAuthenticated && user?.role === "CUSTOMER";
  const userId = user?.userId ?? "";

  const ownedQuery = useQuery({
    queryKey: queryKeys.gallery.owned(userId),
    queryFn: () =>
      fetchCustomerGallery({
        loadCommissionDetail: (commissionId) =>
          queryClient.fetchQuery({
            queryKey: queryKeys.commissions.customerDetail(commissionId),
            queryFn: () => getCustomerCommission(commissionId),
            // Chỉ gọi cho commission COMPLETED: ảnh đã duyệt không đổi nữa.
            staleTime: Infinity,
          }),
      }),
    enabled: isCustomer,
    staleTime: GALLERY_STALE_MS,
  });
  const subscriptionsQuery = useQuery({
    queryKey: queryKeys.gallery.subscriptions(userId),
    queryFn: () => fetchActiveCustomerSubscriptions().catch(() => EMPTY_SUBSCRIPTIONS),
    enabled: isCustomer,
    staleTime: GALLERY_STALE_MS,
  });

  // Mua hàng / thanh toán / commission được duyệt → làm mới ngay (bỏ qua staleTime).
  useEffect(() => {
    const invalidate = () => void queryClient.invalidateQueries({ queryKey: queryKeys.gallery.all });
    window.addEventListener(ENTITLEMENTS_CHANGED_EVENT, invalidate);
    window.addEventListener(ORDERS_CHANGED_EVENT, invalidate);
    return () => {
      window.removeEventListener(ENTITLEMENTS_CHANGED_EVENT, invalidate);
      window.removeEventListener(ORDERS_CHANGED_EVENT, invalidate);
    };
  }, [queryClient]);

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.gallery.all });
  }, [queryClient]);

  const ownedCharacters = isCustomer && !ownedQuery.error ? ownedQuery.data ?? EMPTY_OWNED : EMPTY_OWNED;
  const activeSubscriptions = isCustomer && !ownedQuery.error ? subscriptionsQuery.data ?? EMPTY_SUBSCRIPTIONS : EMPTY_SUBSCRIPTIONS;
  const isLoading = isCustomer && (ownedQuery.isPending || subscriptionsQuery.isPending);
  const error = isCustomer && ownedQuery.error ? formatOwnedCharactersError(ownedQuery.error) : null;

  const entitlements = useMemo<UserEntitlement[]>(() => {
    if (!user) return [];
    const localEntitlements = entitlementService.listByUser(user.userId);
    if (!isCustomer) return localEntitlements;
    // An accepted image is not a CharacterVersion and cannot grant LED/store access.
    const apiEntitlements: UserEntitlement[] = ownedCharacters.filter((item) => item.characterId !== null).map((item) => ({
      entitlementId: `OWNED-${item.orderId}-${item.characterId}`,
      userId: user.userId,
      characterId: String(item.characterId),
      sourceType: "ORDER",
      sourceReferenceId: String(item.orderId),
      grantedAt: item.purchasedAt,
    }));
    const seen = new Set(apiEntitlements.map((entry) => `${entry.sourceReferenceId}:${entry.characterId}`));
    return [
      ...apiEntitlements,
      ...localEntitlements.filter((entry) => !seen.has(`${entry.sourceReferenceId}:${entry.characterId}`)),
    ];
  }, [user, isCustomer, ownedCharacters]);

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
