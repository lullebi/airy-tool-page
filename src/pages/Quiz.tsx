import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
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

const TONE_STYLES: Record<Tone, { chip: string; dot: string; text: string }> = {
  ok: { chip: "bg-emerald-100 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500", text: "text-emerald-700" },
  warn: { chip: "bg-amber-100 text-amber-800 ring-amber-200", dot: "bg-amber-500", text: "text-amber-700" },
  risk: { chip: "bg-rose-100 text-rose-800 ring-rose-200", dot: "bg-rose-500", text: "text-rose-700" },
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

function ToneChip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const s = TONE_STYLES[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${s.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {children}
    </span>
  );
}

function RegionCard({
  icon: Icon,
  label,
  description,
  region,
  tone,
}: {
  icon: typeof Globe;
  label: string;
  description: string;
  region: string;
  tone: Tone;
}) {
  const s = TONE_STYLES[tone];
  return (
    <div className="glass flex-1 rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${s.chip} ring-1`}>
          <Icon className="h-4.5 w-4.5" />
        </span>
        <ToneChip tone={tone}>{tone === "ok" ? "Inom EU" : tone === "warn" ? "Delvis" : "Utanför EU"}</ToneChip>
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/55">{label}</p>
      <p className="mt-1 text-lg font-bold leading-tight text-foreground">{region}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-foreground/60">{description}</p>
    </div>
  );
}

function Checkpoint({
  icon: Icon,
  feature,
  title,
  verdict,
  tone,
  body,
}: {
  icon: typeof Globe;
  feature: string;
  title: string;
  verdict: string;
  tone: Tone;
  body: string;
}) {
  const s = TONE_STYLES[tone];
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start gap-4">
        <span className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${s.chip}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-base font-bold leading-tight text-foreground">{title}</p>
              <code className="text-[11px] font-semibold text-foreground/45">{feature}</code>
            </div>
            <ToneChip tone={tone}>{verdict}</ToneChip>
          </div>
          <p className="mt-2.5 text-sm leading-relaxed text-foreground/70">{body}</p>
        </div>
      </div>
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
    const ownershipTone: Tone = f.hq_in_eu ? "ok" : "risk";

    const certs = Object.entries(f.certifications).filter(([, v]) => v != null).map(([k]) => CERT_LABELS[k] ?? k);
    const techStrong = (f.cert_score ?? 0) >= 0.66 || (f.eu_compliance_score ?? 0) >= 0.66;
    const techTone: Tone = techStrong ? (f.hq_in_eu ? "ok" : "warn") : "warn";

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

      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-8 md:px-8 md:pt-12">
        {/* ===== SECTION 1: TEKNISK PROVENIENS ===== */}
        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">01 · Teknisk proveniens</p>
              <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-foreground md:text-4xl">Geografisk dataspårning</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/65">
                Välj en leverantör för att spåra var data uppstår, bearbetas och lagras. Geografisk rådighet väger tyngst i modellen.
              </p>
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/55">Leverantör</label>
            <Select value={selectedId} onValueChange={setSelectedId} disabled={loadingList}>
              <SelectTrigger className="h-12 rounded-xl border-border/60 bg-white/60 text-base font-semibold">
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
            <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl py-10 text-sm font-medium text-foreground/60">
              <Loader2 className="h-4 w-4 animate-spin" /> Hämtar feature-data…
            </div>
          )}

          {detail && analysis && !loadingDetail && (
            <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-stretch">
              <RegionCard
                icon={Globe}
                label="origin_region"
                description={`Huvudkontorets jurisdiktion (${analysis.hqCountry}) styr vilka lagar som gäller.`}
                region={analysis.hqCountry}
                tone={analysis.originTone}
              />
              <div className="hidden items-center md:flex"><ArrowRight className="h-5 w-5 text-foreground/40" /></div>
              <RegionCard
                icon={Cpu}
                label="process_region"
                description="Där data aktivt beräknas och bearbetas i drift."
                region={detail.features.processing_region ?? "Okänt"}
                tone={analysis.processTone}
              />
              <div className="hidden items-center md:flex"><ArrowRight className="h-5 w-5 text-foreground/40" /></div>
              <RegionCard
                icon={Server}
                label="storage_region"
                description="Där data fysiskt vilar och lagras."
                region={detail.features.storage_region ?? "Okänt"}
                tone={analysis.storageTone}
              />
            </div>
          )}
        </section>

        {/* ===== SECTION 2: ML SÅRBARHETSPROFIL ===== */}
        {detail && analysis && !loadingDetail && (
          <section className="mt-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">02 · ML-sårbarhetsprofil</p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Feature-driven riskbedömning</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/65">
              Random Forest-modellen väger råa features. Geografisk åtkomstrisk dominerar — tekniska certifikat är stödjande bevis, inte motvikt.
            </p>

            <div className="mt-5 flex flex-col gap-3">
              <Checkpoint
                icon={Gavel}
                feature="cloud_act_exposure"
                title="Jurisdiktionell exponering"
                verdict={detail.features.cloud_act_exposure ? "Hög risk" : "Ingen risk"}
                tone={analysis.jurisdictionTone}
                body={
                  detail.features.cloud_act_exposure
                    ? `${detail.name} omfattas av utländsk övervakningslagstiftning (US CLOUD Act). Myndigheter kan begära ut data oavsett var den lagras.`
                    : `${detail.name} omfattas inte av US CLOUD Act eller motsvarande tredjelandslagar — data skyddas av EU:s jurisdiktion.`
                }
              />
              <Checkpoint
                icon={Building2}
                feature="hq_in_eu"
                title="Äganderättslig suveränitet"
                verdict={detail.features.hq_in_eu ? "EU-ägd" : "Utländskt ägande"}
                tone={analysis.ownershipTone}
                body={
                  detail.features.hq_in_eu
                    ? `Huvudkontor inom EU (${analysis.hqCountry}). Bolaget lyder primärt under europeisk lagstiftning.`
                    : `Huvudkontor utanför EU (${analysis.hqCountry}). Moderbolaget lyder under utländsk lagstiftning, vilket geografisk datalagring inte upphäver.`
                }
              />
              <Checkpoint
                icon={analysis.techTone === "ok" ? ShieldCheck : ShieldAlert}
                feature="cert_score / eu_compliance_score"
                title="Teknisk resiliens & bevisbörda"
                verdict={analysis.certs.length ? "Verifierad" : "Svag"}
                tone={analysis.techTone}
                body={`Verifierade attribut: ${analysis.certs.length ? analysis.certs.join(", ") : "inga"}. Robust teknisk säkerhet (NIS2, DORA, ISO 27001, SOC 2) styrker driften men neutraliserar inte den geografiska åtkomstrisken ovan.`}
              />
              {analysis.certs.length > 0 && (
                <div className="flex flex-wrap gap-2 px-1 pt-1">
                  {analysis.certs.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 text-xs font-bold text-foreground/70 ring-1 ring-border/60">
                      <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" /> {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ===== SECTION 3: SOVEREIGNTY SCORE & ALTERNATIVES ===== */}
        {detail && analysis && !loadingDetail && (
          <section className="mt-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">03 · Sovereignty Score</p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Resultat & handlingsbara alternativ</h2>

            <div className="mt-5 glass rounded-2xl p-6 md:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/55">Suveränitetspoäng</p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className={`text-6xl font-bold leading-none ${TONE_STYLES[analysis.isLow ? "risk" : analysis.score < 60 ? "warn" : "ok"].text}`}>
                      {analysis.score}
                    </span>
                    <span className="text-2xl font-bold text-foreground/40">/ {SCORE_CAP}</span>
                  </div>
                </div>
                <ToneChip tone={analysis.isLow ? "risk" : analysis.score < 60 ? "warn" : "ok"}>
                  {analysis.isLow ? "Kritisk kontrollrisk" : analysis.score < 60 ? "Medel kontrollrisk" : "Låg kontrollrisk"}
                </ToneChip>
              </div>
              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-foreground/10">
                <div
                  className={`h-full rounded-full transition-all ${analysis.isLow ? "bg-rose-500" : analysis.score < 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.max(2, (analysis.score / SCORE_CAP) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-medium text-foreground/50">
                Skalan är medvetet kapad vid {SCORE_CAP} — ingen leverantör är 100 % suverän.
              </p>

              {analysis.isLow && (
                <div className="mt-5 rounded-2xl bg-rose-50 p-5 ring-1 ring-rose-200">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-rose-700">
                    <AlertTriangle className="h-4 w-4" /> Sårbarhetsprofil för ledningsgrupp
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-rose-900/80">
                    {detail.name} kan ha utmärkt teknisk säkerhet, men en kritisk kontrollrisk kvarstår. Data lämnar EU:s
                    jurisdiktion och omfattas av utländsk lagstiftning. Om den geopolitiska kranen stängs av förlorar
                    verksamheten omedelbart rådigheten över sin egen data — oavsett krypterings- och certifieringsnivå.
                  </p>
                </div>
              )}
            </div>

            {analysis.euAlts.length > 0 && (
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/55">
                    Verifierade EU-alternativ · {detail.category}
                  </p>
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {analysis.euAlts.map((id) => (
                    <button
                      key={id}
                      onClick={() => setSelectedId(vendors.some((v) => v.id === id) ? id : selectedId)}
                      className="glass group flex items-center justify-between rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-deep)]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">{nameById.get(id) ?? prettifyId(id)}</p>
                        <p className="text-xs font-medium text-emerald-700">EU-baserat alternativ</p>
                      </div>
                      {vendors.some((v) => v.id === id) && (
                        <ArrowRight className="h-4 w-4 shrink-0 text-foreground/40 transition group-hover:translate-x-1" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {!detail && !loadingDetail && !loadingList && (
          <div className="mt-10 glass rounded-2xl p-10 text-center">
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
