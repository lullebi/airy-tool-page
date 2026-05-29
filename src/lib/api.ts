// Base-URL: läs från env (Vite) med prod-URL som fallback.
// Lokal dev kan sätta VITE_API_BASE=http://127.0.0.1:8000
const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ??
  "https://eurostack-api.onrender.com";

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
    // Live-API kan returnera fler nivåer än kontraktets High/Medium/Low (t.ex. "Average").
    confidence: "High" | "Medium" | "Low" | "Average" | string | null;
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

export interface AlternativesMap {
  kategori?: string;
  non_eu: string[];
  eu_alternatives: string[];
}

// Centraliserad fetch-wrapper med timeout + retry. Tål Render gratis-tier kall-start
// (servern somnar och kan ta 30–60 s att vakna på första anropet).
async function apiFetch(
  path: string,
  init?: RequestInit,
  opts?: { retries?: number; timeoutMs?: number },
): Promise<Response> {
  const retries = opts?.retries ?? 2;
  const timeoutMs = opts?.timeoutMs ?? 45_000;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const r = await fetch(`${API_BASE}${path}`, { ...init, signal: controller.signal });
      clearTimeout(timer);
      // Servern svarade (även 4xx/5xx) — låt asJson hantera felshapen.
      return r;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      // Nätverksfel/timeout (typiskt kall-start) → backoff och försök igen.
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
      }
    }
  }
  throw lastErr instanceof Error
    ? new Error(`Kunde inte nå servern (${path}): ${lastErr.message}`)
    : new Error(`Kunde inte nå servern (${path})`);
}

async function asJson<T>(r: Response): Promise<T> {
  if (!r.ok) {
    // Kontraktet: fel har shapen { "detail": "..." }.
    let detail: string | undefined;
    try {
      const body = await r.json();
      if (body && typeof body.detail === "string") detail = body.detail;
    } catch {
      // Ignorera — body var inte JSON.
    }
    throw new Error(detail ?? `${r.status} ${r.statusText} on ${r.url}`);
  }
  return (await r.json()) as T;
}

// Tyst warm-up-ping för att väcka Render-instansen innan användaren behöver datan.
export async function warmUp(): Promise<void> {
  try {
    await apiFetch("/health", undefined, { retries: 1, timeoutMs: 60_000 });
  } catch {
    // Tyst — det här är bara en uppvärmning.
  }
}

export async function fetchVendors(): Promise<ApiVendorListItem[]> {
  const r = await apiFetch("/vendors");
  return (await asJson<{ vendors: ApiVendorListItem[] }>(r)).vendors;
}

export async function fetchVendor(id: string): Promise<ApiVendorDetail> {
  return asJson<ApiVendorDetail>(await apiFetch(`/vendors/${encodeURIComponent(id)}`));
}

export async function fetchAlternatives(kategori: string): Promise<AlternativesMap> {
  return asJson<AlternativesMap>(await apiFetch(`/alternatives/${encodeURIComponent(kategori)}`));
}

// GET /alternatives (utan slug) — hela kategorimappningen.
export async function fetchAllAlternatives(): Promise<Record<string, AlternativesMap>> {
  return asJson<Record<string, AlternativesMap>>(await apiFetch("/alternatives"));
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
  }>(await apiFetch("/meta"));
}

export async function rescore(
  vendorIds: string[],
  weights: ScoreWeights,
): Promise<RescoredVendor[]> {
  const r = await apiFetch("/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vendor_ids: vendorIds, weights }),
  });
  return (await asJson<{ vendors: RescoredVendor[] }>(r)).vendors;
}

/* =========================================================================
   SCORE BREAKDOWN — "Så räknades poängen fram"
   Backend förväntas leverera per-kategori-poäng, dynamisk vikt och en
   dynamisk förklaring av varför kategorin fått just den vikten utifrån
   klientens prioriteringar. Inga texter hårdkodas i frontend.
   ========================================================================= */

export interface ScoreBreakdownCategory {
  key: string;
  label: string;
  score: number; // 0..100
  weight: number; // 0..1 (procent = weight * 100)
  explanation: string; // dynamisk förklaring från backend
}

export interface ScoreBreakdownResponse {
  categories: ScoreBreakdownCategory[];
  total: number; // 0..SCORE_CAP
}

// Kontext som backend använder för att generera dynamiska vikter/förklaringar.
export interface ScoreBreakdownContext {
  priorities: string[];
  sector: string;
  eu_data_weight: number | null;
  readiness: string;
}

export async function fetchScoreBreakdown(payload: {
  vendor_ids: string[];
  weights: ScoreWeights;
  context: ScoreBreakdownContext;
}): Promise<ScoreBreakdownResponse> {
  const r = await apiFetch("/score/breakdown", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return asJson<ScoreBreakdownResponse>(r);
}
