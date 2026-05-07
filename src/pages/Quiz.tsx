import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, ShieldAlert, ChevronDown, Download, Repeat } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* =========================================================================
   QUIZ DATA MODEL
   Each question carries: id, kategori, viktning (weight 0–1),
   svarsalternativ (options) with scoreValue (0–100).
   Designed so it can be wired to a backend dataset/API later.
   ========================================================================= */

type Option = { label: string; scoreValue: number };
type Question = {
  id: string;
  kategori: string;
  text: string;
  viktning: number; // 0..1
  type: "single" | "multi" | "scale" | "select";
  svarsalternativ: Option[];
};

const STEP1_PRIORITIES: Option[] = [
  { label: "Säkerhet", scoreValue: 100 },
  { label: "Kostnad", scoreValue: 100 },
  { label: "Compliance", scoreValue: 100 },
  { label: "Flexibilitet", scoreValue: 100 },
  { label: "Skalbarhet", scoreValue: 100 },
];

const STEP1_SECTORS = [
  "Finans",
  "Sjukvård",
  "Offentlig sektor",
  "Tillverkning",
  "Detaljhandel",
  "Utbildning",
  "Telekom",
  "Energi",
];

const STEP1_READINESS: Option[] = [
  { label: "Låg", scoreValue: 0 },
  { label: "Medel", scoreValue: 50 },
  { label: "Hög", scoreValue: 100 },
];

const QUICK_SCAN: Question[] = [
  {
    id: "qs_sensitive_data",
    kategori: "Quick Scan",
    text: "Hanterar era leverantörer känslig data?",
    viktning: 0.3,
    type: "single",
    svarsalternativ: [
      { label: "Ja", scoreValue: 100 },
      { label: "Nej", scoreValue: 0 },
      { label: "Vet ej", scoreValue: 50 },
    ],
  },
  {
    id: "qs_certifications",
    kategori: "Quick Scan",
    text: "Har era tech-leverantörer certifieringar (ISO 27001, SOC2, C5)?",
    viktning: 0.25,
    type: "single",
    svarsalternativ: [
      { label: "Ja", scoreValue: 100 },
      { label: "Nej", scoreValue: 0 },
      { label: "Vet ej", scoreValue: 50 },
    ],
  },
  {
    id: "qs_business_critical",
    kategori: "Quick Scan",
    text: "Är era leverantörer affärskritiska?",
    viktning: 0.25,
    type: "single",
    svarsalternativ: [
      { label: "Ja", scoreValue: 100 },
      { label: "Nej", scoreValue: 0 },
      { label: "Vet ej", scoreValue: 50 },
    ],
  },
  {
    id: "qs_legal_agreements",
    kategori: "Quick Scan",
    text: "Har ni avtal som motsvarar DPA, SLA eller liknande juridiska krav?",
    viktning: 0.2,
    type: "single",
    svarsalternativ: [
      { label: "Ja", scoreValue: 100 },
      { label: "Nej", scoreValue: 0 },
      { label: "Vet ej", scoreValue: 50 },
    ],
  },
];

