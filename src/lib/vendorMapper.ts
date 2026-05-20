import type { ApiVendorListItem } from "./api";

export interface VendorLike {
  id: string;
  name: string;
  type?: string;
  country?: string;
  mustKeep?: boolean;
  apiId?: string;
}

export function apiToVendorLike(v: ApiVendorListItem): VendorLike {
  return {
    id: v.id,
    apiId: v.id,
    name: v.name,
    type: v.category ?? undefined,
    country: undefined,
    mustKeep: false,
  };
}
