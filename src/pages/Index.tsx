import { ArrowRight, Sparkles, BarChart3, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const newsItems = [
  {
    icon: Sparkles,
    title: "Ny analysmotor live",
    desc: "Snabbare jämförelser av leverantörer i realtid.",
  },
  {
    icon: BarChart3,
    title: "Rapport: Q2 marknad",
    desc: "Datadriven översikt över prisrörelser och trender.",
  },
  {
    icon: Zap,
    title: "API för konsulter",
    desc: "Integrera leverantörsdata direkt i dina egna verktyg.",
  },
];

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-sky-200/40 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full bg-blue-100/50 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-cyan-100/40 blur-3xl" />

      {/* NAV */}
      <header className="relative z-10">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-10">
          <a href="#" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl" style={{ background: "var(--gradient-primary)" }} />
            <span className="text-lg font-medium tracking-tight">Lumen</span>
          </a>
          <div className="flex items-center gap-2 md:gap-4">
            <a
              href="#how"
              className="rounded-full px-4 py-2 text-sm text-foreground/70 transition hover:bg-white/60 hover:text-foreground"
            >
              Så fungerar det
            </a>
            <Button
              className="rounded-full bg-foreground px-5 text-background shadow-[var(--shadow-soft)] hover:bg-foreground/90"
            >
              Registrera
            </Button>
          </div>
        </nav>
      </header>

      {/* MAIN GRID */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-8 md:px-10 md:pt-16">
        <div className="grid grid-cols-12 gap-6 md:gap-10">
          {/* LEFT NEWS COLUMN */}
          <aside className="col-span-12 lg:col-span-3">
            <p className="mb-4 px-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Senaste nytt
            </p>
            <div className="flex flex-col gap-4">
              {newsItems.map((item, i) => {
                const Icon = item.icon;
                return (
                  <a
                    key={i}
                    href="#"
                    className="glass group block rounded-3xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Nyhet
                      </span>
                      <Icon className="h-4 w-4 text-primary/70" />
                    </div>
                    <h3 className="font-serif text-lg leading-snug text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{item.desc}</p>
                    <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition group-hover:opacity-100">
                      Läs mer <ArrowRight className="h-3 w-3" />
                    </div>
                  </a>
                );
              })}
            </div>
          </aside>

          {/* HERO RIGHT */}
          <section className="col-span-12 lg:col-span-9">
            <div className="relative overflow-hidden rounded-[2.5rem] p-8 md:p-14 lg:p-16 glass">
              <div
                className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full opacity-60 blur-3xl"
                style={{ background: "var(--gradient-primary)" }}
              />
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full glass-soft px-3 py-1.5 text-xs text-foreground/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Verktyg för datadrivna konsulter
                </span>

                <h1 className="mt-6 font-serif text-5xl leading-[1.05] text-foreground md:text-7xl lg:text-[5.5rem]">
                  Bli självständig <br className="hidden md:block" />
                  <span className="italic text-primary">idag</span>
                </h1>

                <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                  Ett analytiskt verktyg som hjälper dig att jämföra leverantörer,
                  förstå marknadsdata och fatta beslut på dina egna villkor —
                  utan mellanhänder.
                </p>

                <div className="mt-10 flex flex-wrap items-center gap-3">
                  <Button
                    size="lg"
                    className="group rounded-full px-7 py-6 text-base shadow-[var(--shadow-glow)]"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    Registrera leverantörer
                    <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-1" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="rounded-full px-6 py-6 text-base text-foreground/80 hover:bg-white/60"
                  >
                    Se demo
                  </Button>
                </div>

                {/* metric strip */}
                <div className="mt-14 grid grid-cols-3 gap-4 border-t border-white/60 pt-8">
                  {[
                    { k: "+12 400", v: "leverantörer indexerade" },
                    { k: "98%", v: "datatäckning" },
                    { k: "3.2 min", v: "snitt analysstid" },
                  ].map((m) => (
                    <div key={m.k}>
                      <div className="font-serif text-2xl text-foreground md:text-3xl">{m.k}</div>
                      <div className="mt-1 text-xs text-muted-foreground md:text-sm">{m.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* HOW IT WORKS */}
            <div id="how" className="mt-10 grid grid-cols-12 gap-6">
              <div className="col-span-12 md:col-span-5">
                <a href="#" className="group inline-flex items-center gap-2 text-sm font-medium text-primary">
                  Så fungerar det
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </a>
                <h2 className="mt-3 font-serif text-3xl leading-tight md:text-4xl">
                  Tre steg från data till beslut.
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Lumen är byggt som ett verktyg — inte en tjänst. Du styr,
                  filtrerar och exporterar precis det du behöver.
                </p>
              </div>

              <div className="col-span-12 grid gap-4 md:col-span-7 md:grid-cols-3">
                {[
                  { n: "01", t: "Indexera", d: "Importera eller koppla din leverantörsdata." },
                  { n: "02", t: "Analysera", d: "Filtrera, jämför och hitta avvikelser." },
                  { n: "03", t: "Agera", d: "Exportera rapporter eller skicka via API." },
                ].map((s) => (
                  <div
                    key={s.n}
                    className="glass-soft rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
                  >
                    <div className="font-serif text-sm text-primary">{s.n}</div>
                    <div className="mt-2 font-medium">{s.t}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{s.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/40 py-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-xs text-muted-foreground md:px-10">
          <span>© 2026 Lumen</span>
          <span>Byggt för konsulter som tänker själva.</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
