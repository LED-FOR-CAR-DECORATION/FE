export interface Address {
  id: string;
  fullName: string;
  phoneNumber: string;
  streetNumber: string;
  streetName: string;
  ward: string;
  district: string;
  province: string;
  latitude?: number;
  longitude?: number;
  fullAddress: string;
  isDefault?: boolean;
}

export type AddressFormData = Omit<Address, "id" | "isDefault" | "fullAddress"> & {
  fullAddress?: string;
};
