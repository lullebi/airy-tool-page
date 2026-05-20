const API_BASE = "https://eurostack-api.onrender.com";

export type VendorClass = "låg" | "medel" | "hög";

export interface ApiVendorListItem {
  id: string;
  name: string;
  category: string | null;
  class: VendorClass;
  sovereignty_score: number;
  hq_in_eu: boolean;
  storage_in_eu: boolean;
  cloud_act_exposure: boolean;
  top_risk_drivers: string[];
}

export interface ApiVendorDetail
  extends Omit<ApiVendorListItem, "hq_in_eu" | "storage_in_eu" | "cloud_act_exposure"> {
  probabilities: { låg: number; medel: number; hög: number };
  features: {
    hq_country_iso2: string | null;
    hq_in_eu: boolean;
    storage_region: string | null;
    storage_in_eu: boolean;
    processing_region: string | null;
    cloud_act_exposure: boolean;
    has_cispe_cert: boolean;
    cert_score: number | null;
    eu_compliance_score: number | null;
    gdpr_fines_count: number;
    gdpr_fines_total_eur: number | null;
    certifications: Record<
      "iso27001" | "gdpr_commitments" | "dora" | "soc2" | "c5_attestation" | "nis2",
      number | null
    >;
    confidence: "High" | "Medium" | "Low" | null;
    source_url: string | null;
  };
}

export interface ScoreWeights {
  säkerhet: number;
  compliance: number;
  flexibilitet: number;
}

export interface RescoredVendor {
  id: string;
  name: string;
  class: VendorClass;
  original_score: number;
  contextual_score: number;
  components: ScoreWeights;
}

async function asJson<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} on ${r.url}`);
  return (await r.json()) as T;
}

export async function fetchVendors(): Promise<ApiVendorListItem[]> {
  const r = await fetch(`${API_BASE}/vendors`);
  return (await asJson<{ vendors: ApiVendorListItem[] }>(r)).vendors;
}

export async function fetchVendor(id: string): Promise<ApiVendorDetail> {
  return asJson<ApiVendorDetail>(await fetch(`${API_BASE}/vendors/${encodeURIComponent(id)}`));
}

export async function fetchAlternatives(kategori: string) {
  return asJson<{ kategori: string; non_eu: string[]; eu_alternatives: string[] }>(
    await fetch(`${API_BASE}/alternatives/${encodeURIComponent(kategori)}`),
  );
}

export async function fetchMeta() {
  return asJson<{
    model: string;
    n_train: number;
    n_features: number;
    features: string[];
    cv_macro_f1_mean: number;
    cv_accuracy_mean: number;
    dummy_macro_f1_mean: number;
    score_scale: { min: number; max: number; note: string };
  }>(await fetch(`${API_BASE}/meta`));
}

export async function rescore(
  vendorIds: string[],
  weights: ScoreWeights,
): Promise<RescoredVendor[]> {
  const r = await fetch(`${API_BASE}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vendor_ids: vendorIds, weights }),
  });
  return (await asJson<{ vendors: RescoredVendor[] }>(r)).vendors;
}
