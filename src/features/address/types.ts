export interface Address {
  id: string;
  fullName: string;
  phoneNumber: string;
  streetNumber?: string;
  streetName?: string;
  ward?: string;
  district?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  fullAddress: string;
  isDefault?: boolean;
}

export type AddressFormData = Partial<Omit<Address, "id" | "isDefault">> & {
  fullName: string;
  phoneNumber: string;
  fullAddress?: string;
  latitude?: number;
  longitude?: number;
};
