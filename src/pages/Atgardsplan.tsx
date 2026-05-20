import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldAlert, CheckCircle2, AlertTriangle, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { fetchAlternatives, type RescoredVendor } from "@/lib/api";
import type { VendorLike } from "@/lib/vendorMapper";

const EU_COUNTRIES = new Set([
  "Sverige","Tyskland","Frankrike","Nederländerna","Spanien","Italien","Polen",
  "Danmark","Finland","Norge","Belgien","Österrike","Irland","Portugal","Estland",
  "Lettland","Litauen","Tjeckien","Slovakien","Ungern","Grekland","Rumänien",
  "Bulgarien","Kroatien","Slovenien","Luxemburg","Malta","Cypern","EU","EES",
]);
const isEU = (v: VendorLike) => !!v.country && EU_COUNTRIES.has(v.country);

const NO_ALT_MESSAGE = "Inga EU-alternativ taggade för denna kategori";

type AltState = { loading: boolean; eu: string[]; error?: string };

type VendorRow = {
  vendor: VendorLike;
  score: number;
  risks: string[];
  alt: AltState;
};

const riskLabel = (score: number) => {
  if (score >= 70) return { label: "Låg risk", tone: "ok" as const };
  if (score >= 45) return { label: "Medel risk", tone: "warn" as const };
  return { label: "Hög risk", tone: "bad" as const };
};

const toneClasses = (tone: "ok" | "warn" | "bad") =>
  tone === "ok"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : tone === "warn"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : "bg-rose-50 text-rose-700 ring-rose-200";

