"use client";

/**
 * Sổ địa chỉ của khách qua TanStack Query. Trước đây là Provider ở root layout nên MỌI trang (kể cả cửa hàng,
 * chat…) đều gọi /api/users/me/addresses; giờ chỉ tải khi một trang thật sự dùng `useAddresses()`
 * (checkout, hồ sơ) và dùng chung cache giữa các trang đó.
 */

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Address, AddressFormData } from "@/features/address/types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/api/auth";
import {
  apiAddAddress,
  apiDeleteAddress,
  apiListAddresses,
  apiSetDefaultAddress,
} from "@/lib/api/addresses";

const EMPTY: Address[] = [];
const ADDRESSES_STALE_MS = 5 * 60_000;

export function useAddresses() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const isCustomer = isAuthenticated && user?.role === "CUSTOMER";
  const queryKey = ["addresses", user?.userId ?? ""] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => apiListAddresses().catch(() => EMPTY),
    enabled: !authLoading && isCustomer,
    staleTime: ADDRESSES_STALE_MS,
  });

  const refreshAddresses = useCallback(async () => {
    if (!isCustomer) return;
    await queryClient.invalidateQueries({ queryKey: ["addresses"] });
  }, [isCustomer, queryClient]);

  const mutate = useCallback(
    async (action: () => Promise<unknown>, fallback: string) => {
      try {
        await action();
        await refreshAddresses();
      } catch (err) {
        // Surface the failure so callers can keep the form open and show the reason.
        throw new Error(getApiErrorMessage(err, fallback));
      }
    },
    [refreshAddresses],
  );

  const addAddress = useCallback(
    async (form: AddressFormData) => {
      if (!isCustomer) throw new Error("Vui lòng đăng nhập bằng tài khoản khách hàng để lưu địa chỉ.");
      await mutate(() => apiAddAddress(form), "Không thể lưu địa chỉ. Vui lòng thử lại.");
    },
    [isCustomer, mutate],
  );

  const removeAddress = useCallback(
    async (id: string) => {
      if (!isCustomer) return;
      await mutate(() => apiDeleteAddress(id), "Không thể xóa địa chỉ. Vui lòng thử lại.");
    },
    [isCustomer, mutate],
  );

  const setDefaultAddress = useCallback(
    async (id: string) => {
      if (!isCustomer) return;
      await mutate(() => apiSetDefaultAddress(id), "Không thể đặt địa chỉ mặc định. Vui lòng thử lại.");
    },
    [isCustomer, mutate],
  );

  return {
    addresses: isCustomer ? query.data ?? EMPTY : EMPTY,
    isLoading: authLoading || (isCustomer && query.isPending),
    /** Rejects with a user-facing message when the backend refuses the address. */
    addAddress,
    removeAddress,
    setDefaultAddress,
    refreshAddresses,
  };
}