const DEEP_DIVE: Question[] = [
  // Security Level
  { id: "dd_sec_encryption", kategori: "Security Level", text: "Krypteras data både i vila och under transport?", viktning: 0.2, type: "single", svarsalternativ: [{label:"Ja, alltid",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_sec_access", kategori: "Security Level", text: "Används MFA och rollbaserad åtkomst?", viktning: 0.18, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_sec_audit", kategori: "Security Level", text: "Genomförs regelbundna säkerhetsrevisioner?", viktning: 0.16, type: "single", svarsalternativ: [{label:"Årligen",scoreValue:100},{label:"Sällan",scoreValue:50},{label:"Aldrig",scoreValue:0}] },
  { id: "dd_sec_pen", kategori: "Security Level", text: "Genomförs penetrationstester av tredje part?", viktning: 0.14, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Vet ej",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_sec_keys", kategori: "Security Level", text: "Kontrollerar ni krypteringsnycklarna (BYOK/HYOK)?", viktning: 0.16, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_sec_zero", kategori: "Security Level", text: "Tillämpar leverantören zero-trust-arkitektur?", viktning: 0.16, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },

  // Incident Management
  { id: "dd_inc_plan", kategori: "Incident Management", text: "Finns en dokumenterad incidenthanteringsplan?", viktning: 0.22, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_inc_sla", kategori: "Incident Management", text: "Finns SLA för svarstid vid säkerhetsincidenter?", viktning: 0.2, type: "single", svarsalternativ: [{label:"< 4h",scoreValue:100},{label:"< 24h",scoreValue:60},{label:"Ingen SLA",scoreValue:0}] },
  { id: "dd_inc_notif", kategori: "Incident Management", text: "Notifieras kund inom 72h vid databreach?", viktning: 0.2, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Vet ej",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_inc_drills", kategori: "Incident Management", text: "Genomförs regelbundna incidentövningar?", viktning: 0.18, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Sällan",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_inc_log", kategori: "Incident Management", text: "Finns fullständiga loggar tillgängliga för forensik?", viktning: 0.2, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },

  // Data Location / Jurisdiction
  { id: "dd_loc_eu", kategori: "Data Location/Jurisdiction", text: "Lagras all data inom EU/EES?", viktning: 0.25, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:40},{label:"Nej",scoreValue:0}] },
  { id: "dd_loc_transfer", kategori: "Data Location/Jurisdiction", text: "Sker dataöverföring till tredje land?", viktning: 0.2, type: "single", svarsalternativ: [{label:"Aldrig",scoreValue:100},{label:"Sällan",scoreValue:50},{label:"Ofta",scoreValue:0}] },
  { id: "dd_loc_scc", kategori: "Data Location/Jurisdiction", text: "Används SCC eller godkända överföringsmekanismer?", viktning: 0.18, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Vet ej",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_loc_residency", kategori: "Data Location/Jurisdiction", text: "Garanterar leverantören data residency på begäran?", viktning: 0.17, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_loc_sub", kategori: "Data Location/Jurisdiction", text: "Är alla underleverantörer EU-baserade?", viktning: 0.2, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },

  // Ownership / Lagar & Regelverk
  { id: "dd_own_hq", kategori: "Ownership/Lagar & Regelverk", text: "Har leverantören huvudkontor i EU?", viktning: 0.22, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Nej",scoreValue:0}] },
  { id: "dd_own_cloud_act", kategori: "Ownership/Lagar & Regelverk", text: "Omfattas leverantören av US CLOUD Act eller liknande?", viktning: 0.22, type: "single", svarsalternativ: [{label:"Nej",scoreValue:100},{label:"Vet ej",scoreValue:50},{label:"Ja",scoreValue:0}] },
  { id: "dd_own_owner", kategori: "Ownership/Lagar & Regelverk", text: "Är ägarstrukturen transparent och EU-kontrollerad?", viktning: 0.2, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_own_gdpr", kategori: "Ownership/Lagar & Regelverk", text: "Är leverantören fullt GDPR-compliant?", viktning: 0.18, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_own_dora", kategori: "Ownership/Lagar & Regelverk", text: "Möter leverantören DORA / NIS2-krav där tillämpligt?", viktning: 0.18, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
];

/* =========================================================================
   STATE TYPES
   ========================================================================= */

type Step1State = {
  priorities: string[]; // multi select
  sector: string;
  euDataWeight: number; // 1..5
  readiness: string; // label
};

type Answers = Record<string, string>; // questionId -> option label

type VendorLike = { id: string; name: string; type?: string; country?: string; mustKeep?: boolean };

const STEPS = ["Konfiguration", "Quick Scan", "Deep Dive", "Resultat", "Mätning"] as const;

const EU_COUNTRIES = new Set([
  "Sverige","Tyskland","Frankrike","Nederländerna","Spanien","Italien","Polen",
  "Danmark","Finland","Norge","Belgien","Österrike","Irland","Portugal","Estland",
  "Lettland","Litauen","Tjeckien","Slovakien","Ungern","Grekland","Rumänien",
  "Bulgarien","Kroatien","Slovenien","Luxemburg","Malta","Cypern","EU","EES",
]);

const isEU = (v: VendorLike) => !!v.country && EU_COUNTRIES.has(v.country);

// Mapping: non-EU vendor → matching EU alternative
const EU_ALTERNATIVES: Record<string, { name: string; country: string; reason: string }> = {
  "Microsoft 365": { name: "OnlyOffice DocSpace", country: "EU", reason: "EU-baserad kontorssvit utan CLOUD Act-exponering." },
  "AWS": { name: "OVHcloud", country: "Frankrike", reason: "EU-suverän infrastruktur, GDPR/SecNumCloud-certifierad." },
  "Google Workspace": { name: "Infomaniak kSuite", country: "Schweiz/EU", reason: "Privacy-by-design, datalagring i EU." },
  "Azure": { name: "Scaleway", country: "Frankrike", reason: "Europeisk hyperscaler med full datasuveränitet." },
  "Slack": { name: "Element / Matrix", country: "EU", reason: "Federerad EU-baserad kommunikation." },
  "Zoom": { name: "Whereby", country: "Norge", reason: "Europeiskt videomöte, GDPR-compliant." },
  "Salesforce": { name: "SuperOffice", country: "Norge", reason: "Nordiskt CRM med full EU-datalagring." },
  "Dropbox": { name: "Tresorit", country: "Schweiz/EU", reason: "End-to-end-krypterad EU-fillagring." },
};

const defaultAlternative = { name: "EU-alternativ tillgängligt", country: "EU", reason: "Motsvarande tjänst med EU-suveränitet och GDPR-efterlevnad." };

/* =========================================================================
   SCORING
   ========================================================================= */

const scoreFor = (q: Question, ans: Answers): number => {
  const choice = ans[q.id];
  const opt = q.svarsalternativ.find((o) => o.label === choice);
  return opt ? opt.scoreValue : 0;
};

const weightedAverage = (qs: Question[], ans: Answers) => {
  const totalW = qs.reduce((s, q) => s + q.viktning, 0) || 1;
  const sum = qs.reduce((s, q) => s + scoreFor(q, ans) * q.viktning, 0);
  return Math.round(sum / totalW);
};

const computeVendorScore = (
  step1: Step1State,
  quick: Answers,
  deep: Answers,
  hasDeep: boolean
) => {
  const quickScore = weightedAverage(QUICK_SCAN, quick);
  const deepScore = hasDeep ? weightedAverage(DEEP_DIVE, deep) : quickScore;
  const euWeight = ((step1.euDataWeight - 1) / 4) * 100;
  const readinessOpt = STEP1_READINESS.find((r) => r.label === step1.readiness);
  const readinessScore = readinessOpt?.scoreValue ?? 50;

  // Composite — quick 35%, deep 35%, euWeight 15%, readiness 15%
  const total = Math.round(
    quickScore * 0.35 + deepScore * 0.35 + euWeight * 0.15 + readinessScore * 0.15
  );
  return { quickScore, deepScore, euWeight, readinessScore, total };
};

const statusFromScore = (s: number) => {
  if (s >= 70) return { label: "Låg risk", tone: "ok" as const };
  if (s >= 45) return { label: "Medel risk", tone: "warn" as const };
  return { label: "Hög risk – ersättning rekommenderas", tone: "bad" as const };
};

/* =========================================================================
   COMPONENT
   ========================================================================= */

const DEFAULT_VENDORS: VendorLike[] = [
  { id: "v1", name: "Microsoft 365", type: "SaaS", country: "USA" },
  { id: "v2", name: "AWS", type: "Infrastruktur", country: "USA" },
];

const Quiz = () => {
  const location = useLocation();
  const stateVendors = (location.state as { vendors?: VendorLike[] } | null)?.vendors;
  const vendors = stateVendors && stateVendors.length > 0 ? stateVendors : DEFAULT_VENDORS;

  const [stepIndex, setStepIndex] = useState(0);
  const [step1, setStep1] = useState<Step1State>({
    priorities: [],
    sector: "",
    euDataWeight: 3,
    readiness: "Medel",
  });
  const [quickAnswers, setQuickAnswers] = useState<Answers>({});
  const [deepAnswers, setDeepAnswers] = useState<Answers>({});
  // Deep Dive aktiveras för leverantörer där dataset saknar info.
  // Här simulerat — användaren kan toggla.
  const [deepDiveEnabled, setDeepDiveEnabled] = useState(true);

  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const canNext = useMemo(() => {
    if (stepIndex === 0)
      return step1.priorities.length > 0 && step1.sector !== "" && step1.readiness !== "";
    if (stepIndex === 1) return QUICK_SCAN.every((q) => quickAnswers[q.id]);
    if (stepIndex === 2)
      return !deepDiveEnabled || DEEP_DIVE.every((q) => deepAnswers[q.id]);
    return true;
  }, [stepIndex, step1, quickAnswers, deepAnswers, deepDiveEnabled]);

  const goNext = () =>
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const togglePriority = (label: string) =>
    setStep1((s) => ({
      ...s,
      priorities: s.priorities.includes(label)
        ? s.priorities.filter((p) => p !== label)
        : [...s.priorities, label],
    }));

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient depth — same vibe as other pages */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full bg-blue-300/30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/4 -right-40 h-[640px] w-[640px] rounded-full bg-blue-900/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-sky-400/20 blur-3xl" />

      {/* TOP BAR */}
      <header className="relative z-20 px-4 pt-4 md:px-8 md:pt-6">
        <nav className="glass-nav mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-5 py-3 md:px-7 md:py-4">
          <Link
            to="/registrera-leverantorer"
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
              Eurostack Quiz
            </span>
          </div>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-10 md:px-8 md:pt-14">
        {/* PROGRESS */}
        <section className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/60">
              Steg {stepIndex + 1} av {STEPS.length} – {STEPS[stepIndex]}
            </p>
            <p className="text-xs font-medium text-foreground/60">
              {Math.round(progress)}%
            </p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/60 ring-1 ring-white/60">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: "var(--gradient-cta)" }}
            />
          </div>
          <div className="mt-3 flex justify-between text-[11px] font-semibold text-foreground/55">
            {STEPS.map((s, i) => (
              <span key={s} className={i <= stepIndex ? "text-foreground" : ""}>
                {s}
              </span>
            ))}
          </div>
        </section>

        {/* STEP CONTENT */}
        <div key={stepIndex} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {stepIndex === 0 && (
            <Step1Konfig
              state={step1}
              setState={setStep1}
              togglePriority={togglePriority}
            />
          )}
          {stepIndex === 1 && (
            <StepQuestions
              title="Quick Scan"
              subtitle="Generella frågor som gäller alla nuvarande leverantörer."
              questions={QUICK_SCAN}
              answers={quickAnswers}
              setAnswers={setQuickAnswers}
            />
          )}
          {stepIndex === 2 && (
            <Step3DeepDive
              enabled={deepDiveEnabled}
              setEnabled={setDeepDiveEnabled}
              answers={deepAnswers}
              setAnswers={setDeepAnswers}
            />
          )}
          {stepIndex === 3 && (
            <Step4Result
              vendors={vendors}
              step1={step1}
              quick={quickAnswers}
              deep={deepAnswers}
              hasDeep={deepDiveEnabled}
            />
          )}
          {stepIndex === 4 && (
            <Step5Measurement
              vendors={vendors}
              step1={step1}
              quick={quickAnswers}
              deep={deepAnswers}
              hasDeep={deepDiveEnabled}
            />
          )}
        </div>

        {/* NAV */}
        <div className="mt-10 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={goBack}
            disabled={stepIndex === 0}
            className="rounded-xl px-5 py-5 text-sm font-semibold"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Tillbaka
          </Button>
          {stepIndex < STEPS.length - 1 ? (
            <Button
              size="lg"
              onClick={goNext}
              disabled={!canNext}
              className="group rounded-xl px-7 py-6 text-base font-bold text-white shadow-[var(--shadow-glow)] hover:opacity-95"
              style={{ background: "var(--gradient-cta)" }}
            >
              Fortsätt
              <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-1" />
            </Button>
          ) : (
            <Button
              size="lg"
              asChild
              className="group rounded-xl px-7 py-6 text-base font-bold text-white shadow-[var(--shadow-glow)] hover:opacity-95"
              style={{ background: "var(--gradient-cta)" }}
            >
              <Link to="/registrera-leverantorer">Klar</Link>
            </Button>
          )}
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/40 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-xs font-medium text-foreground/60 md:px-10">
          <span>© 2026 Lumen Analytics AB</span>
          <span>Verktyg • Eurostack Quiz</span>
        </div>
      </footer>
    </div>
  );
};

/* =========================================================================
   STEP 1 — Konfiguration
   ========================================================================= */
const Step1Konfig = ({
  state,
  setState,
  togglePriority,
}: {
  state: Step1State;
  setState: React.Dispatch<React.SetStateAction<Step1State>>;
  togglePriority: (label: string) => void;
}) => (
  <Card title="Konfiguration" subtitle="Här sätter vi vikt och kontext för analysen.">
    <div className="grid gap-8">
      {/* Priorities */}
      <Field label="Vad är viktigast för er?" hint="Välj ett eller flera.">
        <div className="flex flex-wrap gap-2">
          {STEP1_PRIORITIES.map((p) => {
            const active = state.priorities.includes(p.label);
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => togglePriority(p.label)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ring-1 ${
                  active
                    ? "bg-foreground text-background ring-foreground"
                    : "bg-white/70 text-foreground/80 ring-white/70 hover:bg-white"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </Field>

      {/* Sector */}
      <Field label="Vilken sektor verkar ni inom?">
        <Select
          value={state.sector}
          onValueChange={(v) => setState((s) => ({ ...s, sector: v }))}
        >
          <SelectTrigger className="h-11 rounded-xl bg-white/80">
            <SelectValue placeholder="Välj sektor" />
          </SelectTrigger>
          <SelectContent>
            {STEP1_SECTORS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* EU data weight */}
      <Field
        label="Hur viktig är EU-datalagring för er?"
        hint={`Vald nivå: ${state.euDataWeight} av 5`}
      >
        <Slider
          value={[state.euDataWeight]}
          min={1}
          max={5}
          step={1}
          onValueChange={(v) =>
            setState((s) => ({ ...s, euDataWeight: v[0] ?? 3 }))
          }
        />
        <div className="mt-2 flex justify-between text-[11px] font-medium text-foreground/55">
          <span>Inte viktigt</span>
          <span>Avgörande</span>
        </div>
      </Field>

      {/* Readiness */}
      <Field label="Beredskap vid avstängning av utländska tjänster">
        <div className="grid grid-cols-3 gap-2">
          {STEP1_READINESS.map((r) => {
            const active = state.readiness === r.label;
            return (
              <button
                key={r.label}
                type="button"
                onClick={() => setState((s) => ({ ...s, readiness: r.label }))}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ring-1 ${
                  active
                    ? "bg-foreground text-background ring-foreground"
                    : "bg-white/70 text-foreground/80 ring-white/70 hover:bg-white"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </Field>
    </div>
  </Card>
);

/* =========================================================================
   GENERIC STEP — Question list
   ========================================================================= */
const StepQuestions = ({
  title,
  subtitle,
  questions,
  answers,
  setAnswers,
}: {
  title: string;
  subtitle: string;
  questions: Question[];
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
}) => (
  <Card title={title} subtitle={subtitle}>
    <div className="grid gap-6">
      {questions.map((q, i) => (
        <div key={q.id} className="rounded-2xl bg-white/60 p-5 ring-1 ring-white/70">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
            {q.kategori} · Fråga {i + 1}
          </p>
          <p className="mt-1 text-base font-semibold text-foreground">{q.text}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {q.svarsalternativ.map((opt) => {
              const active = answers[q.id] === opt.label;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() =>
                    setAnswers((a) => ({ ...a, [q.id]: opt.label }))
                  }
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ring-1 ${
                    active
                      ? "bg-foreground text-background ring-foreground"
                      : "bg-white text-foreground/80 ring-white/80 hover:bg-white/90"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  </Card>
);

/* =========================================================================
   STEP 3 — Deep Dive (kategoriserad)
   ========================================================================= */
const Step3DeepDive = ({
  enabled,
  setEnabled,
  answers,
  setAnswers,
}: {
  enabled: boolean;
  setEnabled: (b: boolean) => void;
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
}) => {
  const categories = useMemo(() => {
    const map = new Map<string, Question[]>();
    DEEP_DIVE.forEach((q) => {
      map.set(q.kategori, [...(map.get(q.kategori) ?? []), q]);
    });
    return Array.from(map.entries());
  }, []);

  return (
    <Card
      title="Deep Dive"
      subtitle="Aktiveras för leverantörer där datasetet saknar information. Detaljerad granskning per kategori."
    >
      <label className="mb-6 flex items-center gap-3 rounded-xl bg-white/60 p-3 ring-1 ring-white/70">
        <Checkbox
          checked={enabled}
          onCheckedChange={(v) => setEnabled(Boolean(v))}
        />
        <span className="text-sm font-medium text-foreground/80">
          Aktivera Deep Dive (rekommenderas vid okända eller nischade leverantörer)
        </span>
      </label>

      {!enabled ? (
        <p className="rounded-xl bg-white/60 p-5 text-sm text-foreground/70 ring-1 ring-white/70">
          Deep Dive är inaktiverad. Quick Scan-resultatet används direkt i analysen.
        </p>
      ) : (
        <div className="grid gap-8">
          {categories.map(([cat, qs]) => (
            <div key={cat}>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground/70">
                {cat}
              </h3>
              <div className="grid gap-4">
                {qs.map((q, i) => (
                  <div
                    key={q.id}
                    className="rounded-2xl bg-white/60 p-5 ring-1 ring-white/70"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
                      Fråga {i + 1}
                    </p>
                    <p className="mt-1 text-base font-semibold text-foreground">
                      {q.text}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {q.svarsalternativ.map((opt) => {
                        const active = answers[q.id] === opt.label;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() =>
                              setAnswers((a) => ({ ...a, [q.id]: opt.label }))
                            }
                            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ring-1 ${
                              active
                                ? "bg-foreground text-background ring-foreground"
                                : "bg-white text-foreground/80 ring-white/80 hover:bg-white/90"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

/* =========================================================================
   STEP 4 — Result
   ========================================================================= */
const Step4Result = ({
  vendors,
  step1,
  quick,
  deep,
  hasDeep,
}: {
  vendors: VendorLike[];
  step1: Step1State;
  quick: Answers;
  deep: Answers;
  hasDeep: boolean;
}) => {
  const scores = vendors.map((v) => ({
    vendor: v,
    ...computeVendorScore(step1, quick, deep, hasDeep),
  }));

  return (
    <Card
      title="Resultat"
      subtitle="Sammanvägd poäng per leverantör mätt mot Eurostack-standard."
    >
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Sektor" value={step1.sector || "—"} />
        <Stat label="EU-datalagring" value={`${step1.euDataWeight}/5`} />
        <Stat label="Beredskap" value={step1.readiness} />
        <Stat label="Prioriteter" value={`${step1.priorities.length}`} />
      </div>

      <div className="grid gap-4">
        {scores.map(({ vendor, total, quickScore, deepScore, euWeight, readinessScore }) => {
          const status = statusFromScore(total);
          const StatusIcon =
            status.tone === "ok"
              ? CheckCircle2
              : status.tone === "warn"
                ? AlertTriangle
                : ShieldAlert;
          const statusColor =
            status.tone === "ok"
              ? "text-emerald-600"
              : status.tone === "warn"
                ? "text-amber-600"
                : "text-rose-600";
          return (
            <div
              key={vendor.id}
              className="rounded-2xl bg-white/70 p-5 ring-1 ring-white/70"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-foreground">{vendor.name}</p>
                  <p className="text-xs font-medium text-foreground/60">
                    {vendor.type ?? "—"} · {vendor.country ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`inline-flex items-center gap-1.5 text-sm font-semibold ${statusColor}`}>
                    <StatusIcon className="h-4 w-4" />
                    {status.label}
                  </div>
                  <div className="rounded-xl bg-foreground px-4 py-2 text-lg font-bold text-background">
                    {total}
                  </div>
                </div>
              </div>

              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/70 ring-1 ring-white/70">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${total}%`, background: "var(--gradient-cta)" }}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-medium text-foreground/70 md:grid-cols-4">
                <Contribution label="Quick Scan" value={quickScore} />
                <Contribution label="Deep Dive" value={deepScore} />
                <Contribution label="EU-vikt" value={euWeight} />
                <Contribution label="Beredskap" value={readinessScore} />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-foreground/55">
        Mätning sker mot Eurostack-standard (DORA, NIS2, GDPR, Data Act, EU-suveränitet).
        All insamlad data kan användas för att generera en rekommendationsrapport.
      </p>
    </Card>
  );
};

/* =========================================================================
   SHARED UI PRIMITIVES
   ========================================================================= */
const Card = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-3xl bg-white/55 p-6 ring-1 ring-white/60 backdrop-blur-xl shadow-[var(--shadow-deep)] md:p-8">
    <header className="mb-6">
      <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-sm font-medium text-foreground/60">{subtitle}</p>
      )}
    </header>
    {children}
  </section>
);

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div>
    <Label className="text-sm font-semibold text-foreground">{label}</Label>
    {hint && <p className="mb-2 mt-1 text-xs text-foreground/55">{hint}</p>}
    <div className={hint ? "" : "mt-2"}>{children}</div>
  </div>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-white/60 p-3 ring-1 ring-white/70">
    <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
      {label}
    </p>
    <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
  </div>
);

const Contribution = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg bg-white/70 px-3 py-2 ring-1 ring-white/60">
    <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">
      {label}
    </p>
    <p className="mt-0.5 text-sm font-bold text-foreground">{Math.round(value)}</p>
  </div>
);

export default Quiz;
