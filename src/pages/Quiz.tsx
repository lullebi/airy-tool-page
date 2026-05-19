import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, ShieldAlert, ChevronDown, Download, Repeat, ShieldCheck, Inbox, Sparkles, Database, Network, Lock, FileText, Info } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const QUESTION_HELP: Record<string, string> = {
  qs_sensitive_data: "Känslig data omfattar personuppgifter, finansiell, hälso- eller affärskritisk information som skyddas av GDPR eller branschregler.",
  qs_certifications: "ISO 27001 (informationssäkerhet), SOC 2 (driftkontroller) och C5 (tysk molnsäkerhet) bekräftar att leverantören följer erkända säkerhetsstandarder.",
  qs_business_critical: "En affärskritisk leverantör är en vars avbrott direkt skulle stoppa eller skada er verksamhet.",
  qs_legal_agreements: "DPA = Data Processing Agreement (GDPR-krav vid personuppgifter). SLA = Service Level Agreement som reglerar drift, support och svarstider.",
  dd_sec_encryption: "Kryptering i vila skyddar lagrad data; kryptering under transport skyddar data som rör sig mellan system.",
  dd_sec_access: "MFA = flerfaktorsautentisering. Rollbaserad åtkomst säkerställer att användare endast ser det deras roll kräver.",
  dd_sec_keys: "BYOK/HYOK innebär att ni själva äger och kontrollerar krypteringsnycklarna, inte leverantören.",
  dd_sec_zero: "Zero-trust innebär att inget förlitas på som standard – varje åtkomst verifieras kontinuerligt.",
  dd_inc_plan: "En incidenthanteringsplan beskriver hur leverantören upptäcker, hanterar och kommunicerar säkerhetsincidenter.",
  dd_inc_sla: "SLA för incidenter anger garanterad svarstid vid säkerhetshändelser – avgörande för affärskritiska tjänster.",
  dd_inc_notif: "GDPR kräver att personuppgiftsincidenter rapporteras till tillsynsmyndighet inom 72 timmar.",
  dd_loc_eu: "EU/EES-lagring säkerställer att data omfattas av europeisk lagstiftning och inte av tredjelandsregler som US CLOUD Act.",
  dd_loc_transfer: "Överföring till tredje land (utanför EU/EES) kräver särskilda skyddsåtgärder enligt GDPR.",
  dd_loc_scc: "SCC = Standard Contractual Clauses, EU-kommissionens godkända avtalsmallar för laglig dataöverföring utanför EU.",
  dd_loc_residency: "Data residency innebär att data garanterat stannar i ett valt geografiskt område.",
  dd_own_hq: "Huvudkontorets jurisdiktion avgör vilka lagar leverantören måste följa, oavsett var data lagras.",
  dd_own_cloud_act: "US CLOUD Act tillåter amerikanska myndigheter att begära ut data från amerikanska leverantörer även om data lagras i EU.",
  dd_own_gdpr: "GDPR-compliance innebär att leverantören uppfyller alla krav i EU:s dataskyddsförordning.",
  dd_own_dora: "DORA (digital motståndskraft i finanssektorn) och NIS2 (cybersäkerhet för kritiska sektorer) är EU-regelverk med särskilda leverantörskrav.",
};

const QuestionHelp = ({ id }: { id: string }) => {
  const text = QUESTION_HELP[id];
  if (!text) return null;
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Mer information"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-foreground/40 transition hover:bg-white hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs rounded-lg bg-foreground px-3 py-2 text-xs font-medium leading-relaxed text-background shadow-lg">
        {text}
      </TooltipContent>
    </Tooltip>
  );
};

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
  { label: "Efterlevnad", scoreValue: 100 },
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

const STEP1_READINESS: (Option & { description: string })[] = [
  {
    label: "Mycket låg",
    scoreValue: 0,
    description: "Vi har inga reservrutiner; verksamheten stannar helt upp.",
  },
  {
    label: "Låg",
    scoreValue: 33,
    description:
      "Vi har en viss beredskap, men drabbas av stora och omedelbara verksamhetsstörningar.",
  },
  {
    label: "God",
    scoreValue: 66,
    description:
      "Vi har manuella rutiner eller alternativa arbetssätt som gör att vi klarar oss under en begränsad tid.",
  },
  {
    label: "Mycket god",
    scoreValue: 100,
    description:
      "Vi har redundans (reservsystem) och en testad kontinuitetsplan; verksamheten påverkas minimalt.",
  },
];