const Atgardsplan = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as {
    vendors?: VendorLike[];
    scores?: Record<string, number>;
    scored?: RescoredVendor[];
  };

  const vendors: VendorLike[] = state.vendors ?? [];

  // Fetch EU alternatives per category once.
  const [altsByCategory, setAltsByCategory] = useState<Record<string, AltState>>({});

  useEffect(() => {
    const categories = Array.from(
      new Set(vendors.map((v) => v.type).filter((t): t is string => !!t)),
    );
    categories.forEach((cat) => {
      setAltsByCategory((prev) =>
        prev[cat] ? prev : { ...prev, [cat]: { loading: true, eu: [] } },
      );
      fetchAlternatives(cat)
        .then((r) =>
          setAltsByCategory((prev) => ({
            ...prev,
            [cat]: { loading: false, eu: r.eu_alternatives },
          })),
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
  }, [vendors.map((v) => v.type).join("|")]);

  const rows: VendorRow[] = useMemo(
    () =>
      vendors.map((v) => {
        const eu = isEU(v);
        const score = state.scores?.[v.id] ?? (eu ? 75 : 38);
        const risks: string[] = [];
        if (!eu) {
          risks.push("Tredjelandsöverföring (utanför EU/EES)");
          risks.push("Exponering mot US CLOUD Act");
        }
        if (score < 70) risks.push("Otillräcklig dokumenterad NIS2/DORA-beredskap");
        if (score < 45) risks.push("Begränsade kontraktsmässiga skyddsåtgärder (DPA/SLA)");
        if (risks.length === 0) risks.push("Inga väsentliga risker identifierade");
        const alt: AltState = v.type
          ? altsByCategory[v.type] ?? { loading: true, eu: [] }
          : { loading: false, eu: [] };
        return { vendor: v, score, risks, alt };
      }),
    [vendors, state.scores, altsByCategory],
  );

  const high = rows.filter((r) => r.score < 45);
  const med = rows.filter((r) => r.score >= 45 && r.score < 70);
  const low = rows.filter((r) => r.score >= 70);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/quiz", { state: { vendors: state.vendors, stepIndex: 4 } })} className="text-foreground/70">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tillbaka
          </Button>
          <Link to="/" className="text-xs font-medium text-foreground/50 hover:text-foreground">
            Eurostack
          </Link>
        </div>

        {/* SECTION 1 — Summary */}
        <header className="mb-8">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
            Åtgärdsplan
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Rekommenderade åtgärder</h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground/65">
            Baserat på analysen rekommenderas följande åtgärder och alternativa leverantörer.
          </p>
        </header>

        {/* SECTION 2 — Current vs Alternatives */}
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground/55">
            Nuvarande leverantörer & EU-alternativ
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((r) => {
              const status = riskLabel(r.score);
              return (
                <Card key={r.vendor.id} className="border-border/70">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base font-semibold">{r.vendor.name}</CardTitle>
                        <p className="mt-0.5 text-xs text-foreground/55">
                          {r.vendor.type ?? "Tjänst"} · {r.vendor.country ?? "—"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${toneClasses(status.tone)}`}
                      >
                        {status.label} · {r.score}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
                        Identifierade risker
                      </p>
                      <ul className="space-y-1">
                        {r.risks.map((risk, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-foreground/75">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Separator />
                    <div className="rounded-md bg-primary/5 p-3 ring-1 ring-primary/15">
                      <div className="mb-1 flex items-center gap-2">
                        <ArrowRight className="h-3.5 w-3.5 text-primary" />
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                          Rekommenderat EU-alternativ
                        </p>
                      </div>
                      {r.alt.loading ? (
                        <p className="inline-flex items-center gap-2 text-xs text-foreground/60">
                          <Loader2 className="h-3 w-3 animate-spin" /> Hämtar alternativ…
                        </p>
                      ) : r.alt.eu.length === 0 ? (
                        <p className="text-xs text-foreground/60">{NO_ALT_MESSAGE}</p>
                      ) : (
                        <ul className="flex flex-wrap gap-1.5">
                          {r.alt.eu.map((name) => (
                            <li
                              key={name}
                              className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-foreground ring-1 ring-primary/20"
                            >
                              {name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* SECTION 3 — Action Priority */}
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground/55">
            Åtgärdsprioritet
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            <PriorityCard
              title="Hög prioritet"
              tone="bad"
              icon={<ShieldAlert className="h-4 w-4" />}
              items={
                high.length > 0
                  ? high.map((r) => `Ersätt eller migrera ${r.vendor.name} till ${r.alt.name}`)
                  : ["Inga akuta åtgärder identifierade."]
              }
            />
            <PriorityCard
              title="Medel prioritet"
              tone="warn"
              icon={<AlertTriangle className="h-4 w-4" />}
              items={
                med.length > 0
                  ? med.map((r) => `Granska avtal och DPA för ${r.vendor.name}`)
                  : ["Inga åtgärder med medelhög prioritet."]
              }
            />
            <PriorityCard
              title="Låg prioritet"
              tone="ok"
              icon={<CheckCircle2 className="h-4 w-4" />}
              items={
                low.length > 0
                  ? low.map((r) => `Fortsatt övervakning av ${r.vendor.name}`)
                  : ["Inga lågprioriterade åtgärder."]
              }
            />
          </div>
        </section>

        {/* SECTION 4 — Next Steps */}
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground/55">
            Rekommenderade nästa steg
          </h2>
          <Card className="border-border/70">
            <CardContent className="p-5">
              <ol className="space-y-3">
                {[
                  "Granska efterlevnadsavtal (DPA, SLA, SCC) för samtliga icke-EU-leverantörer.",
                  "Utvärdera EU-baserade alternativ enligt rekommendationerna ovan.",
                  "Minska beroendet av affärskritiska leverantörer genom exit-plan och datamigreringsstrategi.",
                  "Dokumentera incidenthantering och rapporteringsrutiner enligt NIS2 och DORA.",
                  "Planera in en kvartalsvis uppföljning av leverantörsportföljen.",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/20">
                      {i + 1}
                    </span>
                    <span className="text-sm text-foreground/80">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </section>

        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={() => navigate("/quiz", { state: { vendors: state.vendors, stepIndex: 4 } })} className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tillbaka till mätning
          </Button>
        </div>
      </div>
    </div>
  );
};

const PriorityCard = ({
  title,
  tone,
  icon,
  items,
}: {
  title: string;
  tone: "ok" | "warn" | "bad";
  icon: React.ReactNode;
  items: string[];
}) => {
  const ring =
    tone === "ok"
      ? "ring-emerald-200"
      : tone === "warn"
        ? "ring-amber-200"
        : "ring-rose-200";
  const text =
    tone === "ok" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-rose-700";
  const bg =
    tone === "ok" ? "bg-emerald-50" : tone === "warn" ? "bg-amber-50" : "bg-rose-50";
  return (
    <Card className={`border-border/70`}>
      <CardHeader className="pb-2">
        <div className={`inline-flex w-fit items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${bg} ${text} ${ring}`}>
          {icon}
          {title}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="text-xs text-foreground/75">
              • {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default Atgardsplan;
