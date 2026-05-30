import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Globe,
  Cpu,
  Server,
  ShieldAlert,
  ShieldCheck,
  Gavel,
  Building2,
  BadgeCheck,
  Download,
  Loader2,
  AlertTriangle,
  Search,
  FileText,
} from "lucide-react";
import {
  fetchVendors,
  fetchVendor,
  fetchAllAlternatives,
  type ApiVendorListItem,
  type ApiVendorDetail,
  type AlternativesMap,
} from "@/lib/api";
import { SCORE_CAP } from "@/lib/scoringConstants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import jsPDF from "jspdf";

/* =========================================================================
   EuroStack — Suveränitetsanalys (single-flow B2B advisory MVP)
   Driven helt av ML-datasetet (/vendors, /vendors/{id}, /alternatives).
   Visuell hierarki speglar feature-importance: Geografi > Tekniska certifikat.
   ========================================================================= */

type Tone = "ok" | "warn" | "risk";

const TONE_STYLES: Record<Tone, { chip: string; dot: string; text: string; icon: string }> = {
  ok: { chip: "bg-emerald-100 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500", text: "text-emerald-700", icon: "bg-emerald-100 text-emerald-700" },
  warn: { chip: "bg-amber-100 text-amber-800 ring-amber-200", dot: "bg-amber-500", text: "text-amber-700", icon: "bg-amber-100 text-amber-700" },
  risk: { chip: "bg-rose-100 text-rose-700 ring-rose-200", dot: "bg-rose-500", text: "text-rose-700", icon: "bg-rose-100 text-rose-600" },
};

const TONE_DARK_TEXT: Record<Tone, string> = {
  ok: "text-emerald-300",
  warn: "text-amber-300",
  risk: "text-rose-300",
};

