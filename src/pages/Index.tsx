import { ArrowRight, Sparkles, BarChart3, Zap, TrendingUp, ClipboardList, SlidersHorizontal, ScanSearch, ShieldCheck, LineChart, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const newsItems = [
  {
    icon: Sparkles,
    title: "Ny analysmotor live",
    desc: "Realtidsjämförelser av leverantörer med 4× snabbare prestanda.",
    tag: "Produkt",
    href: "https://www.reuters.com/technology/",
  },
  {
    icon: BarChart3,
    title: "Marknadsrapport Q2",
    desc: "Datadriven översikt över prisrörelser och leverantörstrender.",
    tag: "Insikt",
    href: "https://www.reuters.com/technology/cybersecurity/",
  },
  {
    icon: Zap,
    title: "API för konsulter",
    desc: "Integrera leverantörsdata direkt i era egna system och rapporter.",
    tag: "Integration",
    href: "https://www.reuters.com/technology/artificial-intelligence/",
  },
];

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient depth */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full bg-blue-300/30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/4 -right-40 h-[640px] w-[640px] rounded-full bg-blue-900/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-sky-400/20 blur-3xl" />

      {/* NAV */}
      <header className="relative z-20 px-4 pt-4 md:px-8 md:pt-6">
        <nav className="glass-nav mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-5 py-3 md:px-7 md:py-4">
          <a href="#" className="flex items-center gap-2.5">
            <div
              className="grid h-8 w-8 place-items-center rounded-lg text-white"
              style={{ background: "var(--gradient-cta)" }}
            >
              <span className="text-sm font-bold">L</span>
            </div>
            <span className="text-base font-bold tracking-tight">Lumen</span>
            <span className="ml-2 hidden rounded-md bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/70 md:inline-block">
              B2B
            </span>
          </a>
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
                  En analytisk plattform för konsulter — stärk era leveranser,
                  motivera era rekommendationer med data och sälj tjänster
                  byggda på fakta, inte mellanhänder.
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
              Så fungerar{" "}
              <span className="bg-gradient-to-r from-blue-600 to-sky-400 bg-clip-text text-transparent">
                det
              </span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-foreground/70 md:text-lg">
              Få en tydlig översikt över hur analysen fungerar. Processen guidar er steg för steg
              från registrering av tech-leverantörer till ett färdigt riskresultat.
            </p>
          </div>

          {/* Step cards */}
          <div className="relative mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: ClipboardList,
                title: "1. Registrera tech-leverantörer",
                bullets: [
                  "Lägg till leverantörer ni använder idag",
                  "Ange namn, system, land och dataplats",
                  "Markera leverantörer som måste behållas",
                ],
              },
              {
                icon: SlidersHorizontal,
                title: "2. Konfigurering",
                bullets: [
                  "Vikta säkerhet, kostnad, efterlevnad eller flexibilitet",
                  "Välj sektor och betydelse av EU-datalagring",
                  "Ange er beredskap att byta tjänster",
                ],
              },
              {
                icon: ScanSearch,
                title: "3. Snabbanalys",
                bullets: [
                  "Snabb bedömning av alla leverantörer",
                  "Kontroll av känslig data och certifieringar",
                  "Första riskbild baserad på kritikalitet",
                ],
              },
              {
                icon: ShieldCheck,
                title: "4. Fördjupad analys",
                bullets: [
                  "Följdfrågor för kritiska leverantörer",
                  "Säkerhetsnivå, incidenthantering och dataplats",
                  "Jurisdiktion, ägarskap och regelverk",
                ],
              },
              {
                icon: LineChart,
                title: "5. Riskanalys och resultat",
                bullets: [
                  "Leverantörslista med komponentbidrag och status",
                  "Total poäng per leverantör",
                  "Rekommendation: behåll, reducera eller byt",
                ],
              },
            ].map((step, i) => {
              const Icon = step.icon;
              const [num, ...rest] = step.title.split(". ");
              const titleText = rest.join(". ");
              return (
                <div key={i} className="relative">
                  <div className="glass group h-full rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-deep)]">
                    <div className="mb-4 flex items-center gap-3">
                      <span
                        className="bg-gradient-to-r from-blue-600 to-sky-400 bg-clip-text text-4xl font-bold leading-none text-transparent md:text-5xl"
                      >
                        {num}
                      </span>
                      <div
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-[var(--shadow-soft)]"
                        style={{ background: "var(--gradient-cta)" }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <h3 className="text-base font-bold leading-snug text-foreground">
                      {titleText}
                    </h3>
                    <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-foreground/70">
                      {step.bullets.map((b, bi) => (
                        <li key={bi} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
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
                "DORA – hög vikt för kritiska system",
                "NIS2 – leverantörskedja och incidentrisk",
                "GDPR – persondata och överföring",
                "Suveränitet – jurisdiktion och ägarskap",
                "Data Act – kontroll och portabilitet",
                "EU-certifiering – bevisbar efterlevnad",
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-sm font-medium text-foreground/85 backdrop-blur-sm"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500 shadow-[0_0_8px_hsl(var(--blue-500))]" />
                  {item}
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
                  och kända regelverksrisker. Om information saknas skickas frågan vidare till
                  Fördjupad analys.
                </p>
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
