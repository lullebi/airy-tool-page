import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldAlert, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { fetchAlternatives, type RescoredVendor } from "@/lib/api";
import type { VendorLike } from "@/lib/vendorMapper";
import { isEuropean as isEU } from "@/lib/vendorMapper";

const NO_ALT_MESSAGE = "Inga EU-alternativ taggade för denna kategori";

type AltState = { loading: boolean; eu: string[]; error?: string };

// Organisatorisk kontext från Step 1 (Verksamhetsanalys & Strategi).
type Step1Like = {
  timeHorizon?: string;
  infrastructure?: string;
  techResource?: string;
  regulatoryFocus?: string;
};

type VendorRow = {
  vendor: VendorLike;
  eu: boolean;
  riskParagraph: string;
  alt: AltState;
};

// Exakt strategisk bedömning för det kritiska scenariot.
const PROFILE_EXACT_TEXT =
  "Analysen visar att er nuvarande infrastruktur uppvisar kritiska kontrollrisker gällande geopolitisk rådighet och dataägande. Eftersom er verksamhet står under omedelbar regulatorisk press från NIS2/DORA samt har ett uttalat behov av publika molntjänster inom EU, innebär nuvarande leverantörsberoende en direkt strategisk verksamhetsrisk. En kontrollerad migration till godkända europeiska ekosystem bör inledas omedelbart för att säkra kontinuiteten.";

// Genererar en sammanhängande strategisk sårbarhetsbedömning (ett stycke).
const buildExecutiveProfile = (step1: Step1Like, anyThirdCountry: boolean): string => {
  if (
    anyThirdCountry &&
    step1.timeHorizon === "A" &&
    step1.infrastructure === "B" &&
    step1.regulatoryFocus === "A"
  ) {
    return PROFILE_EXACT_TEXT;
  }

  if (anyThirdCountry) {
    const urgency =
      step1.timeHorizon === "A"
        ? "Med ert uttalade behov av omedelbar förändring"
        : "Inom en strategisk omställningshorisont";
    const reg =
      step1.regulatoryFocus === "A"
        ? "och den regulatoriska pressen från NIS2/DORA"
        : "och era krav på dataskydd enligt GDPR";
    return `Analysen visar att delar av er leverantörsportfölj lyder under tredjelandsjurisdiktion, vilket innebär strukturella kontrollrisker gällande geopolitisk rådighet och dataägande. ${urgency} ${reg} bör en kontrollerad migration till europeiska alternativ prioriteras för att säkra långsiktig kontinuitet och juridisk rådighet över verksamhetens data.`;
  }

  return "Analysen visar att er nuvarande leverantörsportfölj i huvudsak vilar på europeisk infrastruktur med god juridisk rådighet. Inga akuta kontrollrisker har identifierats, men en löpande uppföljning av leverantörernas efterlevnad rekommenderas för att bibehålla suveränitet och regelefterlevnad över tid.";
};

