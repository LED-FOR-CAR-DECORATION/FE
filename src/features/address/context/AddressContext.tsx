"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Address, AddressFormData } from "@/features/address/types";

const ADDRESS_KEY = "led_controller_mock_addresses";

const DEFAULT_ADDRESSES: Address[] = [
  {
    id: "address-home",
    fullName: "John Doe",
    phoneNumber: "(+84) 123 456 789",
    streetNumber: "Number 8",
    streetName: "Sesame Street",
    ward: "",
    district: "Q1",
    province: "TP.HCM",
    fullAddress: "Number 8, Sesame Street, Q1, TP.HCM",
    isDefault: true,
  },
  {
    id: "address-office",
    fullName: "John Doe",
    phoneNumber: "(+84) 987 654 321",
    streetNumber: "456",
    streetName: "Nguyen Hue",
    ward: "",
    district: "Q1",
    province: "TP.HCM",
    fullAddress: "456 Nguyen Hue, Q1, TP.HCM",
  },
];

interface AddressContextValue {
  addresses: Address[];
  isLoading: boolean;
  addAddress: (address: AddressFormData) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
}

const AddressContext = createContext<AddressContextValue | null>(null);

export function AddressProvider({ children }: { children: ReactNode }) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ADDRESS_KEY);
      setAddresses(saved ? JSON.parse(saved) as Address[] : DEFAULT_ADDRESSES);
    } catch {
      setAddresses(DEFAULT_ADDRESSES);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) localStorage.setItem(ADDRESS_KEY, JSON.stringify(addresses));
  }, [addresses, isLoading]);

  const addAddress = useCallback((form: AddressFormData) => {
    const fullAddress = form.fullAddress?.trim() || [form.streetNumber, form.streetName, form.ward, form.district, form.province].filter(Boolean).join(", ");
    const newAddress: Address = { ...form, id: `address-${Date.now()}`, fullAddress, isDefault: false };
    setAddresses((current) => [...current, newAddress]);
  }, []);

  const removeAddress = useCallback((id: string) => {
    setAddresses((current) => {
      const remaining = current.filter((address) => address.id !== id);
      if (remaining.length > 0 && !remaining.some((address) => address.isDefault)) {
        return remaining.map((address, index) => index === 0 ? { ...address, isDefault: true } : address);
      }
      return remaining;
    });
  }, []);

  const setDefaultAddress = useCallback((id: string) => {
    setAddresses((current) => current.map((address) => ({ ...address, isDefault: address.id === id })));
  }, []);

  const value = useMemo(() => ({ addresses, isLoading, addAddress, removeAddress, setDefaultAddress }), [addresses, isLoading, addAddress, removeAddress, setDefaultAddress]);
  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>;
}

export function useAddresses() {
  const context = useContext(AddressContext);
  if (!context) throw new Error("useAddresses must be used inside <AddressProvider>");
  return context;
}
