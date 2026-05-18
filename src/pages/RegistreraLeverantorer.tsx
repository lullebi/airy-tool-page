import { useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Vendor = {
  id: string;
  name: string;
  type: string;
  country: string;
  system: string;
  mustKeep: boolean;
};

const VENDOR_TYPES = ["SaaS", "Infrastruktur", "Plattform", "Kommunikation", "Annat"];

const QUICK_PICKS: { name: string; type: string; country: string }[] = [
  { name: "Microsoft", type: "SaaS", country: "USA" },
  { name: "Google", type: "SaaS", country: "USA" },
  { name: "AWS", type: "Infrastruktur", country: "USA" },
  { name: "Azure", type: "Infrastruktur", country: "USA" },
  { name: "ChatGPT", type: "SaaS", country: "USA" },
  { name: "Slack", type: "Kommunikation", country: "USA" },
  { name: "Dropbox", type: "SaaS", country: "USA" },
  { name: "Zoom", type: "Kommunikation", country: "USA" },
  { name: "Salesforce", type: "SaaS", country: "USA" },
  { name: "Notion", type: "SaaS", country: "USA" },
  { name: "Nextcloud", type: "SaaS", country: "Tyskland" },
  { name: "OVHcloud", type: "Infrastruktur", country: "Frankrike" },
];

const emptyVendor = (): Vendor => ({
  id: crypto.randomUUID(),
  name: "",
  type: "",
  country: "",
  system: "",
  mustKeep: false,
});

const RegistreraLeverantorer = () => {
  const [vendors, setVendors] = useState<Vendor[]>([emptyVendor()]);

  const updateVendor = (id: string, patch: Partial<Vendor>) =>
    setVendors((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  const removeVendor = (id: string) =>
    setVendors((vs) => (vs.length === 1 ? [emptyVendor()] : vs.filter((v) => v.id !== id)));

  const addVendor = () => setVendors((vs) => [...vs, emptyVendor()]);

  const selectedQuickPicks = new Set(
    vendors.map((v) => v.name.trim().toLowerCase()).filter(Boolean),
  );

  const handleQuickPick = (pick: typeof QUICK_PICKS[number]) => {
    const key = pick.name.toLowerCase();
    if (selectedQuickPicks.has(key)) {
      // toggle off: remove first matching
      setVendors((vs) => {
        const idx = vs.findIndex((v) => v.name.trim().toLowerCase() === key);
        if (idx === -1) return vs;
        const next = vs.filter((_, i) => i !== idx);
        return next.length === 0 ? [emptyVendor()] : next;
      });
      return;
    }
    setVendors((vs) => {
      // fill first empty card, otherwise append
      const emptyIdx = vs.findIndex((v) => !v.name && !v.type && !v.country && !v.system);
      const filled: Vendor = {
        id: emptyIdx === -1 ? crypto.randomUUID() : vs[emptyIdx].id,
        name: pick.name,
        type: pick.type,
        country: pick.country,
        system: "",
        mustKeep: false,
      };
      if (emptyIdx === -1) return [...vs, filled];
      return vs.map((v, i) => (i === emptyIdx ? filled : v));
    });
  };

  const knownNames = new Set(QUICK_PICKS.map((p) => p.name.toLowerCase()));
  const namedVendors = vendors.filter((v) => v.name.trim().length > 0);
  const hasAnyVendor = namedVendors.length > 0;
  const incompleteCustomVendors = namedVendors.filter(
    (v) => !knownNames.has(v.name.trim().toLowerCase()) && (!v.type || !v.country.trim()),
  );
  const missingSystemVendors = namedVendors.filter((v) => !v.system.trim());
  const canStart =
    hasAnyVendor && incompleteCustomVendors.length === 0 && missingSystemVendors.length === 0;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient depth */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full bg-blue-300/30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/4 -right-40 h-[640px] w-[640px] rounded-full bg-blue-900/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-sky-400/20 blur-3xl" />

      {/* TOP BAR */}
      <header className="relative z-20 px-4 pt-4 md:px-8 md:pt-6">
        <nav className="glass-nav mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-5 py-3 md:px-7 md:py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-foreground/75 transition hover:bg-white/50 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Tillbaka
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-md bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/70 md:inline-block">
              Verktyg
            </span>
            <span className="text-sm font-bold tracking-tight text-foreground">
              Registrera leverantörer
            </span>
          </div>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-10 md:px-8 md:pt-14">
        {/* INTRO */}
        <section className="mb-10 max-w-3xl">
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Lägg till era{" "}
            <span className="text-primary">tech-leverantörer</span>
          </h1>
          <p className="mt-3 text-base font-medium leading-relaxed text-foreground/70">
            Registrera klientens leverantörer för att analysera risk och beroenden. Markera vilka som är affärskritiska för att få relevanta rekommendationer.
          </p>
        </section>

        {/* SNABBVAL */}
        <section className="mb-8">
          <div className="glass rounded-2xl p-6 shadow-[var(--shadow-soft)] md:p-7">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-lg font-bold tracking-tight text-foreground">Snabbval</h2>
              <span className="text-xs font-medium text-foreground/55">
                Klicka för att lägga till
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_PICKS.map((pick) => {
                const active = selectedQuickPicks.has(pick.name.toLowerCase());
                return (
                  <button
                    key={pick.name}
                    type="button"
                    onClick={() => handleQuickPick(pick)}
                    className={
                      "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition " +
                      (active
                        ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                        : "border-white/60 bg-white/60 text-foreground/80 hover:bg-white hover:text-foreground")
                    }
                  >
                    <Plus
                      className={
                        "h-3.5 w-3.5 transition " + (active ? "rotate-45" : "")
                      }
                    />
                    {pick.name}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* VENDOR CARDS */}
        <section className="space-y-5">
          {vendors.map((v, idx) => (
            <div
              key={v.id}
              className="glass rounded-2xl p-6 shadow-[var(--shadow-soft)] md:p-7"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-base font-bold tracking-tight text-foreground">
                  Leverantör #{idx + 1}
                </h3>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeVendor(v.id)}
                  aria-label="Ta bort leverantör"
                  className="h-8 w-8 text-foreground/55 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
                    Leverantörsnamn
                  </Label>
                  <Input
                    value={v.name}
                    onChange={(e) => updateVendor(v.id, { name: e.target.value })}
                    placeholder="t.ex. Microsoft 365"
                    className="bg-white/70"
                    maxLength={120}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
                    Typ
                  </Label>
                  <Select
                    value={v.type}
                    onValueChange={(val) => updateVendor(v.id, { type: val })}
                  >
                    <SelectTrigger className="bg-white/70">
                      <SelectValue placeholder="Välj typ" />
                    </SelectTrigger>
                    <SelectContent>
                      {VENDOR_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
                    Land
                  </Label>
                  <Input
                    value={v.country}
                    onChange={(e) => updateVendor(v.id, { country: e.target.value })}
                    placeholder="t.ex. USA, Tyskland"
                    className="bg-white/70"
                    maxLength={80}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
                    System
                  </Label>
                  <Input
                    value={v.system}
                    onChange={(e) => updateVendor(v.id, { system: e.target.value })}
                    placeholder="t.ex. CRM, mail, lagring"
                    className="bg-white/70"
                    maxLength={120}
                  />
                </div>
              </div>

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-white/60 bg-white/40 p-4 transition hover:bg-white/60">
                <Checkbox
                  checked={v.mustKeep}
                  onCheckedChange={(c) => updateVendor(v.id, { mustKeep: c === true })}
                  className="mt-0.5"
                />
                <span className="text-sm font-medium leading-relaxed text-foreground/80">
                  Den här leverantören måste vi behålla just nu, även om den bedöms som
                  icke-EU eller hög risk.
                </span>
              </label>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addVendor}
            className="w-full rounded-xl border-dashed border-foreground/20 bg-white/40 py-6 text-sm font-semibold text-foreground/75 hover:bg-white/70"
          >
            <Plus className="h-4 w-4" />
            Lägg till leverantör
          </Button>
        </section>

        {/* CTA */}
        <div className="mt-10 flex flex-col items-end gap-2">
          {!canStart && hasAnyVendor && incompleteCustomVendors.length > 0 && (
            <p className="text-xs font-medium text-foreground/60">
              Ange Typ och Land för alla leverantörer som inte finns i Snabbval
            </p>
          )}
          {!hasAnyVendor && (
            <p className="text-xs font-medium text-foreground/60">
              Lägg till minst en leverantör för att fortsätta
            </p>
          )}
          {canStart ? (
            <Button
              size="lg"
              asChild
              className="group rounded-xl px-7 py-6 text-base font-bold text-white shadow-[var(--shadow-glow)] hover:opacity-95"
              style={{ background: "var(--gradient-cta)" }}
            >
              <Link to="/quiz" state={{ vendors }}>
                Starta quiz
                <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
            </Button>
          ) : (
            <Button
              size="lg"
              disabled
              className="group rounded-xl px-7 py-6 text-base font-bold text-white shadow-[var(--shadow-glow)]"
              style={{ background: "var(--gradient-cta)" }}
            >
              Starta quiz
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/40 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-xs font-medium text-foreground/60 md:px-10">
          <span>© 2026 Lumen Analytics AB</span>
          <span>Verktyg • Leverantörsregister</span>
        </div>
      </footer>
    </div>
  );
};

export default RegistreraLeverantorer;