const Atgardsplan = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as {
    vendors?: VendorLike[];
    scores?: Record<string, number>;
    scored?: RescoredVendor[];
    step1?: Step1Like;
  };

  const vendors: VendorLike[] = state.vendors ?? [];
  const step1: Step1Like = state.step1 ?? {};

  const [altsByCategory, setAltsByCategory] = useState<Record<string, AltState>>({});

  useEffect(() => {
    const categories = Array.from(
      new Set(vendors.map((v) => v.apiCategory ?? v.type).filter((t): t is string => !!t)),
    );
    categories.forEach((cat) => {
      setAltsByCategory((prev) => (prev[cat] ? prev : { ...prev, [cat]: { loading: true, eu: [] } }));
      fetchAlternatives(cat)
        .then((r) =>
          setAltsByCategory((prev) => ({ ...prev, [cat]: { loading: false, eu: r.eu_alternatives } })),
        )
        .catch((e: unknown) =>
          setAltsByCategory((prev) => ({
            ...prev,
            [cat]: {
              loading: false,
              eu: [],
              error: e instanceof Error ? e.message : "Kunde inte hämta alternativ",
            },
          })),
        );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendors.map((v) => v.apiCategory ?? v.type).join("|")]);

  const anyThirdCountry = useMemo(
    () => vendors.some((v) => v.cloud_act_exposure === true || v.hq_in_eu === false),
    [vendors],
  );

  const profileText = buildExecutiveProfile(step1, anyThirdCountry);

  const rows: VendorRow[] = useMemo(
    () =>
      vendors.map((v) => {
        const eu = isEU(v);
        const riskParagraph = eu
          ? "Leverantören har huvudkontor och datalagring inom EU, vilket ger full juridisk rådighet och efterlevnad av europeiska dataskyddskrav utan exponering mot tredjelandslagstiftning."
          : "Leverantören lyder under utländsk jurisdiktion (US CLOUD Act), vilket medför bristande juridisk rådighet och lagring utanför EU:s suveränitetszon.";
        const altCat = v.apiCategory ?? v.type;
        const alt: AltState = altCat
          ? altsByCategory[altCat] ?? { loading: true, eu: [] }
          : { loading: false, eu: [] };
        return { vendor: v, eu, riskParagraph, alt };
      }),
    [vendors, altsByCategory],
  );

  const handleExport = () => {
    const blocks = rows.map((r) => {
      const status = r.eu ? "Regulatoriskt Säker" : "Strukturell Kontrollrisk";
      const alts = r.alt.eu.length ? r.alt.eu.join(", ") : "Inga taggade EU-alternativ";
      return `${r.vendor.name} (${r.vendor.type ?? "Tjänst"})\nStatus: ${status}\nBedömning: ${r.riskParagraph}\nRekommenderade EU-alternativ: ${alts}`;
    });
    const content = `MIGRERINGSUNDERLAG — Eurostack\n\nSårbarhetsprofil för ledningsgrupp:\n${profileText}\n\n— Leverantörsanalys —\n\n${blocks.join("\n\n")}\n`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "migreringsunderlag.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/quiz", { state: { vendors: state.vendors, stepIndex: 2 } })}
            className="text-foreground/70"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tillbaka
          </Button>
          <Link to="/" className="text-xs font-medium text-foreground/50 hover:text-foreground">
            Eurostack
          </Link>
        </div>

        {/* HEADER */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Rekommenderade åtgärder</h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground/65">
            En strategisk åtgärdsplan baserad på er verksamhetsanalys och leverantörernas faktiska
            jurisdiktion och dataprovenans.
          </p>
        </header>

        {/* SÅRBARHETSPROFIL — top advisory card */}
        <section className="mb-10">
          <Card className="border-l-4 border-l-rose-500 border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 ring-1 ring-rose-200">
                  <ShieldAlert className="h-5 w-5 text-rose-600" />
                </span>
                <CardTitle className="text-xl font-bold tracking-tight">
                  Sårbarhetsprofil för Ledningsgrupp
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="max-w-3xl text-base leading-relaxed text-foreground/85">{profileText}</p>
            </CardContent>
          </Card>
        </section>

        {/* LEVERANTÖRSANALYS & EU-ALTERNATIV */}
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/55">
            Leverantörsanalys & EU-alternativ
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((r) => (
              <Card key={r.vendor.id} className="border-border/70">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base font-semibold">{r.vendor.name}</CardTitle>
                      <p className="mt-0.5 text-xs text-foreground/55">
                        {r.vendor.type ?? "Tjänst"} · {r.vendor.country ?? "—"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-semibold ${
                        r.eu ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {r.eu ? "Regulatoriskt Säker" : "Strukturell Kontrollrisk"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
                      Identifierade risker
                    </p>
                    <p className="text-sm leading-relaxed text-foreground/75">{r.riskParagraph}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
                      Rekommenderade EU-alternativ
                    </p>
                    {r.alt.loading ? (
                      <p className="inline-flex items-center gap-2 text-xs text-foreground/60">
                        <Loader2 className="h-3 w-3 animate-spin" /> Hämtar alternativ…
                      </p>
                    ) : r.alt.eu.length === 0 ? (
                      <p className="text-xs text-foreground/60">{r.alt.error ?? NO_ALT_MESSAGE}</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {r.alt.eu.map((name) => (
                          <span
                            key={name}
                            className="rounded-full bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-foreground ring-1 ring-primary/20"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              size="lg"
              onClick={handleExport}
              className="group rounded-xl px-6 py-6 text-base font-bold text-white shadow-[var(--shadow-glow)] hover:opacity-95"
              style={{ background: "var(--gradient-cta)" }}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportera Migreringsunderlag
            </Button>
          </div>
        </section>

        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => navigate("/quiz", { state: { vendors: state.vendors, stepIndex: 2 } })}
            className="rounded-xl"
          >
            Slutför Konsultation
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Atgardsplan;
