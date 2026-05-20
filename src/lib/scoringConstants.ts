import type { ScoreWeights, VendorClass } from "./api";

export const CLASS_TAILWIND: Record<
  VendorClass,
  { text: string; bg: string; dot: string; ring: string }
> = {
  låg: { text: "text-emerald-700", bg: "bg-emerald-100", dot: "bg-emerald-500", ring: "ring-emerald-200" },
  medel: { text: "text-amber-700", bg: "bg-amber-100", dot: "bg-amber-500", ring: "ring-amber-200" },
  hög: { text: "text-rose-700", bg: "bg-rose-100", dot: "bg-rose-500", ring: "ring-rose-200" },
};

export const CLASS_LABELS: Record<VendorClass, string> = {
  låg: "Låg kontrollrisk",
  medel: "Medel kontrollrisk",
  hög: "Hög kontrollrisk",
};

export const SCORE_CAP = 85;
export const SCORE_TOOLTIP =
  "Max är medvetet 85 — ingen leverantör är 100 % suverän. Se 'Om modellen'.";

export const RISK_DRIVER_SV: Record<string, string> = {
  cloud_act_exposure: "US CLOUD Act-exponering",
  hq_in_eu: "HQ ej i EU",
  storage_in_eu: "Lagring ej i EU",
  has_cispe_cert: "Saknar CISPE-cert",
  cert_score: "Låg cert-score (ISO/SOC/C5/GDPR)",
  eu_compliance_score: "Låg EU-compliance (DORA/NIS2)",
  gdpr_fines_count: "GDPR-böter (antal)",
  gdpr_fines_total_eur: "GDPR-böter (belopp)",
};

export function prioritiesToWeights(priorities: string[]): ScoreWeights {
  const w: ScoreWeights = { säkerhet: 0, compliance: 0, flexibilitet: 0 };
  for (const p of priorities) {
    if (p === "Säkerhet") w.säkerhet += 1;
    if (p === "Efterlevnad") w.compliance += 1;
    if (p === "Flexibilitet") w.flexibilitet += 1;
    if (p === "Skalbarhet") w.flexibilitet += 1;
    // "Kostnad" ignoreras tyst
  }
  return w;
}
