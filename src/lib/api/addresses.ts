import { UserAddressesService, UserProfileService } from "@/api_client";
import type { Address, AddressFormData } from "@/features/address/types";
import "./client";

export interface BackendUserAddress {
  addressId: number;
  recipientName: string;
  recipientPhone: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function mapBackendAddress(addr: BackendUserAddress): Address {
  return {
    id: String(addr.addressId),
    fullName: addr.recipientName,
    phoneNumber: addr.recipientPhone,
    streetNumber: "",
    streetName: "",
    ward: "",
    district: "",
    province: "",
    latitude: Number(addr.latitude),
    longitude: Number(addr.longitude),
    fullAddress: addr.fullAddress,
    isDefault: Boolean(addr.isDefault),
  };
}

export async function apiListAddresses(): Promise<Address[]> {
  const res = await UserAddressesService.listAddresses();
  const list: BackendUserAddress[] = res?.data ?? [];
  return list.map(mapBackendAddress);
}

export async function apiAddAddress(form: AddressFormData): Promise<Address> {
  const fullAddress =
    form.fullAddress?.trim() ||
    [form.streetNumber, form.streetName, form.ward, form.district, form.province]
      .filter(Boolean)
      .join(", ");
  const normalizedPhone = form.phoneNumber.replace(/\s+/g, "");
  const res = await UserAddressesService.addAddress({
    recipientName: form.fullName.trim(),
    recipientPhone: normalizedPhone,
    fullAddress,
    latitude: form.latitude ?? 10.7769,
    longitude: form.longitude ?? 106.7009,
    isDefault: false,
  });
  return mapBackendAddress(res.data as BackendUserAddress);
}

export async function apiDeleteAddress(addressId: string | number): Promise<void> {
  await UserAddressesService.deleteAddress(Number(addressId));
}

export async function apiSetDefaultAddress(addressId: string | number): Promise<Address> {
  const res = await UserAddressesService.setDefaultAddress(Number(addressId));
  return mapBackendAddress(res.data as BackendUserAddress);
}

export async function apiGetMyProfile() {
  const res = await UserProfileService.me();
  return res.data;
}

export async function apiUpdateMyProfile(input: { name: string; phone?: string | null; avatarUrl?: string | null }) {
  const res = await UserProfileService.update({
    name: input.name,
    phone: input.phone ?? undefined,
    avatar: input.avatarUrl ?? undefined,
  });
  return res.data;
}