const QUICK_SCAN: Question[] = [
  {
    id: "qs_sensitive_data",
    kategori: "Snabbanalys",
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
    kategori: "Snabbanalys",
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
    kategori: "Snabbanalys",
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
    kategori: "Snabbanalys",
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
  { id: "dd_sec_encryption", kategori: "Säkerhetsnivå", text: "Krypteras data både i vila och under transport?", viktning: 0.2, type: "single", svarsalternativ: [{label:"Ja, alltid",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_sec_access", kategori: "Säkerhetsnivå", text: "Används MFA och rollbaserad åtkomst?", viktning: 0.18, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_sec_audit", kategori: "Säkerhetsnivå", text: "Genomförs regelbundna säkerhetsrevisioner?", viktning: 0.16, type: "single", svarsalternativ: [{label:"Årligen",scoreValue:100},{label:"Sällan",scoreValue:50},{label:"Aldrig",scoreValue:0}] },
  { id: "dd_sec_pen", kategori: "Säkerhetsnivå", text: "Genomförs penetrationstester av tredje part?", viktning: 0.14, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Vet ej",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_sec_keys", kategori: "Säkerhetsnivå", text: "Kontrollerar ni krypteringsnycklarna (BYOK/HYOK)?", viktning: 0.16, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_sec_zero", kategori: "Säkerhetsnivå", text: "Tillämpar leverantören zero-trust-arkitektur?", viktning: 0.16, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },

  // Incident Management
  { id: "dd_inc_plan", kategori: "Incidenthantering", text: "Finns en dokumenterad incidenthanteringsplan?", viktning: 0.22, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_inc_sla", kategori: "Incidenthantering", text: "Finns SLA för svarstid vid säkerhetsincidenter?", viktning: 0.2, type: "single", svarsalternativ: [{label:"< 4h",scoreValue:100},{label:"< 24h",scoreValue:60},{label:"Ingen SLA",scoreValue:0}] },
  { id: "dd_inc_notif", kategori: "Incidenthantering", text: "Notifieras kund inom 72h vid databreach?", viktning: 0.2, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Vet ej",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_inc_drills", kategori: "Incidenthantering", text: "Genomförs regelbundna incidentövningar?", viktning: 0.18, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Sällan",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_inc_log", kategori: "Incidenthantering", text: "Finns fullständiga loggar tillgängliga för forensik?", viktning: 0.2, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },

  // Data Location / Jurisdiction
  { id: "dd_loc_eu", kategori: "Datalagring och jurisdiktion", text: "Lagras all data inom EU/EES?", viktning: 0.25, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:40},{label:"Nej",scoreValue:0}] },
  { id: "dd_loc_transfer", kategori: "Datalagring och jurisdiktion", text: "Sker dataöverföring till tredje land?", viktning: 0.2, type: "single", svarsalternativ: [{label:"Aldrig",scoreValue:100},{label:"Sällan",scoreValue:50},{label:"Ofta",scoreValue:0}] },
  { id: "dd_loc_scc", kategori: "Datalagring och jurisdiktion", text: "Används SCC eller godkända överföringsmekanismer?", viktning: 0.18, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Vet ej",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_loc_residency", kategori: "Datalagring och jurisdiktion", text: "Garanterar leverantören data residency på begäran?", viktning: 0.17, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_loc_sub", kategori: "Datalagring och jurisdiktion", text: "Är alla underleverantörer EU-baserade?", viktning: 0.2, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },

  // Ownership / Lagar & Regelverk
  { id: "dd_own_hq", kategori: "Ägarskap och regelverk", text: "Har leverantören huvudkontor i EU?", viktning: 0.22, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Nej",scoreValue:0}] },
  { id: "dd_own_cloud_act", kategori: "Ägarskap och regelverk", text: "Omfattas leverantören av US CLOUD Act eller liknande?", viktning: 0.22, type: "single", svarsalternativ: [{label:"Nej",scoreValue:100},{label:"Vet ej",scoreValue:50},{label:"Ja",scoreValue:0}] },
  { id: "dd_own_owner", kategori: "Ägarskap och regelverk", text: "Är ägarstrukturen transparent och EU-kontrollerad?", viktning: 0.2, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_own_gdpr", kategori: "Ägarskap och regelverk", text: "Är leverantören fullt GDPR-compliant?", viktning: 0.18, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_own_dora", kategori: "Ägarskap och regelverk", text: "Möter leverantören DORA / NIS2-krav där tillämpligt?", viktning: 0.18, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
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

const STEPS = ["Konfiguration", "Snabbanalys", "Fördjupad analys", "Resultat", "Mätning"] as const;

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
  const [completionOpen, setCompletionOpen] = useState(false);
  const navigate = useNavigate();
  const [step1, setStep1] = useState<Step1State>({
    priorities: [],
    sector: "",
    euDataWeight: 3,
    readiness: "God",
  });
  const [quickAnswers, setQuickAnswers] = useState<Answers>({});
  // Per-vendor deep dive answers, keyed by vendor id.
  const [deepAnswersByVendor, setDeepAnswersByVendor] = useState<Record<string, Answers>>({});
  // Fördjupad analys aktiveras för leverantörer där dataset saknar info.
  // Här simulerat — användaren kan toggla.
  const [deepDiveEnabled, setDeepDiveEnabled] = useState(true);
  // Index för vilken leverantör i Fördjupad analys-loopen som granskas just nu.
  const [deepVendorIndex, setDeepVendorIndex] = useState(0);

  // Vendors that get a deep dive (when enabled, all of them — kan filtreras vid datasetkoppling)
  const deepVendors = deepDiveEnabled ? vendors : [];
  const currentDeepVendor = deepVendors[deepVendorIndex];

  // Skip Security Level cert-related deep dive questions if Snabbanalys said "Ja" on certifications.
  const skipCerts = quickAnswers["qs_certifications"] === "Ja";
  const SKIPPED_DEEP_IDS = new Set(skipCerts ? ["dd_sec_audit", "dd_sec_pen"] : []);
  const activeDeepQuestions = useMemo(
    () => DEEP_DIVE.filter((q) => !SKIPPED_DEEP_IDS.has(q.id)),
    [skipCerts],
  );

  const currentDeepAnswers = currentDeepVendor
    ? deepAnswersByVendor[currentDeepVendor.id] ?? {}
    : {};
  const setCurrentDeepAnswers: React.Dispatch<React.SetStateAction<Answers>> = (updater) => {
    if (!currentDeepVendor) return;
    setDeepAnswersByVendor((prev) => {
      const existing = prev[currentDeepVendor.id] ?? {};
      const next = typeof updater === "function" ? (updater as (a: Answers) => Answers)(existing) : updater;
      return { ...prev, [currentDeepVendor.id]: next };
    });
  };

  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const canNext = useMemo(() => {
    if (stepIndex === 0)
      return step1.priorities.length > 0 && step1.sector !== "" && step1.readiness !== "";
    if (stepIndex === 1) return QUICK_SCAN.every((q) => quickAnswers[q.id]);
    if (stepIndex === 2) {
      if (!deepDiveEnabled || deepVendors.length === 0) return true;
      return activeDeepQuestions.every((q) => currentDeepAnswers[q.id]);
    }
    return true;
  }, [stepIndex, step1, quickAnswers, currentDeepAnswers, deepDiveEnabled, deepVendors.length, activeDeepQuestions]);

  const goNext = () => {
    // Loop through vendors inside the Fördjupad analys step.
    if (stepIndex === 2 && deepDiveEnabled && deepVendors.length > 0) {
      const isLast = deepVendorIndex >= deepVendors.length - 1;
      const name = currentDeepVendor?.name ?? "leverantör";
      if (!isLast) {
        toast.success(`Data sparad för ${name}`, { description: "Går vidare till nästa..." });
        setDeepVendorIndex((i) => i + 1);
        return;
      }
      toast.success(`Data sparad för ${name}`, { description: "Går vidare till Resultat" });
    }
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  };
  const goBack = () => {
    if (stepIndex === 2 && deepDiveEnabled && deepVendorIndex > 0) {
      setDeepVendorIndex((i) => i - 1);
      return;
    }
    setStepIndex((i) => Math.max(0, i - 1));
  };

  // Dev/testing shortcut: pre-fill all answers with mock values and jump to result.
  const skipToResult = () => {
    setStep1({
      priorities: ["Säkerhet", "Efterlevnad"],
      sector: "Finans",
      euDataWeight: 4,
      readiness: "God",
    });
    const mockQuick: Answers = {};
    QUICK_SCAN.forEach((q) => {
      mockQuick[q.id] = q.svarsalternativ[0].label;
    });
    setQuickAnswers(mockQuick);
    const mockDeep: Answers = {};
    DEEP_DIVE.forEach((q) => {
      mockDeep[q.id] = q.svarsalternativ[0].label;
    });
    const allDeep: Record<string, Answers> = {};
    vendors.forEach((v) => { allDeep[v.id] = { ...mockDeep }; });
    setDeepAnswersByVendor(allDeep);
    setDeepDiveEnabled(true);
    setDeepVendorIndex(0);
    setStepIndex(3);
  };

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
              title="Snabbanalys"
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
              vendor={currentDeepVendor}
              vendorIndex={deepVendorIndex}
              vendorTotal={deepVendors.length}
              answers={currentDeepAnswers}
              setAnswers={setCurrentDeepAnswers}
              activeQuestions={activeDeepQuestions}
              skippedCertNotice={skipCerts}
              onPrevVendor={() => setDeepVendorIndex((i) => Math.max(0, i - 1))}
              canPrevVendor={deepVendorIndex > 0}
            />
          )}
          {stepIndex === 3 && (
            <Step4Result
              vendors={vendors}
              step1={step1}
              quick={quickAnswers}
              deepByVendor={deepAnswersByVendor}
              hasDeep={deepDiveEnabled}
            />
          )}
          {stepIndex === 4 && (
            <Step5Measurement
              vendors={vendors}
              step1={step1}
              quick={quickAnswers}
              deepByVendor={deepAnswersByVendor}
              hasDeep={deepDiveEnabled}
            />
          )}
        </div>

        {/* NAV */}
        <div className="mt-10 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => (stepIndex === 0 ? navigate("/registrera-leverantorer") : goBack())}
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
              {stepIndex === 2 && deepDiveEnabled && deepVendors.length > 1 && deepVendorIndex < deepVendors.length - 1
                ? "Nästa"
                : ["Gå till snabbanalys", "Gå till fördjupad analys", "Gå till resultat", "Gå till mätning"][stepIndex]}
              <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-1" />
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={() => setCompletionOpen(true)}
              className="group rounded-xl px-7 py-6 text-base font-bold text-white shadow-[var(--shadow-glow)] hover:opacity-95"
              style={{ background: "var(--gradient-cta)" }}
            >
              Klar
            </Button>
          )}
        </div>
      </main>

      <Dialog open={completionOpen} onOpenChange={setCompletionOpen}>
        <DialogContent className="rounded-2xl shadow-xl sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">Analysen är slutförd</DialogTitle>
            <DialogDescription className="text-center">
              Riskbedömningen har sammanställts och leverantörsanalysen är nu klar. Resultatet kan användas som beslutsunderlag för vidare utvärdering.
            </DialogDescription>
          </DialogHeader>
          <p className="text-center text-xs text-muted-foreground">
            Tack för att ni använder Eurostack.
          </p>
          <DialogFooter className="mt-2 gap-2 sm:justify-center">
            <Button
              variant="outline"
              onClick={() => setCompletionOpen(false)}
              className="rounded-xl"
            >
              Stäng
            </Button>
            <Button
              onClick={() => { setCompletionOpen(false); navigate("/"); }}
              className="rounded-xl text-white"
              style={{ background: "var(--gradient-cta)" }}
            >
              Till startsidan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dev shortcut — testing only */}
      <button
        type="button"
        onClick={skipToResult}
        title="Dev: hoppa till resultat med mock-data"
        className="fixed bottom-2 right-2 z-30 rounded-md bg-foreground/5 px-2 py-1 text-[10px] font-medium text-foreground/40 opacity-40 ring-1 ring-foreground/10 backdrop-blur transition hover:opacity-100 hover:text-foreground/80"
      >
        Hoppa till resultat
      </button>

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
      <Field label="Hur bedömer ni er förmåga att upprätthålla verksamheten vid ett plötsligt avbrott i leverantörens tjänster?">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {STEP1_READINESS.map((r) => {
            const active = state.readiness === r.label;
            return (
              <button
                key={r.label}
                type="button"
                onClick={() => setState((s) => ({ ...s, readiness: r.label }))}
                className={`rounded-xl px-4 py-3 text-left transition ring-1 ${
                  active
                    ? "bg-foreground text-background ring-foreground"
                    : "bg-white/70 text-foreground/80 ring-white/70 hover:bg-white"
                }`}
              >
                <div className="text-base font-semibold">{r.label}</div>
                <div className={`mt-1 text-xs ${active ? "text-background/80" : "text-foreground/60"}`}>
                  {r.description}
                </div>
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
          <p className="mt-1 inline-flex items-center gap-1.5 text-base font-semibold text-foreground">{q.text}<QuestionHelp id={q.id} /></p>
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
   STEP 3 — Fördjupad analys (kategoriserad)
   ========================================================================= */
const Step3DeepDive = ({
  enabled,
  setEnabled,
  vendor,
  vendorIndex,
  vendorTotal,
  answers,
  setAnswers,
  activeQuestions,
  skippedCertNotice,
  onPrevVendor,
  canPrevVendor,
}: {
  enabled: boolean;
  setEnabled: (b: boolean) => void;
  vendor?: VendorLike;
  vendorIndex: number;
  vendorTotal: number;
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
  activeQuestions: Question[];
  skippedCertNotice: boolean;
  onPrevVendor: () => void;
  canPrevVendor: boolean;
}) => {
  const categories = useMemo(() => {
    const map = new Map<string, Question[]>();
    activeQuestions.forEach((q) => {
      map.set(q.kategori, [...(map.get(q.kategori) ?? []), q]);
    });
    return Array.from(map.entries());
  }, [activeQuestions]);

  return (
    <Card
      title="Fördjupad analys"
      subtitle={
        enabled && vendor
          ? `Nu granskar vi säkerhet och jurisdiktion för ${vendor.name}`
          : "Aktiveras för leverantörer där datasetet saknar information. Detaljerad granskning per leverantör."
      }
    >

      {!enabled ? (
        <p className="rounded-xl bg-white/60 p-5 text-sm text-foreground/70 ring-1 ring-white/70">
          Fördjupad analys är inaktiverad. Snabbanalys-resultatet används direkt i analysen.
        </p>
      ) : vendor ? (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 p-4 ring-1 ring-white/70">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-foreground px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-background">
                {vendor.name}
              </span>
              <span className="text-xs font-medium text-foreground/60">
                Leverantör {vendorIndex + 1} av {vendorTotal} · {vendor.type ?? "—"} · {vendor.country ?? "—"}
              </span>
            </div>
            {canPrevVendor && (
              <button
                type="button"
                onClick={onPrevVendor}
                className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-3 py-1.5 text-xs font-semibold text-foreground/80 ring-1 ring-white/70 transition hover:bg-white"
              >
                <ArrowLeft className="h-3 w-3" /> Föregående leverantör
              </button>
            )}
          </div>

          {skippedCertNotice && (
            <p className="mb-4 rounded-xl bg-emerald-50/80 px-4 py-2 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
              Certifieringsfrågor hoppas över eftersom Snabbanalys bekräftade befintliga certifieringar.
            </p>
          )}

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
                      <p className="mt-1 inline-flex items-center gap-1.5 text-base font-semibold text-foreground">
                        {q.text}
                        <QuestionHelp id={q.id} />
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
        </>
      ) : (
        <p className="rounded-xl bg-white/60 p-5 text-sm text-foreground/70 ring-1 ring-white/70">
          Inga leverantörer att granska.
        </p>
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
  deepByVendor,
  hasDeep,
}: {
  vendors: VendorLike[];
  step1: Step1State;
  quick: Answers;
  deepByVendor: Record<string, Answers>;
  hasDeep: boolean;
}) => {
  const scores = vendors.map((v) => ({
    vendor: v,
    ...computeVendorScore(step1, quick, deepByVendor[v.id] ?? {}, hasDeep),
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
                <Contribution label="Snabbanalys" value={quickScore} />
                <Contribution label="Fördjupad analys" value={deepScore} />
                <Contribution label="EU-vikt" value={euWeight} />
                <Contribution label="Beredskap" value={readinessScore} />
              </div>

              {(() => {
                const contribs = [
                  { key: "quick", value: quickScore, reg: "Data Act", Icon: FileText },
                  { key: "deep", value: deepScore, reg: "DORA", Icon: ShieldCheck },
                  { key: "eu", value: euWeight, reg: "GDPR & EU-suveränitet", Icon: Lock },
                  { key: "readiness", value: readinessScore, reg: "NIS2", Icon: Network },
                ];
                const weakest = contribs.reduce((a, b) => (a.value <= b.value ? a : b));
                const WeakIcon = weakest.Icon;
                return (
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200">
                    <WeakIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                    <p className="text-xs font-medium text-amber-900">
                      Poängen påverkas främst av brister i enlighet med{" "}
                      <span className="font-bold underline decoration-amber-600 decoration-2 underline-offset-2">
                        {weakest.reg}
                      </span>
                      .
                    </p>
                  </div>
                );
              })()}
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

const Contribution = ({ label, value }: { label: string; value: number }) => {
  const tone =
    value >= 70
      ? { dot: "bg-emerald-500", text: "text-emerald-700" }
      : value >= 40
        ? { dot: "bg-amber-500", text: "text-amber-700" }
        : { dot: "bg-rose-500", text: "text-rose-700" };
  return (
    <div className="rounded-lg bg-white/70 px-3 py-2 ring-1 ring-white/60">
      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">
        {label}
      </p>
      <p className={`mt-0.5 flex items-center gap-1.5 text-sm font-bold ${tone.text}`}>
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
        {Math.round(value)}
      </p>
    </div>
  );
};




/* =========================================================================
   STEP 5 — Measurement / Mätningssida
   ========================================================================= */

type ScoreBadge = { key: string; label: string; value: number; evidence: string };

const buildBadges = (quick: Answers, deep: Answers, hasDeep: boolean): ScoreBadge[] => {
  const findQ = (id: string) => [...QUICK_SCAN, ...DEEP_DIVE].find((q) => q.id === id);
  const ans = (id: string) => (id in quick ? quick[id] : deep[id]) ?? "—";
  const score = (id: string) => {
    const q = findQ(id);
    if (!q) return 0;
    const a = id in quick ? quick : deep;
    return scoreFor(q, a);
  };

  const base: ScoreBadge[] = [
    {
      key: "data_residency",
      label: "Datalagring",
      value: hasDeep ? score("dd_loc_eu") : score("qs_sensitive_data"),
      evidence: hasDeep
        ? `Mätt mot: "${findQ("dd_loc_eu")?.text}" → ${ans("dd_loc_eu")}`
        : `Mätt mot: "${findQ("qs_sensitive_data")?.text}" → ${ans("qs_sensitive_data")}`,
    },
    {
      key: "nis2",
      label: "NIS2-beredskap",
      value: hasDeep ? score("dd_inc_plan") : score("qs_business_critical"),
      evidence: hasDeep
        ? `Mätt mot: "${findQ("dd_inc_plan")?.text}" → ${ans("dd_inc_plan")}`
        : `Mätt mot: "${findQ("qs_business_critical")?.text}" → ${ans("qs_business_critical")}`,
    },
    {
      key: "dora",
      label: "DORA-motståndskraft",
      value: hasDeep ? score("dd_own_dora") : score("qs_legal_agreements"),
      evidence: hasDeep
        ? `Mätt mot: "${findQ("dd_own_dora")?.text}" → ${ans("dd_own_dora")}`
        : `Mätt mot: "${findQ("qs_legal_agreements")?.text}" → ${ans("qs_legal_agreements")}`,
    },
    {
      key: "gdpr",
      label: "GDPR-garanti",
      value: hasDeep ? score("dd_own_gdpr") : score("qs_certifications"),
      evidence: hasDeep
        ? `Mätt mot: "${findQ("dd_own_gdpr")?.text}" → ${ans("dd_own_gdpr")}`
        : `Mätt mot: "${findQ("qs_certifications")?.text}" → ${ans("qs_certifications")}`,
    },
  ];
  return base;
};

const Step5Measurement = ({
  vendors,
  step1,
  quick,
  deepByVendor,
  hasDeep,
}: {
  vendors: VendorLike[];
  step1: Step1State;
  quick: Answers;
  deepByVendor: Record<string, Answers>;
  hasDeep: boolean;
}) => {
  const deepFor = (v: VendorLike) => deepByVendor[v.id] ?? {};
  const [openId, setOpenId] = useState<string | null>(null);
  const [scoreBreakdownOpen, setScoreBreakdownOpen] = useState(false);

  const vendorScores = vendors.map((v) => computeVendorScore(step1, quick, deepFor(v), hasDeep));
  const avg = (key: "quickScore" | "deepScore" | "euWeight" | "readinessScore" | "total") =>
    vendorScores.length
      ? Math.round(vendorScores.reduce((a, s) => a + (s[key] as number), 0) / vendorScores.length)
      : 0;
  const aggQuick = avg("quickScore");
  const aggDeep = avg("deepScore");
  const aggEu = avg("euWeight");
  const aggReadiness = avg("readinessScore");
  const aggTotal = avg("total");

  const euCount = vendors.filter(isEU).length;
  const nonEuCount = vendors.length - euCount;
  const total = vendors.length || 1;
  const euPct = Math.round((euCount / total) * 100);
  const nonEuPct = 100 - euPct;

  // Donut math
  const r = 54;
  const c = 2 * Math.PI * r;
  const euDash = (euPct / 100) * c;

  const complianceText =
    euPct >= 70
      ? "Hög EU-andel – stark suveränitetsstatus."
      : euPct >= 40
        ? "Blandad portfölj – delvis EU-suverän."
        : "Hög exponering mot icke-EU – ersättning rekommenderas.";

  // Lane B = vendors that received a deep-dive analysis
  const laneB = hasDeep ? vendors : [];
  const laneA = hasDeep ? [] : vendors;
  // Simple split: if hasDeep, treat non-EU as deep-dive (nischade), EU as general
  const nischade = hasDeep ? vendors.filter((v) => !isEU(v)) : laneB;
  const kanda = hasDeep ? vendors.filter(isEU) : laneA.length ? laneA : vendors;

  const handleExport = async () => {
    toast("Genererar högupplöst rapport...", {
      description: "Eurostack-analys förbereds för nedladdning.",
    });
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 48;
      let y = margin;

      const perVendorTotals = vendors.map((v) => computeVendorScore(step1, quick, deepFor(v), hasDeep).total);
      const total = perVendorTotals.length ? Math.round(perVendorTotals.reduce((a, b) => a + b, 0) / perVendorTotals.length) : 0;
      const euCount = vendors.filter(isEU).length;
      const nonEuCount = vendors.length - euCount;
      const euPct = vendors.length ? Math.round((euCount / vendors.length) * 100) : 0;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("Eurostack — Fullständig analys", margin, y);
      y += 26;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(110);
      doc.text(
        `Genererad ${new Date().toLocaleDateString("sv-SE")} • ${vendors.length} leverantörer`,
        margin,
        y,
      );
      y += 24;

      doc.setTextColor(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Sammanfattning", margin, y);
      y += 18;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Total Eurostack-score: ${total}/100`, margin, y); y += 16;
      doc.text(`EU-leverantörer: ${euCount} (${euPct}%)`, margin, y); y += 16;
      doc.text(`Icke-EU-leverantörer: ${nonEuCount} (${100 - euPct}%)`, margin, y); y += 16;
      doc.text(`Sektor: ${step1.sector || "–"}`, margin, y); y += 16;
      doc.text(`Prioriteringar: ${step1.priorities.join(", ") || "–"}`, margin, y); y += 24;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Leverantörer", margin, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      vendors.forEach((v, i) => {
        if (y > pageH - margin - 60) {
          doc.addPage();
          y = margin;
        }
        const eu = isEU(v);
        const status = statusFromScore(total);
        doc.setFont("helvetica", "bold");
        doc.text(`${i + 1}. ${v.name}`, margin, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(110);
        doc.text(
          `${v.type ?? "–"} • ${v.country ?? "–"} • ${eu ? "EU" : "Icke-EU"} • Status: ${status.label}`,
          margin,
          y + 14,
        );
        if (!eu) {
          const alt = EU_ALTERNATIVES[v.name] ?? defaultAlternative;
          doc.setTextColor(20);
          doc.text(`EU-alternativ: ${alt.name} (${alt.country})`, margin, y + 28);
          y += 44;
        } else {
          y += 30;
        }
        doc.setTextColor(20);
      });

      doc.setFontSize(9);
      doc.setTextColor(140);
      doc.text("© 2026 Lumen Analytics AB — Eurostack Quiz", margin, pageH - 24);

      const filename = `eurostack-rapport-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);

      toast.success("Rapport klar", {
        description: "Din PDF-rapport har laddats ned.",
      });
    } catch (err) {
      toast.error("Kunde inte generera rapport", {
        description: err instanceof Error ? err.message : "Okänt fel",
      });
    }
  };

  const renderCard = (v: VendorLike) => {
    const eu = isEU(v);
    const deep = deepFor(v);
    const { total: tot } = computeVendorScore(step1, quick, deep, hasDeep);
    const status = statusFromScore(tot);
    const badges = buildBadges(quick, deep, hasDeep);
    const isOpen = openId === v.id;
    const alt = EU_ALTERNATIVES[v.name] ?? defaultAlternative;

    return (
      <div
        key={v.id}
        className={`min-w-[280px] flex-shrink-0 rounded-2xl bg-white/75 p-4 ring-1 transition ${
          eu ? "ring-emerald-200" : "ring-rose-200"
        }`}
      >
        <button
          type="button"
          onClick={() => !eu && setOpenId(isOpen ? null : v.id)}
          className="w-full text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-foreground">{v.name}</p>
              <p className="text-[11px] font-medium text-foreground/60">
                {v.type ?? "—"} · {v.country ?? "—"}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                eu
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              {eu ? "EU" : "Icke-EU"}
            </span>
          </div>

          <div className="mt-3 rounded-lg bg-white/80 px-2.5 py-2 ring-1 ring-white/70">
            <p className="text-[9px] font-bold uppercase tracking-wider text-foreground/55">
              Riskprofil
            </p>
            <div className="mt-1.5 space-y-1.5">
              <div className="flex items-start gap-1.5">
                <AlertTriangle
                  className={`mt-0.5 h-3 w-3 flex-shrink-0 ${eu ? "text-emerald-600" : "text-rose-600"}`}
                />
                <p className="text-[11px] font-medium text-foreground/75">
                  <span className="font-bold text-foreground/80">Compliance-risk: </span>
                  <span className={eu ? "font-bold text-emerald-600" : "font-bold text-rose-600"}>
                    {eu ? "Låg risk" : "Hög risk"}
                  </span>
                  <span className="text-foreground/65">
                    {eu
                      ? " – Jurisdiktion inom EU."
                      : " – Jurisdiktion utanför EU (exponering mot CLOUD Act)."}
                  </span>
                </p>
              </div>
              <div className="flex items-start gap-1.5">
                <ShieldCheck
                  className={`mt-0.5 h-3 w-3 flex-shrink-0 ${
                    status.tone === "ok"
                      ? "text-emerald-600"
                      : status.tone === "warn"
                        ? "text-amber-600"
                        : "text-rose-600"
                  }`}
                />
                <p className="text-[11px] font-medium text-foreground/75">
                  <span className="font-bold text-foreground/80">Säkerhetsrisk: </span>
                  <span
                    className={`font-bold ${
                      status.tone === "ok"
                        ? "text-emerald-600"
                        : status.tone === "warn"
                          ? "text-amber-600"
                          : "text-rose-600"
                    }`}
                  >
                    {status.tone === "ok" ? "Låg risk" : status.tone === "warn" ? "Medel risk" : "Hög risk"}
                  </span>
                  <span className="text-foreground/65">
                    {status.tone === "ok"
                      ? " – Hög teknisk motståndskraft och regulatorisk beredskap (NIS2/DORA)."
                      : status.tone === "warn"
                        ? " – Acceptabel teknisk motståndskraft, vissa förbättringsområden."
                        : " – Bristande teknisk motståndskraft, åtgärder rekommenderas."}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {badges.map((b) => {
              const BadgeIcon =
                b.key === "datalagring"
                  ? Database
                  : b.key === "nis2"
                    ? Network
                    : b.key === "dora"
                      ? ShieldCheck
                      : Lock;
              return (
                <div
                  key={b.key}
                  title={b.evidence}
                  className="rounded-lg bg-white/80 px-2 py-1.5 ring-1 ring-white/70"
                >
                  <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-foreground/55">
                    <BadgeIcon className="h-3 w-3 text-blue-500" aria-hidden="true" />
                    {b.label}
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-foreground">{b.value}</p>
                </div>
              );
            })}
          </div>

          {!eu && (
            <div className="mt-3 flex justify-end">
              <ChevronDown
                className={`h-4 w-4 text-foreground/60 transition ${isOpen ? "rotate-180" : ""}`}
              />
            </div>
          )}
        </button>

        {!eu && isOpen && (
          <div className="mt-4 rounded-xl bg-rose-50/70 p-3 ring-1 ring-rose-200/70 animate-in fade-in slide-in-from-top-1 duration-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
              Riskanalys
            </p>
            <ul className="mt-1 space-y-1 text-[11px] font-medium text-foreground/75">
              {badges
                .filter((b) => b.value < 70)
                .map((b) => (
                  <li key={b.key}>
                    • <span className="font-semibold">{b.label}:</span> {b.evidence}
                  </li>
                ))}
              <li>• Jurisdiktion utanför EU – ev. CLOUD Act-exponering.</li>
            </ul>

            <div className="mt-3 rounded-lg bg-white/80 p-3 ring-1 ring-white/70">
              <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
                Matchande EU-alternativ
              </p>
              <p className="mt-0.5 text-sm font-bold text-foreground">{alt.name}</p>
              <p className="text-[11px] font-medium text-foreground/65">{alt.country}</p>
              <p className="mt-1 text-[11px] text-foreground/70">{alt.reason}</p>
              <Button
                onClick={() =>
                  toast.success(`${v.name} markerad för ersättning`, {
                    description: `Simulerad swap till ${alt.name}.`,
                  })
                }
                className="mt-3 h-8 w-full rounded-lg text-[11px] font-bold text-white"
                style={{ background: "var(--gradient-cta)" }}
              >
                <Repeat className="mr-1 h-3 w-3" />
                Ersätt med detta alternativ
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card
      title="Fullständig analys"
      subtitle="Översikt av era leverantörer mätt mot Eurostack-standard."
    >
      {/* HEADER: Donut + summary */}
      <div className="mb-8 flex flex-col items-center gap-6 rounded-2xl bg-white/60 p-5 ring-1 ring-white/70 md:flex-row md:items-center md:gap-8">
        <button
          type="button"
          onClick={() => setScoreBreakdownOpen(true)}
          aria-label="Visa poängberäkning"
          className="relative h-36 w-36 flex-shrink-0 rounded-full transition hover:shadow-[0_0_0_6px_hsl(var(--primary)/0.12)] hover:ring-2 hover:ring-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
        >
          <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
            <circle cx="70" cy="70" r={r} fill="none" stroke="hsl(0 80% 60%)" strokeWidth="16" />
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke="hsl(150 65% 45%)"
              strokeWidth="16"
              strokeDasharray={`${euDash} ${c}`}
              strokeLinecap="butt"
            />
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground">{euPct}%</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/60">
              EU
            </span>
          </div>
        </button>


        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/55">
            Efterlevnadsstatus
          </p>
          <p className="mt-1 text-lg font-bold text-foreground">{complianceText}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-foreground/70">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              EU: {euCount} ({euPct}%)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              Icke-EU: {nonEuCount} ({nonEuPct}%)
            </span>
          </div>
        </div>
      </div>

      {/* SWIMLANE A */}
      <div className="mb-6">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-bold text-foreground">
            Kända leverantörer <span className="text-foreground/50">· Generellt</span>
          </h3>
          <span className="text-[11px] font-medium text-foreground/55">
            Snabbanalys tillämpad
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-3">
          {kanda.length > 0 ? (
            kanda.map(renderCard)
          ) : (
            <div className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-foreground/20 bg-white/50 px-4 py-8 text-center">
              <Inbox className="h-6 w-6 text-foreground/40" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground/70">
                Inga kända leverantörer ännu
              </p>
              <p className="text-xs text-foreground/55">
                Lägg till leverantörer från snabbvalet för att se dem här.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SWIMLANE B */}
      <div className="mb-6">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-bold text-foreground">
            Nischade leverantörer <span className="text-foreground/50">· Djupanalys</span>
          </h3>
          <span className="text-[11px] font-medium text-foreground/55">
            Detaljerad teknisk analys
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-3">
          {nischade.length > 0 ? (
            nischade.map(renderCard)
          ) : (
            <p className="text-xs text-foreground/55">
              Inga leverantörer har genomgått deep-dive ännu.
            </p>
          )}
        </div>
      </div>

      {/* Sticky Actions */}
      <div className="sticky bottom-4 mt-4 flex flex-col items-center gap-2">
        <Button
          onClick={() =>
            navigate("/atgardsplan", {
              state: { vendors, step1, quick, deepByVendor, hasDeep },
            })
          }
          size="lg"
          className="group w-full max-w-md rounded-xl px-7 py-6 text-base font-bold text-white shadow-[var(--shadow-glow)] hover:opacity-95"
          style={{ background: "var(--gradient-cta)" }}
        >
          <Sparkles className="mr-2 h-5 w-5" />
          Se åtgärdsplan
        </Button>
        <Button
          onClick={handleExport}
          size="sm"
          variant="outline"
          className="w-full max-w-md rounded-xl border-primary/30 text-primary hover:bg-primary/5"
        >
          <Download className="mr-2 h-4 w-4" />
          Exportera rapport
        </Button>
      </div>

      <Dialog open={scoreBreakdownOpen} onOpenChange={setScoreBreakdownOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Så räknades poängen fram</DialogTitle>
            <DialogDescription>
              Poängen baseras på svaren i quizet och vägs samman utifrån klientens prioriteringar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {[
              { label: "Snabbanalys", value: aggQuick, weight: "35%", desc: "Övergripande svar från snabbskanningen av leverantören." },
              { label: "Fördjupad analys", value: aggDeep, weight: "35%", desc: "Detaljerade svar kring certifieringar, drift och säkerhet." },
              { label: "EU-vikt", value: aggEu, weight: "15%", desc: "Hur högt ni prioriterar EU-datalagring och suveränitet." },
              { label: "Beredskap", value: aggReadiness, weight: "15%", desc: "Er förmåga att hantera avbrott och byta leverantör." },
            ].map((r) => (
              <div key={r.label} className="rounded-lg bg-muted/40 px-3 py-2 ring-1 ring-border/60">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{r.label}</p>
                  <p className="text-sm font-bold text-foreground">
                    {Math.round(r.value)}
                    <span className="ml-1 text-[10px] font-medium text-foreground/50">· vikt {r.weight}</span>
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-foreground/60">{r.desc}</p>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between rounded-lg bg-foreground px-3 py-2 text-background">
              <p className="text-sm font-semibold">Totalpoäng</p>
              <p className="text-lg font-bold">{aggTotal}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setScoreBreakdownOpen(false)}>
              Stäng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default Quiz;
