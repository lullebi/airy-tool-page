import { useState, useEffect } from "react";
import { ArrowRight, Sparkles, BarChart3, Zap, TrendingUp, SlidersHorizontal, ShieldCheck, Database, Network, Lock, Landmark, FileText, BadgeCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

type NewsItem = {
  icon: typeof Sparkles;
  title: string;
  desc: string;
  tag: string;
  href: string;
};

const fallbackNews: NewsItem[] = [
  {
    icon: ShieldCheck,
    title: "EU stärker digital suveränitet",
    desc: "Nya initiativ för att minska beroendet av icke-europeiska molnleverantörer.",
    tag: "EU Tech",
    href: "https://digital-strategy.ec.europa.eu/en/policies/cloud-computing",
  },
  {
    icon: Lock,
    title: "GDPR och dataintegritet i fokus",
    desc: "Skärpta krav på hantering av personuppgifter hos molntjänster.",
    tag: "Integritet",
    href: "https://edpb.europa.eu/news/news_en",
  },
  {
    icon: Network,
    title: "Cybersäkerhet enligt NIS2",
    desc: "EU:s nya direktiv höjer ribban för IT-säkerhet inom kritisk infrastruktur.",
    tag: "Säkerhet",
    href: "https://www.enisa.europa.eu/news",
  },
];

const ICONS = [ShieldCheck, Lock, Network, Database, Landmark, BarChart3];

function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").trim();
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + "…";
}

