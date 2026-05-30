import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldAlert, Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
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
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = 210;
    const pageH = 297;
    const margin = 20;
    const contentW = pageW - margin * 2; // 170

    // Palette
    const brand: [number, number, number] = [30, 64, 175];
    const ink: [number, number, number] = [31, 41, 55];
    const sub: [number, number, number] = [96, 105, 122];
    const red: [number, number, number] = [176, 58, 58];
    const green: [number, number, number] = [33, 122, 79];
    const tint: [number, number, number] = [239, 246, 255];
    const tintBorder: [number, number, number] = [191, 219, 254];
    const altRow: [number, number, number] = [247, 249, 252];
    const badgeBg: [number, number, number] = [237, 242, 248];
    const lineCol: [number, number, number] = [226, 230, 237];

    const fill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
    const stroke = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);
    const txt = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);

    let y = 0;

    // Column geometry for the analysis table
    const c1 = margin;
    const w1 = 46;
    const c2 = margin + 46;
    const w2 = 34;
    const c3 = margin + 80;
    const w3 = 90;
    const padX = 4;
    const padY = 5;

    const drawTableHeader = () => {
      fill(brand);
      doc.rect(margin, y, contentW, 9, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      txt([255, 255, 255]);
      doc.text("Leverantör", c1 + padX, y + 6);
      doc.text("Status", c2 + padX, y + 6);
      doc.text("Bedömning & rekommendation", c3 + padX, y + 6);
      y += 9;
    };

    const layoutBadges = (alts: string[], maxW: number) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      const bh = 5;
      const gap = 2;
      const padb = 2.4;
      const rowGap = 2;
      const rows: { text: string; w: number }[][] = [];
      let cur: { text: string; w: number }[] = [];
      let curW = 0;
      alts.forEach((a) => {
        const tw = doc.getTextWidth(a) + padb * 2;
        if (curW + tw > maxW && cur.length) {
          rows.push(cur);
          cur = [];
          curW = 0;
        }
        cur.push({ text: a, w: tw });
        curW += tw + gap;
      });
      if (cur.length) rows.push(cur);
      const height = rows.length ? rows.length * bh + (rows.length - 1) * rowGap : 0;
      return { rows, height, bh, gap, padb, rowGap };
    };

    // ===== Header banner =====
    fill(brand);
    doc.rect(0, 0, pageW, 4, "F");
    y = margin;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    txt(ink);
    doc.text("Migreringsunderlag", margin, y + 4);
    const dateStr = new Date().toLocaleDateString("sv-SE");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    txt(sub);
    doc.text(dateStr, pageW - margin, y + 4, { align: "right" });
    y += 9;
    doc.setFontSize(10);
    txt(sub);
    doc.text(
      "Strategisk leverantörsanalys för datasuveränitet — Lumen Analytics",
      margin,
      y + 2,
    );
    y += 6;
    stroke(lineCol);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 11;

    // ===== Executive summary callout =====
    const summaryTitle = "Sårbarhetsprofil för ledningsgrupp";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const summaryLines = doc.splitTextToSize(profileText, contentW - 16) as string[];
    const lineH = 5.2;
    const boxH = 8 + 7 + (summaryLines.length - 1) * lineH + 8;
    fill(tint);
    stroke(tintBorder);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentW, boxH, 3, 3, "FD");
    fill(brand);
    doc.roundedRect(margin, y, 1.6, boxH, 0.8, 0.8, "F");
    let ty = y + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    txt(brand);
    doc.text(summaryTitle.toUpperCase(), margin + 8, ty);
    ty += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    txt(ink);
    summaryLines.forEach((ln) => {
      doc.text(ln, margin + 8, ty);
      ty += lineH;
    });
    y += boxH + 12;

    // ===== Section heading =====
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    txt(ink);
    doc.text("Leverantörsanalys", margin, y);
    y += 5;
    stroke(brand);
    doc.setLineWidth(0.6);
    doc.line(margin, y, margin + 24, y);
    y += 8;

    drawTableHeader();

    rows.forEach((r, idx) => {
      const statusText = r.eu ? "Regulatoriskt Säker" : "Strukturell Kontrollrisk";
      const safeMsg =
        "Ingen åtgärd krävs. Befintlig infrastruktur uppfyller suveränitetskraven.";

      // Measure column blocks
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const nameLines = doc.splitTextToSize(r.vendor.name, w1 - 2 * padX) as string[];
      doc.setFontSize(8);
      const catLines = doc.splitTextToSize(r.vendor.type ?? "Tjänst", w1 - 2 * padX) as string[];
      const nameH = nameLines.length * 4.6 + 1.5 + catLines.length * 4;

      doc.setFontSize(9);
      const statusLines = doc.splitTextToSize(statusText, w2 - 2 * padX) as string[];
      const statusH = statusLines.length * 4.6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const assessLines = doc.splitTextToSize(r.riskParagraph, w3 - 2 * padX) as string[];
      const assessH = assessLines.length * 4.6;

      const safeLines = doc.splitTextToSize(safeMsg, w3 - 2 * padX) as string[];
      const alts = r.alt.eu;
      let extraH = 0;
      let badges: ReturnType<typeof layoutBadges> | null = null;
      if (r.eu) {
        extraH = 1.5 + safeLines.length * 4.6;
      } else if (alts.length) {
        badges = layoutBadges(alts, w3 - 2 * padX);
        extraH = 2 + 4 + badges.height + 1;
      } else {
        extraH = 2 + 4.6;
      }

      const rowH = Math.max(nameH, statusH, assessH + extraH) + 2 * padY;

      // Page break (re-draw table header)
      if (y + rowH > pageH - margin - 6) {
        doc.addPage();
        y = margin;
        drawTableHeader();
      }

      if (idx % 2 === 1) {
        fill(altRow);
        doc.rect(margin, y, contentW, rowH, "F");
      }

      const ystart = y + padY + 2;

      // Column 1 — Leverantör
      let ny = ystart;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      txt(ink);
      nameLines.forEach((ln) => {
        doc.text(ln, c1 + padX, ny);
        ny += 4.6;
      });
      ny += 1.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      txt(sub);
      catLines.forEach((ln) => {
        doc.text(ln, c1 + padX, ny);
        ny += 4;
      });

      // Column 2 — Status
      let sy = ystart;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      txt(r.eu ? green : red);
      statusLines.forEach((ln) => {
        doc.text(ln, c2 + padX, sy);
        sy += 4.6;
      });

      // Column 3 — Bedömning & rekommendation
      let ay = ystart;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      txt(ink);
      assessLines.forEach((ln) => {
        doc.text(ln, c3 + padX, ay);
        ay += 4.6;
      });
      ay += 1.5;

      if (r.eu) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        txt(green);
        safeLines.forEach((ln) => {
          doc.text(ln, c3 + padX, ay);
          ay += 4.6;
        });
      } else if (badges) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        txt(brand);
        doc.text("REKOMMENDERAT EU-ALTERNATIV", c3 + padX, ay);
        ay += 4;
        let by = ay + 1;
        badges.rows.forEach((row) => {
          let bxx = c3 + padX;
          row.forEach((b) => {
            fill(badgeBg);
            doc.roundedRect(bxx, by - 3.6, b.w, badges!.bh, 1.2, 1.2, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            txt(ink);
            doc.text(b.text, bxx + badges!.padb, by);
            bxx += b.w + badges!.gap;
          });
          by += badges!.bh + badges!.rowGap;
        });
      } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        txt(sub);
        doc.text("Inga taggade EU-alternativ för denna kategori.", c3 + padX, ay);
      }

      stroke(lineCol);
      doc.setLineWidth(0.2);
      doc.line(margin, y + rowH, margin + contentW, y + rowH);
      y += rowH;
    });

    // ===== Footer (page numbers + confidentiality) on every page =====
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      stroke(lineCol);
      doc.setLineWidth(0.2);
      doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      txt(sub);
      doc.text("Konfidentiellt — Endast för internt bruk", margin, pageH - 9);
      doc.text("Lumen Analytics", pageW / 2, pageH - 9, { align: "center" });
      doc.text(`Sida ${i} av ${pageCount}`, pageW - margin, pageH - 9, { align: "right" });
    }

    doc.save("migreringsunderlag.pdf");
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
          <Link to="/" className="text-lg font-bold tracking-tight text-foreground transition hover:opacity-80">
            Lumen Analytics
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
                  {r.eu ? (
                    <p className="text-sm leading-relaxed text-emerald-700">
                      Ingen åtgärd krävs. Befintlig infrastruktur uppfyller suveränitetskraven.
                    </p>
                  ) : (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
                        Rekommenderat EU-alternativ
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
                  )}
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
