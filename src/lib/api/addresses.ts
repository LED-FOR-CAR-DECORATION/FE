import { UserAddressesService, UserProfileService } from "@/api_client";
import type { Address, AddressFormData } from "@/features/address/types";
import "./client";
import { normalizeVnMobile } from "@/lib/validation/contact";

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
  if (form.latitude == null || form.longitude == null) {
    throw new Error("Hãy tìm hoặc bấm chọn vị trí trên bản đồ.");
  }
  const res = await UserAddressesService.addAddress({
    recipientName: form.fullName.trim().replace(/\s+/g, " "),
    recipientPhone: normalizeVnMobile(form.phoneNumber) ?? form.phoneNumber.replace(/[\s.\-()]/g, ""),
    fullAddress,
    latitude: form.latitude,
    longitude: form.longitude,
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