async function fetchNews(): Promise<NewsItem[] | null> {
  const feeds = [
    "https://www.euractiv.com/sections/digital/feed/",
    "https://www.enisa.europa.eu/news/enisa-news/RSS",
    "https://digital-strategy.ec.europa.eu/en/news/rss.xml",
  ];
  try {
    const results = await Promise.all(
      feeds.map((url) =>
        fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    );
    const picks: NewsItem[] = [];
    results.forEach((res, idx) => {
      if (res?.items?.length) {
        const first = res.items[0];
        picks.push({
          icon: ICONS[idx % ICONS.length],
          title: truncate(stripHtml(first.title || ""), 70),
          desc: truncate(stripHtml(first.description || first.content || ""), 110),
          tag: truncate(stripHtml(res.feed?.title || "Nyheter"), 18),
          href: first.link || first.guid || "#",
        });
      }
    });
    if (picks.length >= 3) return picks.slice(0, 3);
    return null;
  } catch {
    return null;
  }
}

const Index = () => {
  const [datasetExpanded, setDatasetExpanded] = useState(false);
  const [newsItems, setNewsItems] = useState<NewsItem[]>(fallbackNews);

  useEffect(() => {
    let cancelled = false;
    fetchNews().then((items) => {
      if (!cancelled && items) setNewsItems(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient depth */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full bg-blue-300/30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/4 -right-40 h-[640px] w-[640px] rounded-full bg-blue-900/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-sky-400/20 blur-3xl" />

      {/* NAV */}
      <header className="relative z-20 px-4 pt-4 md:px-8 md:pt-6">
        <nav className="glass-nav mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-5 py-3 md:px-7 md:py-4">
          <div />

          <div className="flex items-center gap-1 md:gap-2">
            <a
              href="#how-it-works"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-foreground/80 transition hover:bg-white/50 hover:text-foreground"
            >
              Så fungerar det
            </a>
            <Button
              asChild
              className="rounded-xl px-5 font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95"
              style={{ background: "var(--gradient-cta)" }}
            >
              <Link to="/registrera-leverantorer">Registrera</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* MAIN GRID */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
        <div className="grid grid-cols-12 gap-5 md:gap-8">
          {/* LEFT NEWS COLUMN */}
          <aside className="col-span-12 lg:col-span-3">
            <div className="mb-4 flex items-center justify-between px-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/60">
                Senaste nytt
              </p>
              <TrendingUp className="h-3.5 w-3.5 text-foreground/50" />
            </div>
            <div className="flex flex-col gap-4">
              {newsItems.map((item, i) => {
                const Icon = item.icon;
                return (
                  <a
                    key={i}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass group block cursor-pointer rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-deep)]"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
                        style={{ background: "var(--gradient-cta)" }}
                      >
                        Nyhet
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
                        {item.tag}
                      </span>
                    </div>
                    <h3 className="text-[15px] font-bold leading-snug text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-foreground/65">
                      {item.desc}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary transition group-hover:gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      Läs mer
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </a>
                );
              })}
            </div>
          </aside>

          {/* HERO RIGHT */}
          <section className="col-span-12 lg:col-span-9 flex">
            <div
              className="relative flex w-full flex-col justify-center overflow-hidden rounded-3xl p-8 md:p-14 lg:p-16 text-white"
              style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-deep)" }}
            >
              {/* grid + glows */}
              <div className="absolute inset-0 grid-bg opacity-40" />
              <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-blue-400/40 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl" />

              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_8px_hsl(205_80%_72%)]" />
                  Verktyg för datadrivna konsulter
                </span>

                <h1 className="mt-7 text-5xl font-bold leading-[1.02] md:text-7xl lg:text-[5.25rem]">
                  Bli självständig
                  <br />
                  <span className="bg-gradient-to-r from-sky-200 via-white to-sky-300 bg-clip-text text-transparent">
                    idag.
                  </span>
                </h1>

                <p className="mt-6 max-w-xl text-base font-medium leading-relaxed text-white/75 md:text-lg">
                  En analytisk plattform för konsulter på Aixia
                </p>

                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="group rounded-xl bg-white px-6 py-6 text-base font-bold text-primary shadow-[var(--shadow-glow)] hover:bg-sky-50"
                  >
                    <Link to="/registrera-leverantorer">
                      Starta din analys
                      <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-1" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="lg"
                    className="rounded-xl border border-white/20 bg-white/5 px-6 py-6 text-base font-semibold text-white backdrop-blur-md hover:bg-white/15 hover:text-white"
                  >
                    <a href="#how-it-works">Så fungerar det</a>
                  </Button>
                </div>

              </div>
            </div>

          </section>
        </div>

        <section id="how-it-works" className="mt-20 md:mt-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/60">
              Process
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              Så fungerar det
            </h2>
            <p className="mt-5 text-base leading-relaxed text-foreground/70 md:text-lg">
              Få en tydlig översikt över hur analysen fungerar. Processen guidar er steg för steg
              från registrering av tech-leverantörer till ett färdigt riskresultat.
            </p>
          </div>

          {/* Step cards */}
          <div className="relative mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {[
              {
                icon: SlidersHorizontal,
                step: "Steg 1",
                title: "Verksamhetsanalys & Strategi",
                text: "Analysen inleds med en kartläggning av er organisations unika förutsättningar, tidslinjer och regulatoriska tryck under NIS2 eller DORA. Svaren ligger till grund för den slutgiltiga handlingsplanen.",
              },
              {
                icon: Network,
                step: "Steg 2",
                title: "Infrastruktur & Dataproveniens",
                text: "Här visualiseras er leverantörsportfölj baserat på objektiva attribut direkt från vårt dataset. Verktyget spårar datans faktiska geografiska flöde samt identifierar legala kontrollrisker såsom exponering mot utländsk molnlagstiftning.",
              },
              {
                icon: ShieldCheck,
                step: "Steg 3",
                title: "Strategisk Åtgärdsplan",
                text: "I det sista steget sammanfogas er verksamhetsprofil med leverantörernas faktiska jurisdiktion. Resultatet är en skräddarsydd, strategisk åtgärdsplan som identifierar sårbarheter och presenterar suveräna europeiska alternativ.",
              },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={i}
                  className="glass group flex h-full flex-col rounded-3xl p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-deep)] md:p-8"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-soft)]"
                      style={{ background: "var(--gradient-cta)" }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/50">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="mt-6 text-lg font-bold leading-snug text-foreground md:text-xl">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/70">
                    {step.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-10 flex justify-center">
            <Button
              asChild
              size="lg"
              className="group rounded-xl px-7 py-6 text-base font-bold text-white shadow-[var(--shadow-soft)] hover:opacity-95"
              style={{ background: "var(--gradient-cta)" }}
            >
              <Link to="/registrera-leverantorer">
                Starta Steg 1
                <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>

          {/* Vad mäts? */}
          <div className="glass mt-10 rounded-3xl p-7 md:p-9">
            <div className="mb-5 flex items-center gap-3">
              <div
                className="grid h-9 w-9 place-items-center rounded-lg text-white"
                style={{ background: "var(--gradient-cta)" }}
              >
                <BarChart3 className="h-4 w-4" />
              </div>
              <h3 className="text-xl font-bold text-foreground md:text-2xl">Vad mäts?</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                { label: "DORA – hög vikt för kritiska system", Icon: ShieldCheck },
                { label: "NIS2 – leverantörskedja och incidentrisk", Icon: Network },
                { label: "GDPR – persondata och överföring", Icon: Lock },
                { label: "Suveränitet – jurisdiktion och ägarskap", Icon: Landmark },
                { label: "Data Act – kontroll och portabilitet", Icon: FileText },
                { label: "EU-certifiering – bevisbar efterlevnad", Icon: BadgeCheck },
              ].map(({ label, Icon }, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-sm font-medium text-foreground/85 backdrop-blur-sm"
                >
                  <Icon className="h-4 w-4 shrink-0 text-blue-500" aria-hidden="true" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Dataset */}
          <div className="mt-6 rounded-2xl border border-white/50 bg-white/30 p-6 backdrop-blur-sm md:p-7">
            <div className="flex items-start gap-4">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-foreground/5 text-foreground/70">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-base font-bold text-foreground">Dataset och källor</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground/65">
                  Datasetet samlar information om kända leverantörer. Det används för att besvara
                  frågor som redan finns dokumenterade, exempelvis land, dataplats, certifieringar
                  och kända regelverksrisker. Om information saknas kompletteras profilen via
                  verksamhetsanalysen.
                </p>
                <button
                  type="button"
                  onClick={() => setDatasetExpanded((v) => !v)}
                  aria-expanded={datasetExpanded}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-foreground/70 hover:text-foreground focus:outline-none"
                >
                  {datasetExpanded ? "Visa mindre" : "Teknisk beskrivning"}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${datasetExpanded ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    datasetExpanded ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-3 border-t border-white/50 pt-3 text-xs leading-relaxed text-foreground/65">
                      <div>
                        <p className="font-semibold text-foreground/80">Datakällor</p>
                        <p>
                          Kuraterat dataset över EU- och globala tech-leverantörer, kompletterat med
                          öppna register, leverantörers transparensrapporter, ISO/SOC2/C5-certifikat
                          samt EU-kommissionens publikationer om adekvansbeslut och SCC.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground/80">API och uppslag</p>
                        <p>
                          Varje leverantör matchas via ett uppslag i datasetet. Saknad metadata
                          (land, jurisdiktion, certifieringar) kompletteras via verksamhetsanalysen
                          där svaren samlas in i Steg 1.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground/80">Risk och viktning</p>
                        <p>
                          Riskbedömningen väger samman objektiva dataattribut, jurisdiktion och
                          EU-rådighet mot er verksamhetsprofil. Varje attribut har en intern viktning
                          baserad på regulatorisk tyngd under NIS2, DORA och GDPR.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground/80">Compliance och jurisdiktion</p>
                        <p>
                          Analysen mappas mot DORA, NIS2, GDPR, Data Act och EU-suveränitet. Vid
                          tredjelandsöverföring kontrolleras CLOUD Act-exponering, SCC och
                          data residency för att flagga juridiska risker.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/40 py-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-xs font-medium text-foreground/60 md:px-10">
          <span>© 2026 Lumen Analytics AB</span>
          <span>Byggt för konsulter som tänker själva.</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
