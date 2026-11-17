"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Address, AddressFormData } from "@/features/address/types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  apiAddAddress,
  apiDeleteAddress,
  apiListAddresses,
  apiSetDefaultAddress,
} from "@/lib/api/addresses";

interface AddressContextValue {
  addresses: Address[];
  isLoading: boolean;
  addAddress: (address: AddressFormData) => Promise<void> | void;
  removeAddress: (id: string) => Promise<void> | void;
  setDefaultAddress: (id: string) => Promise<void> | void;
  refreshAddresses: () => Promise<void>;
}

const AddressContext = createContext<AddressContextValue | null>(null);

export function AddressProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isCustomer = isAuthenticated && user?.role === "CUSTOMER";

  const refreshAddresses = useCallback(async () => {
    if (!isCustomer) {
      setAddresses([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const list = await apiListAddresses();
      setAddresses(list);
    } catch {
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  }, [isCustomer]);

  useEffect(() => {
    if (authLoading) return;
    void refreshAddresses();
  }, [authLoading, refreshAddresses]);

  const addAddress = useCallback(
    async (form: AddressFormData) => {
      if (!isCustomer) return;
      try {
        await apiAddAddress(form);
        await refreshAddresses();
      } catch (err) {
        console.error("Failed to add address:", err);
      }
    },
    [isCustomer, refreshAddresses],
  );

  const removeAddress = useCallback(
    async (id: string) => {
      if (!isCustomer) return;
      try {
        await apiDeleteAddress(id);
        await refreshAddresses();
      } catch (err) {
        console.error("Failed to delete address:", err);
      }
    },
    [isCustomer, refreshAddresses],
  );

  const setDefaultAddress = useCallback(
    async (id: string) => {
      if (!isCustomer) return;
      try {
        await apiSetDefaultAddress(id);
        await refreshAddresses();
      } catch (err) {
        console.error("Failed to set default address:", err);
      }
    },
    [isCustomer, refreshAddresses],
  );

  const value = useMemo(
    () => ({
      addresses,
      isLoading,
      addAddress,
      removeAddress,
      setDefaultAddress,
      refreshAddresses,
    }),
    [addresses, isLoading, addAddress, removeAddress, setDefaultAddress, refreshAddresses],
  );
  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>;
}

export function useAddresses() {
  const context = useContext(AddressContext);
  if (!context) throw new Error("useAddresses must be used inside <AddressProvider>");
  return context;
}