function prettifyId(id: string): string {
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Heuristik för var data bearbetas (API saknar processing_in_eu-flagga).
function processingInEu(region: string | null, hqInEu: boolean): boolean {
  const p = (region ?? "").toLowerCase();
  if (/globalt|global|usa|\bus\b|china|asien|asia/.test(p)) return false;
  if (/eu|europ|sverige|tyskland|frankrike|finland|multi-local|lokal/.test(p)) return true;
  return hqInEu;
}

/* ---- Section 1: geographic provenance breadcrumb badge ---- */
const REGION_STATE = {
  in: {
    wrap: "border-emerald-200/80 bg-emerald-50/60",
    icon: "bg-emerald-100 text-emerald-700",
    pill: "bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-500",
    label: "Inom EU",
  },
  out: {
    wrap: "border-amber-200/80 bg-amber-50/70",
    icon: "bg-amber-100 text-amber-700",
    pill: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
    label: "Utanför EU",
  },
};

function RegionBadge({
  icon: Icon,
  label,
  code,
  value,
  inEu,
}: {
  icon: typeof Globe;
  label: string;
  code: string;
  value: string;
  inEu: boolean;
}) {
  const s = inEu ? REGION_STATE.in : REGION_STATE.out;
  return (
    <div className={`flex-1 rounded-2xl border ${s.wrap} p-5 shadow-[var(--shadow-soft)]`}>
      <div className="flex items-center justify-between">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${s.icon}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${s.pill}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </span>
      </div>
      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/45">{label}</p>
      <p className="mt-0.5 text-xl font-bold leading-tight text-foreground">{value}</p>
      <code className="mt-1 block text-[11px] font-semibold text-foreground/40">{code}</code>
    </div>
  );
}

function FlowConnector() {
  return (
    <div className="flex shrink-0 items-center justify-center py-1 md:py-0">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 ring-1 ring-border/60">
        <ChevronRight className="h-4 w-4 rotate-90 text-foreground/40 md:rotate-0" />
      </span>
    </div>
  );
}

/* ---- Section 2: ML feature card ---- */
function FeatureCard({
  icon: Icon,
  title,
  code,
  badge,
  tone,
  children,
}: {
  icon: typeof Globe;
  title: string;
  code: string;
  badge: string;
  tone: Tone;
  children: React.ReactNode;
}) {
  const s = TONE_STYLES[tone];
  return (
    <div className="flex flex-col rounded-2xl border border-white/70 bg-white/80 p-6 shadow-[var(--shadow-soft)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-deep)]">
      <div className="flex items-center justify-between">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${s.icon}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ${s.chip}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
          {badge}
        </span>
      </div>
      <p className="mt-5 text-base font-bold leading-tight text-foreground">{title}</p>
      <code className="text-[11px] font-semibold text-foreground/40">{code}</code>
      <div className="mt-3 flex-1 text-sm leading-relaxed text-foreground/70">{children}</div>
    </div>
  );
}

const CERT_LABELS: Record<string, string> = {
  iso27001: "ISO 27001",
  soc2: "SOC 2",
  c5_attestation: "C5",
  dora: "DORA",
  nis2: "NIS2",
  gdpr_commitments: "GDPR-åtaganden",
};

const Quiz = () => {
  const [vendors, setVendors] = useState<ApiVendorListItem[]>([]);
  const [alternatives, setAlternatives] = useState<Record<string, AlternativesMap>>({});
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<ApiVendorDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Ladda hela leverantörslistan + kategorimappningen.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [vs, alts] = await Promise.all([fetchVendors(), fetchAllAlternatives()]);
        if (cancelled) return;
        vs.sort((a, b) => a.name.localeCompare(b.name, "sv"));
        setVendors(vs);
        setAlternatives(alts);
        // Förvälj en registrerad leverantör om användaren kommer från registret.
        try {
          const raw = window.localStorage.getItem("eurostack:vendors");
          if (raw) {
            const parsed = JSON.parse(raw) as Array<{ apiId?: string; id?: string }>;
            const firstId = parsed.map((v) => v.apiId ?? v.id).find((id) => id && vs.some((x) => x.id === id));
            if (firstId) setSelectedId(firstId);
          }
        } catch { /* ignore */ }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Kunde inte hämta leverantörsdata.");
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Hämta detaljerad feature-data när en leverantör väljs.
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    let cancelled = false;
    setLoadingDetail(true);
    fetchVendor(selectedId)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch((e) => { if (!cancelled) toast.error(e instanceof Error ? e.message : "Kunde inte hämta leverantörsdetaljer."); })
      .finally(() => { if (!cancelled) setLoadingDetail(false); });
    return () => { cancelled = true; };
  }, [selectedId]);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    vendors.forEach((v) => m.set(v.id, v.name));
    return m;
  }, [vendors]);

  const analysis = useMemo(() => {
    if (!detail) return null;
    const f = detail.features;
    const score = Math.round(detail.sovereignty_score);
    const isLow = score < 40;

    const originTone: Tone = f.hq_in_eu ? "ok" : "risk";
    const storageTone: Tone = f.storage_in_eu ? "ok" : "risk";
    const procEu = processingInEu(f.processing_region, f.hq_in_eu);
    const processTone: Tone = procEu ? "ok" : f.hq_in_eu ? "warn" : "risk";

    const jurisdictionTone: Tone = f.cloud_act_exposure ? "risk" : "ok";
    const ownershipTone: Tone = f.hq_in_eu ? "ok" : "warn";

    const certs = Object.entries(f.certifications).filter(([, v]) => v != null).map(([k]) => CERT_LABELS[k] ?? k);
    const techStrong = (f.cert_score ?? 0) >= 0.66 || (f.eu_compliance_score ?? 0) >= 0.66;
    const techTone: Tone = techStrong ? "ok" : "warn";

    const altMap = alternatives[detail.category ?? ""];
    const euAlts = (altMap?.eu_alternatives ?? []).filter((id) => id !== detail.id);

    return {
      score, isLow, originTone, storageTone, processTone, procEu,
      jurisdictionTone, ownershipTone, techTone, certs, euAlts,
      hqCountry: f.hq_country_iso2 ?? "okänt",
    };
  }, [detail, alternatives]);

  const handleExport = () => {
    if (!detail || !analysis) return;
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const M = 48;
      const W = doc.internal.pageSize.getWidth();
      let y = M;
      const line = (txt: string, size = 11, bold = false, gap = 16) => {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(size);
        const wrapped = doc.splitTextToSize(txt, W - M * 2);
        doc.text(wrapped, M, y);
        y += wrapped.length * (size * 1.25) + (gap - 16);
      };
      line("Suveränitetsanalys", 20, true, 26);
      line(`${detail.name} · ${detail.category ?? "Okänd kategori"}`, 12, true, 22);

      line("Teknisk proveniens", 14, true, 18);
      line(`Ursprung (origin_region): ${analysis.hqCountry}${detail.features.hq_in_eu ? " — inom EU" : " — utanför EU"}`);
      line(`Bearbetning (process_region): ${detail.features.processing_region ?? "okänt"}${analysis.procEu ? " — inom EU" : " — utanför EU"}`);
      line(`Lagring (storage_region): ${detail.features.storage_region ?? "okänt"}${detail.features.storage_in_eu ? " — inom EU" : " — utanför EU"}`, 11, false, 22);

      line("ML-sårbarhetsprofil", 14, true, 18);
      line(`Jurisdiktionell exponering: ${detail.features.cloud_act_exposure ? "Hög risk — US CLOUD Act-exponerad" : "Ingen känd exponering"}`);
      line(`Äganderättslig suveränitet: ${detail.features.hq_in_eu ? "EU-ägd" : `Utländskt ägande (${analysis.hqCountry})`}`);
      line(`Teknisk resiliens: ${analysis.certs.length ? analysis.certs.join(", ") : "Inga verifierade certifikat"}`, 11, false, 22);

      line(`Sovereignty Score: ${analysis.score}/${SCORE_CAP}`, 14, true, 18);
      if (analysis.isLow) {
        line(
          `Sårbarhetsprofil för ledningsgrupp: ${detail.name} kan ha god teknisk säkerhet, men kritisk kontrollrisk. Data lämnar EU:s jurisdiktion och omfattas av utländsk lagstiftning. Om den geopolitiska kranen stängs av förlorar verksamheten omedelbart rådigheten över sin egen data.`,
          11, false, 22,
        );
      }
      if (analysis.euAlts.length) {
        line("Rekommenderade EU-alternativ", 14, true, 18);
        line(analysis.euAlts.map((id) => nameById.get(id) ?? prettifyId(id)).join(", "));
      }
      doc.save(`suveranitetsanalys-${detail.id}.pdf`);
      toast.success("Rapport exporterad.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte skapa rapport.");
    }
  };

  const scoreTone: Tone = analysis ? (analysis.isLow ? "risk" : analysis.score < 60 ? "warn" : "ok") : "ok";
  const primaryAlt = analysis?.euAlts[0];
  const otherAlts = analysis?.euAlts.slice(1) ?? [];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full bg-blue-300/30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/4 -right-40 h-[640px] w-[640px] rounded-full bg-blue-900/20 blur-3xl" />

      {/* NAV */}
      <header className="relative z-20 px-4 pt-4 md:px-8 md:pt-6">
        <nav className="glass-nav mx-auto flex max-w-5xl items-center justify-between rounded-2xl px-5 py-3 md:px-7 md:py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-foreground/70 transition hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Hem
          </Link>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/55">Suveränitetsanalys</span>
          <Button
            onClick={handleExport}
            disabled={!detail}
            variant="ghost"
            className="rounded-xl border border-white/40 bg-white/30 text-sm font-semibold backdrop-blur-md hover:bg-white/50"
          >
            <Download className="h-4 w-4" /> Exportera
          </Button>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-10 md:px-8 md:pt-14">
        {/* ===== SECTION 1: TEKNISK PROVENIENS ===== */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">01 · Teknisk proveniens</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">Geografisk dataspårning</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/65">
            Välj en leverantör för att spåra var data uppstår, bearbetas och lagras. Geografisk rådighet väger tyngst i modellen.
          </p>

          <div className="mt-6 rounded-2xl border border-white/70 bg-white/80 p-5 shadow-[var(--shadow-soft)] backdrop-blur-sm">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/55">Leverantör</label>
            <Select value={selectedId} onValueChange={setSelectedId} disabled={loadingList}>
              <SelectTrigger className="h-12 rounded-xl border-border/60 bg-white text-base font-semibold">
                <span className="flex items-center gap-2 truncate">
                  <Search className="h-4 w-4 shrink-0 text-foreground/50" />
                  <SelectValue placeholder={loadingList ? "Laddar leverantörer…" : "Sök och välj leverantör…"} />
                </span>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name} <span className="text-foreground/45">· {v.category ?? "—"}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingDetail && (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl py-12 text-sm font-medium text-foreground/60">
              <Loader2 className="h-4 w-4 animate-spin" /> Hämtar feature-data…
            </div>
          )}

          {detail && analysis && !loadingDetail && (
            <div className="mt-6 flex flex-col items-stretch gap-3 md:flex-row md:items-center">
              <RegionBadge
                icon={Globe}
                label="Ursprung"
                code="origin_region"
                value={analysis.hqCountry}
                inEu={detail.features.hq_in_eu}
              />
              <FlowConnector />
              <RegionBadge
                icon={Cpu}
                label="Bearbetning"
                code="process_region"
                value={detail.features.processing_region ?? "Okänt"}
                inEu={analysis.procEu}
              />
              <FlowConnector />
              <RegionBadge
                icon={Server}
                label="Lagring"
                code="storage_region"
                value={detail.features.storage_region ?? "Okänt"}
                inEu={detail.features.storage_in_eu}
              />
            </div>
          )}
        </section>

        {/* ===== SECTION 2: ML SÅRBARHETSPROFIL ===== */}
        {detail && analysis && !loadingDetail && (
          <section className="mt-20">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">02 · ML-sårbarhetsprofil</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Feature-driven riskbedömning</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/65">
              Random Forest-modellen väger råa features. Geografisk åtkomstrisk dominerar — tekniska certifikat är stödjande bevis, inte motvikt.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
              <FeatureCard
                icon={Gavel}
                title="Jurisdiktionell exponering"
                code="cloud_act_exposure"
                badge={detail.features.cloud_act_exposure ? "Hög risk" : "Ingen risk"}
                tone={analysis.jurisdictionTone}
              >
                {detail.features.cloud_act_exposure
                  ? `${detail.name} omfattas av utländsk övervakningslagstiftning genom US CLOUD Act. Amerikanska myndigheter kan begära ut data oavsett var den fysiskt lagras, vilket innebär en kontrollrisk som tekniska skydd inte kan upphäva.`
                  : `${detail.name} omfattas inte av US CLOUD Act eller motsvarande tredjelandslagar. Data skyddas av EU:s jurisdiktion och kan inte begäras ut av utländska myndigheter.`}
              </FeatureCard>

              <FeatureCard
                icon={Building2}
                title="Äganderättslig suveränitet"
                code="hq_in_eu"
                badge={detail.features.hq_in_eu ? "EU-ägd" : "Utländskt ägande"}
                tone={analysis.ownershipTone}
              >
                {detail.features.hq_in_eu
                  ? `Huvudkontoret ligger inom EU (${analysis.hqCountry}). Bolaget lyder primärt under europeisk lagstiftning, vilket ger förutsägbar rådighet över data och avtal.`
                  : `Huvudkontoret ligger utanför EU (${analysis.hqCountry}). Moderbolaget lyder under utländsk lagstiftning, något som geografisk datalagring inom EU inte upphäver.`}
              </FeatureCard>

              <FeatureCard
                icon={analysis.techTone === "ok" ? ShieldCheck : ShieldAlert}
                title="Teknisk resiliens"
                code="cert_score"
                badge={analysis.techTone === "ok" ? "Verifierad" : "Svag"}
                tone={analysis.techTone}
              >
                {analysis.techTone === "ok"
                  ? `Leverantören uppvisar robust teknisk säkerhet och driftberedskap. Dessa kontroller styrker driften men neutraliserar inte den geografiska åtkomstrisken.`
                  : `Leverantören saknar tillräckliga verifierade säkerhetsattribut för att styrka teknisk resiliens.`}
                {analysis.certs.length > 0 && (
                  <span className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-foreground/45">
                    {analysis.certs.join(" · ")}
                  </span>
                )}
              </FeatureCard>
            </div>
          </section>
        )}

        {/* ===== SECTION 3: SOVEREIGNTY SCORE & ALTERNATIVES ===== */}
        {detail && analysis && !loadingDetail && (
          <section className="mt-20">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">03 · Sovereignty Score</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Resultat & handlingsbara alternativ</h2>

            {/* Dark hero score card */}
            <div
              className="mt-6 overflow-hidden rounded-3xl p-7 text-white md:p-10"
              style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-deep)" }}
            >
              <div className="grid gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-center">
                {/* Score */}
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">Suveränitetspoäng</p>
                    <span className={`inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold ${TONE_DARK_TEXT[scoreTone]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${TONE_STYLES[scoreTone].dot}`} />
                      {analysis.isLow ? "Kritisk kontrollrisk" : analysis.score < 60 ? "Medel kontrollrisk" : "Låg kontrollrisk"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className={`text-7xl font-bold leading-none tracking-tight md:text-8xl ${TONE_DARK_TEXT[scoreTone]}`}>
                      {analysis.score}
                    </span>
                    <span className="text-3xl font-bold text-white/40">/ {SCORE_CAP}</span>
                  </div>
                  <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-white/15">
                    <div
                      className={`h-full rounded-full transition-all ${analysis.isLow ? "bg-rose-400" : analysis.score < 60 ? "bg-amber-400" : "bg-emerald-400"}`}
                      style={{ width: `${Math.max(2, (analysis.score / SCORE_CAP) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2.5 text-xs font-medium text-white/45">
                    Skalan är medvetet kapad vid {SCORE_CAP} — ingen leverantör är 100 % suverän.
                  </p>
                </div>

                {/* Executive summary */}
                <div className="rounded-2xl bg-white/[0.07] p-6 ring-1 ring-white/10">
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
                    {analysis.isLow ? <AlertTriangle className="h-4 w-4 text-rose-300" /> : <ShieldCheck className="h-4 w-4 text-emerald-300" />}
                    Sårbarhetsprofil för ledningsgrupp
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-white/80">
                    {analysis.isLow
                      ? `${detail.name} kan ha utmärkt teknisk säkerhet, men en kritisk kontrollrisk kvarstår. Data lämnar EU:s jurisdiktion och omfattas av utländsk lagstiftning. Om den geopolitiska kranen stängs av förlorar verksamheten omedelbart rådigheten över sin egen data — oavsett krypterings- och certifieringsnivå.`
                      : `${detail.name} uppvisar stark digital rådighet. Data stannar inom EU:s jurisdiktion och omfattas av europeisk lagstiftning, vilket ger ledningsgruppen bevarad kontroll även vid geopolitisk osäkerhet.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Recommendation panel */}
            {primaryAlt && (
              <div className="mt-6">
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-6 shadow-[var(--shadow-soft)] md:p-7">
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-800">
                        <ShieldCheck className="h-3.5 w-3.5" /> Rekommenderat EU-alternativ
                      </span>
                      <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                        {nameById.get(primaryAlt) ?? prettifyId(primaryAlt)}
                      </p>
                      <p className="mt-1 max-w-xl text-sm leading-relaxed text-foreground/65">
                        Verifierad europeisk ersättare inom samma produktkategori ({detail.category}). Migrering bevarar funktionaliteten samtidigt som data hålls inom EU:s jurisdiktion.
                      </p>
                    </div>
                    <Button
                      asChild
                      size="lg"
                      className="shrink-0 rounded-xl px-6 py-6 text-base font-bold text-white shadow-[var(--shadow-glow)] hover:opacity-95"
                      style={{ background: "var(--gradient-cta)" }}
                    >
                      <Link to="/atgardsplan">
                        <FileText className="h-4 w-4" /> Visa migreringsunderlag
                      </Link>
                    </Button>
                  </div>

                  {otherAlts.length > 0 && (
                    <div className="mt-5 border-t border-emerald-200/60 pt-4">
                      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/45">Fler EU-alternativ</p>
                      <div className="flex flex-wrap gap-2">
                        {otherAlts.map((id) => (
                          <button
                            key={id}
                            onClick={() => vendors.some((v) => v.id === id) && setSelectedId(id)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-foreground/75 ring-1 ring-border/60 transition hover:bg-emerald-50 hover:text-emerald-800"
                          >
                            {nameById.get(id) ?? prettifyId(id)}
                            {vendors.some((v) => v.id === id) && <ArrowRight className="h-3 w-3 text-foreground/35" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {!detail && !loadingDetail && !loadingList && (
          <div className="mt-10 rounded-2xl border border-white/70 bg-white/70 p-12 text-center shadow-[var(--shadow-soft)] backdrop-blur-sm">
            <Globe className="mx-auto h-8 w-8 text-foreground/40" />
            <p className="mt-3 text-sm font-medium text-foreground/60">Välj en leverantör ovan för att starta analysen.</p>
          </div>
        )}
      </main>

      <footer className="relative z-10 border-t border-white/40 py-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 text-xs font-medium text-foreground/60 md:px-10">
          <span>© 2026 Lumen Analytics AB</span>
          <span>EuroStack • ML-driven suveränitetsanalys</span>
        </div>
      </footer>
    </div>
  );
};

export default Quiz;
