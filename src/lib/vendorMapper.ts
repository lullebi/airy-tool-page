import type { ApiVendorListItem } from "./api";

export interface VendorLike {
  id: string;
  name: string;
  type?: string;
  apiCategory?: string;
  country?: string;
  mustKeep?: boolean;
  apiId?: string;
  // Sovereignty fields propagated from GET /vendors list-view.
  // hq_in_eu is the canonical "European" signal across the app.
  hq_in_eu?: boolean;
  storage_in_eu?: boolean;
  cloud_act_exposure?: boolean;
}

export function apiToVendorLike(v: ApiVendorListItem): VendorLike {
  return {
    id: v.id,
    apiId: v.id,
    name: v.name,
    type: v.category ?? undefined,
    apiCategory: v.category ?? undefined,
    country: undefined,
    mustKeep: false,
    hq_in_eu: v.hq_in_eu,
    storage_in_eu: v.storage_in_eu,
    cloud_act_exposure: v.cloud_act_exposure,
  };
}

export const isEuropean = (v: { hq_in_eu?: boolean }) => v.hq_in_eu === true;
