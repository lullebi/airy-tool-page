import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, Download, ShieldCheck, ShieldAlert, Inbox, Sparkles, Info, Loader2, Globe, Cpu, Server, BadgeCheck, XCircle, Gavel, ScrollText, Building2, Stamp } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { rescore, type RescoredVendor, type VendorClass } from "@/lib/api";
import { CLASS_LABELS, CLASS_TAILWIND, RISK_DRIVER_SV, SCORE_CAP, SCORE_TOOLTIP, prioritiesToWeights } from "@/lib/scoringConstants";
import type { VendorLike } from "@/lib/vendorMapper";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

/* Verksamhetsanalys & Strategi — organisatorisk kontext som senare styr
   Åtgärdsplanen. Påverkar INTE leverantörernas objektiva poäng eller ML-vikter. */
type StrategyKey = "timeHorizon" | "infrastructure" | "techResource" | "regulatoryFocus";

type StrategyQuestion = {
  key: StrategyKey;
  eyebrow: string;
  text: string;
  options: { value: "A" | "B"; label: string; description: string }[];
};

const STRATEGY_QUESTIONS: StrategyQuestion[] = [
  {
    key: "timeHorizon",
    eyebrow: "Tidshorisont & Press",
    text: "Hur snabbt måste en alternativ lösning vara på plats om er nuvarande leverantör drabbas av regulatoriska begränsningar eller avbrott?",
    options: [
      { value: "A", label: "Omedelbart", description: "Kritiskt behov inom 1–3 månader" },
      { value: "B", label: "Strategiskt", description: "Långsiktig omställning inom 6–12 månader" },
    ],
  },
  {
    key: "infrastructure",
    eyebrow: "Infrastrukturpreferens",
    text: "Vilken typ av infrastruktur föredrar er organisation av strategiska skäl framåt?",
    options: [
      { value: "A", label: "Lokalt datacenter / Privat moln", description: "Egen drift eller privat molnlösning" },
      { value: "B", label: "Publikt moln inom EU", description: "Publikt moln (SaaS/IaaS) men strikt inom EU" },
    ],
  },
  {
    key: "techResource",
    eyebrow: "Intern Teknisk Resurs",
    text: "Hur ser er interna IT-organisations tekniska resurser och kompetens ut?",
    options: [
      { value: "A", label: "Hög intern kompetens", description: "Vi kan drifta, migrera och underhålla arkitekturen själva" },
      { value: "B", label: "Begränsad resurs", description: "Vi är beroende av paketerade Managed Services och extern support" },
    ],
  },
  {
    key: "regulatoryFocus",
    eyebrow: "Primärt Regulatoriskt Fokus",
    text: "Vilket regelverk sätter absolut högst press på er organisation just nu?",
    options: [
      { value: "A", label: "NIS2 / DORA", description: "Fokus på driftsäkerhet, kontinuitet och incidentrapportering" },
      { value: "B", label: "GDPR / Dataskydd", description: "Fokus på personuppgifter, juridisk rådighet och kryptering" },
    ],
  },
];

const QUICK_SCAN: Question[] = [
  {
    id: "qs_sensitive_data",
    kategori: "Snabbanalys",
    text: "Hanterar era leverantörer känslig data?",
    viktning: 0.2,
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
    viktning: 0.15,
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
    text: "Har ni avtal som motsvarar DPA/SLA?",
    viktning: 0.15,
    type: "single",
    svarsalternativ: [
      { label: "Ja", scoreValue: 100 },
      { label: "Nej", scoreValue: 0 },
      { label: "Vet ej", scoreValue: 50 },
    ],
  },
  {
    id: "qs_encryption_keys",
    kategori: "Snabbanalys",
    text: "Kontrollerar ni krypteringsnycklarna?",
    viktning: 0.1,
    type: "single",
    svarsalternativ: [
      { label: "Ja", scoreValue: 100 },
      { label: "Delvis", scoreValue: 50 },
      { label: "Nej", scoreValue: 0 },
    ],
  },
];

const DEEP_DIVE: Question[] = [


  // Security Level
  { id: "dd_sec_encryption", kategori: "Säkerhetsnivå", text: "Krypteras data i vila och under transport?", viktning: 0.2, type: "single", svarsalternativ: [{label:"Ja, alltid",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_sec_access", kategori: "Säkerhetsnivå", text: "Används MFA och rollbaserad åtkomst?", viktning: 0.18, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_sec_audit", kategori: "Säkerhetsnivå", text: "Genomförs säkerhetsrevisioner?", viktning: 0.16, type: "single", svarsalternativ: [{label:"Årligen",scoreValue:100},{label:"Sällan",scoreValue:50},{label:"Aldrig",scoreValue:0}] },
  { id: "dd_sec_pen", kategori: "Säkerhetsnivå", text: "Genomförs penetrationstester?", viktning: 0.14, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Vet ej",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_sec_zero", kategori: "Säkerhetsnivå", text: "Tillämpar leverantören zero-trust?", viktning: 0.16, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },

  // Incident Management
  { id: "dd_inc_plan", kategori: "Incidenthantering", text: "Finns incidenthanteringsplan?", viktning: 0.22, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_inc_sla", kategori: "Incidenthantering", text: "Finns SLA för svarstid?", viktning: 0.2, type: "single", svarsalternativ: [{label:"< 4h",scoreValue:100},{label:"< 24h",scoreValue:60},{label:"Ingen SLA",scoreValue:0}] },
  { id: "dd_inc_notif", kategori: "Incidenthantering", text: "Notifieras kund inom 72h vid databreach?", viktning: 0.2, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Vet ej",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_inc_drills", kategori: "Incidenthantering", text: "Genomförs incidentövningar?", viktning: 0.18, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Sällan",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_inc_log", kategori: "Incidenthantering", text: "Finns loggar för forensik?", viktning: 0.2, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },

  // Data Location / Jurisdiction
  { id: "dd_loc_eu", kategori: "Datalagring och jurisdiktion", text: "Lagras data inom EU/EES?", viktning: 0.25, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:40},{label:"Nej",scoreValue:0}] },
  { id: "dd_loc_transfer", kategori: "Datalagring och jurisdiktion", text: "Sker dataöverföring till tredje land?", viktning: 0.2, type: "single", svarsalternativ: [{label:"Aldrig",scoreValue:100},{label:"Sällan",scoreValue:50},{label:"Ofta",scoreValue:0}] },
  { id: "dd_loc_scc", kategori: "Datalagring och jurisdiktion", text: "Används SCC?", viktning: 0.18, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Vet ej",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_loc_residency", kategori: "Datalagring och jurisdiktion", text: "Garanteras data residency?", viktning: 0.17, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_loc_sub", kategori: "Datalagring och jurisdiktion", text: "Är underleverantörer EU-baserade?", viktning: 0.2, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },

  // Ownership / Lagar & Regelverk
  { id: "dd_own_hq", kategori: "Ägarskap och regelverk", text: "Har leverantören HQ i EU?", viktning: 0.22, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Nej",scoreValue:0}] },
  { id: "dd_own_cloud_act", kategori: "Ägarskap och regelverk", text: "Omfattas av US CLOUD Act?", viktning: 0.22, type: "single", svarsalternativ: [{label:"Nej",scoreValue:100},{label:"Vet ej",scoreValue:50},{label:"Ja",scoreValue:0}] },
  { id: "dd_own_owner", kategori: "Ägarskap och regelverk", text: "Är ägarstrukturen EU-kontrollerad?", viktning: 0.2, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_own_gdpr", kategori: "Ägarskap och regelverk", text: "Är leverantören GDPR-compliant?", viktning: 0.18, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
  { id: "dd_own_dora", kategori: "Ägarskap och regelverk", text: "Möter leverantören DORA/NIS2-krav?", viktning: 0.18, type: "single", svarsalternativ: [{label:"Ja",scoreValue:100},{label:"Delvis",scoreValue:50},{label:"Nej",scoreValue:0}] },
];

/* =========================================================================
   STATE TYPES
   ========================================================================= */

type Step1State = {
  // Verksamhetsanalys & Strategi — organisatorisk kontext (styr Åtgärdsplanen,
  // påverkar inte leverantörspoäng eller ML-vikter).
  timeHorizon: string; // "A" | "B"
  infrastructure: string; // "A" | "B"
  techResource: string; // "A" | "B"
  regulatoryFocus: string; // "A" | "B"
  // Legacy-fält behålls för bakåtkompatibilitet i Resultat/scoring.
  priorities: string[]; // multi select
  sector: string;
  euDataWeight: number | null; // 1..5, null = unanswered
  readiness: string; // label
};

type Answers = Record<string, string>; // questionId -> option label

// VendorLike imported from "@/lib/vendorMapper"

const STEPS = ["Verksamhetsanalys & Strategi", "Infrastruktur & Dataproveniens", "Strategisk Åtgärdsplan"] as const;

// Canonical "European" check: hq_in_eu === true from GET /vendors.
// No hardcoded country allowlists, no name-based heuristics.
import { isEuropean as isEU } from "@/lib/vendorMapper";
import { fetchAlternatives, fetchVendor, type ApiVendorDetail } from "@/lib/api";

/* =========================================================================
   TECHNICAL PROVENANCE — region helpers (origin / processing / storage)
   ========================================================================= */

const REGION_NAMES_SV = (() => {
  try {
    return new Intl.DisplayNames(["sv"], { type: "region" });
  } catch {
    return null;
  }
})();

const countryFromIso2 = (iso2: string | null | undefined) => {
  if (!iso2) return "";
  try {
    return REGION_NAMES_SV?.of(iso2.toUpperCase()) ?? iso2.toUpperCase();
  } catch {
    return iso2.toUpperCase();
  }
};

const EU_HINT =
  /\b(eu|ees|eea|europe|europa|frankfurt|ireland|irland|germany|tyskland|sweden|sverige|netherlands|nederl|paris|france|frankrike|stockholm|amsterdam|dublin|finland|spain|spanien|italy|italien|belgium|belgien)\b/i;
const NONEU_HINT =
  /\b(us|usa|united states|amerika|global|globalt|asia|asien|apac|china|kina|india|indien|singapore)\b/i;

type RegionStatus = "eu" | "noneu" | "unknown";

const regionStatus = (text?: string | null, bool?: boolean): RegionStatus => {
  if (typeof bool === "boolean") return bool ? "eu" : "noneu";
  if (!text) return "unknown";
  if (EU_HINT.test(text)) return "eu";
  if (NONEU_HINT.test(text)) return "noneu";
  return "unknown";
};

const REGION_TONE: Record<RegionStatus, { ring: string; icon: string; pill: string; label: string }> = {
  eu: {
    ring: "bg-emerald-50 ring-emerald-200",
    icon: "text-emerald-600",
    pill: "bg-emerald-100 text-emerald-700",
    label: "EU",
  },
  noneu: {
    ring: "bg-rose-50 ring-rose-200",
    icon: "text-rose-600",
    pill: "bg-rose-100 text-rose-700",
    label: "Icke-EU",
  },
  unknown: {
    ring: "bg-amber-50 ring-amber-200",
    icon: "text-amber-600",
    pill: "bg-amber-100 text-amber-700",
    label: "Okänt",
  },
};

const RegionCell = ({
  icon: Icon,
  label,
  location,
  status,
}: {
  icon: typeof Globe;
  label: string;
  location: string;
  status: RegionStatus;
}) => {
  const tone = REGION_TONE[status];
  return (
    <div className={`flex flex-col items-center rounded-lg p-2 text-center ring-1 ${tone.ring}`}>
      <Icon className={`h-4 w-4 ${tone.icon}`} aria-hidden="true" />
      <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-foreground/55">{label}</p>
      <p className="mt-0.5 text-[11px] font-bold leading-tight text-foreground line-clamp-2">
        {location}
      </p>
      <span
        className={`mt-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${tone.pill}`}
      >
        {tone.label}
      </span>
    </div>
  );
};

const FlowArrow = () => (
  <div className="flex items-center justify-center">
    <ArrowRight className="h-3.5 w-3.5 text-foreground/30" aria-hidden="true" />
  </div>
);

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

/**
 * Source of truth: rescored map from POST /score.
 * total = contextual_score (0..SCORE_CAP). Sub-components map onto the legacy
 * UI buckets (quickScore=säkerhet, deepScore=compliance, euWeight=flexibilitet)
 * so the existing UI breakdown stays meaningful without any local formula.
 */
type ScoredMap = Map<string, RescoredVendor>;

const computeVendorScore = (vendor: VendorLike, scored: ScoredMap) => {
  const rec = vendor.apiId ? scored.get(vendor.apiId) : undefined;
  const total = rec?.contextual_score ?? 0;
  return {
    total,
    quickScore: rec?.components.säkerhet ?? 0,
    deepScore: rec?.components.compliance ?? 0,
    euWeight: rec?.components.flexibilitet ?? 0,
    readinessScore: 0,
    rec,
  };
};

const classToTone = (c: VendorClass | undefined): "ok" | "warn" | "bad" => {
  if (c === "låg") return "ok";
  if (c === "medel") return "warn";
  return "bad";
};

const statusFromVendor = (vendor: VendorLike, scored: ScoredMap) => {
  const rec = vendor.apiId ? scored.get(vendor.apiId) : undefined;
  const tone = classToTone(rec?.class);
  return { label: rec ? CLASS_LABELS[rec.class] : "Ej analyserad", tone };
};

/* =========================================================================
   COMPONENT
   ========================================================================= */


const Quiz = () => {
  const location = useLocation();
  const navState = (location.state as { vendors?: VendorLike[]; stepIndex?: number } | null);
  const stateVendors = navState?.vendors;
  // Fallback: read vendors from localStorage (set by RegistreraLeverantorer
  // before navigation). Survives refreshes and accidental remounts.
  let storedVendors: VendorLike[] = [];
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem("eurostack:vendors") : null;
    if (raw) storedVendors = JSON.parse(raw) as VendorLike[];
  } catch { /* ignore */ }
  const vendors: VendorLike[] =
    stateVendors && stateVendors.length > 0
      ? stateVendors
      : storedVendors.length > 0
        ? storedVendors
        : [];

  const [stepIndex, setStepIndex] = useState(
    typeof navState?.stepIndex === "number"
      ? Math.max(0, Math.min(STEPS.length - 1, navState.stepIndex))
      : 0,
  );
  const [completionOpen, setCompletionOpen] = useState(false);
  const navigate = useNavigate();
  const [step1, setStep1] = useState<Step1State>({
    timeHorizon: "",
    infrastructure: "",
    techResource: "",
    regulatoryFocus: "",
    priorities: [],
    sector: "",
    euDataWeight: null,
    readiness: "",
  });
  const [quickAnswers, setQuickAnswers] = useState<Answers>({});
  // Per-vendor deep dive answers, keyed by vendor id.
  const [deepAnswersByVendor, setDeepAnswersByVendor] = useState<Record<string, Answers>>({});
  // Fördjupad analys aktiveras för leverantörer där dataset saknar info.
  // Här simulerat — användaren kan toggla.
  const [deepDiveEnabled, setDeepDiveEnabled] = useState(true);
  // Index för vilken leverantör i Fördjupad analys-loopen som granskas just nu.
  const [deepVendorIndex, setDeepVendorIndex] = useState(0);
  // Visa valideringsfel när användaren försökt gå vidare utan att fylla i allt.
  const [showErrors, setShowErrors] = useState(false);
  useEffect(() => { setShowErrors(false); }, [stepIndex, deepVendorIndex]);

  // API scoring state — POST /score result keyed by apiId.
  const [scoredMap, setScoredMap] = useState<ScoredMap>(new Map());
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  // Trigger rescore when entering Resultat (step 1). Re-run if priorities change while on/after Resultat.
  useEffect(() => {
    if (stepIndex < 1) return;
    const apiIds = vendors.map((v) => v.apiId).filter((id): id is string => !!id);
    if (apiIds.length === 0) {
      setScoredMap(new Map());
      return;
    }
    const weights = prioritiesToWeights(step1.priorities);
    setScoring(true);
    setScoreError(null);
    rescore(apiIds, weights)
      .then((list) => {
        const m: ScoredMap = new Map();
        list.forEach((r) => m.set(r.id, r));
        setScoredMap(m);
      })
      .catch((e: unknown) => {
        setScoreError(e instanceof Error ? e.message : "Kunde inte hämta score");
      })
      .finally(() => setScoring(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, step1.priorities.join("|")]);


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
      return step1.timeHorizon !== "" && step1.infrastructure !== "" && step1.techResource !== "" && step1.regulatoryFocus !== "";
    return true;
  }, [stepIndex, step1]);

  const missingQuickIds = useMemo(
    () => QUICK_SCAN.filter((q) => !quickAnswers[q.id]).map((q) => q.id),
    [quickAnswers],
  );
  const missingDeepIds = useMemo(
    () => activeDeepQuestions.filter((q) => !currentDeepAnswers[q.id]).map((q) => q.id),
    [activeDeepQuestions, currentDeepAnswers],
  );
  const step1Missing = {
    timeHorizon: step1.timeHorizon === "",
    infrastructure: step1.infrastructure === "",
    techResource: step1.techResource === "",
    regulatoryFocus: step1.regulatoryFocus === "",
  };

  const goNext = () => {
    if (!canNext) {
      setShowErrors(true);
      toast.error("Fyll i alla obligatoriska fält", {
        description: "De som saknas är markerade i rött.",
      });
      // Scrolla till första röda fält
      requestAnimationFrame(() => {
        const el = document.querySelector("[data-missing='true']");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  };
  const goBack = () => {
    setStepIndex((i) => Math.max(0, i - 1));
  };

  // Redirect to vendor registration if no vendors in state (e.g. refresh of /quiz).
  useEffect(() => {
    if (vendors.length === 0) {
      toast.error("Inga leverantörer registrerade — börja här");
      navigate("/registrera-leverantorer", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStrategy = (key: StrategyKey, value: "A" | "B") =>
    setStep1((s) => ({ ...s, [key]: value }));

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
              setStrategy={setStrategy}
              showErrors={showErrors}
              missing={step1Missing}
            />
          )}
          {stepIndex === 1 && (
            <Step5Measurement
              vendors={vendors}
              step1={step1}
              quick={quickAnswers}
              deepByVendor={deepAnswersByVendor}
              hasDeep={deepDiveEnabled}
              scoredMap={scoredMap}
              scoring={scoring}
              scoreError={scoreError}
            />
          )}
          {stepIndex === 2 && (
            <Step6ScoreSummary
              vendors={vendors}
              step1={step1}
              quick={quickAnswers}
              deepByVendor={deepAnswersByVendor}
              activeDeepQuestions={activeDeepQuestions}
              scoredMap={scoredMap}
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
              className="group rounded-xl px-7 py-6 text-base font-bold text-white shadow-[var(--shadow-glow)] hover:opacity-95"
              style={{ background: "var(--gradient-cta)" }}
            >
              {["Gå till Infrastruktur & Dataproveniens", "Gå till Åtgärdsplan"][stepIndex]}
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

      {/* Dev shortcut removed */}

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
   STEP 1 — Verksamhetsanalys & Strategi
   ========================================================================= */
const Step1Konfig = ({
  state,
  setStrategy,
  showErrors,
  missing,
}: {
  state: Step1State;
  setStrategy: (key: StrategyKey, value: "A" | "B") => void;
  showErrors: boolean;
  missing: { timeHorizon: boolean; infrastructure: boolean; techResource: boolean; regulatoryFocus: boolean };
}) => {
  const errCls = (bad: boolean) =>
    showErrors && bad ? "rounded-2xl ring-2 ring-rose-500 ring-offset-2 ring-offset-transparent p-3 -m-3" : "";
  return (
    <Card
      title="Verksamhetsanalys & Strategi"
      subtitle="Fyra strategiska frågor om er organisations behov och förutsättningar. Svaren formar er framtida åtgärdsplan, men påverkar inte de objektiva leverantörspoängen."
    >
      <div className="grid gap-8">
        {STRATEGY_QUESTIONS.map((q, i) => {
          const selected = state[q.key];
          const isMissing = missing[q.key];
          return (
            <div key={q.key} className={errCls(isMissing)} data-missing={showErrors && isMissing}>
              <div className="mb-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/55">
                  Fråga {i + 1} · {q.eyebrow}
                </p>
                <p className="mt-1.5 text-base font-semibold leading-snug text-foreground">{q.text}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {q.options.map((opt) => {
                  const active = selected === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStrategy(q.key, opt.value)}
                      aria-pressed={active}
                      className={`rounded-2xl px-5 py-4 text-left transition ring-1 ${
                        active
                          ? "bg-foreground text-background ring-foreground shadow-[var(--shadow-deep)]"
                          : "bg-white/70 text-foreground/80 ring-white/70 hover:bg-white"
                      }`}
                    >
                      <div className="text-[15px] font-bold leading-tight">{opt.label}</div>
                      <div className={`mt-1.5 text-xs leading-relaxed ${active ? "text-background/80" : "text-foreground/60"}`}>
                        {opt.description}
                      </div>
                    </button>
                  );
                })}
              </div>
              {showErrors && isMissing && (
                <p className="mt-2 text-xs font-semibold text-rose-600">Välj ett alternativ.</p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

/* =========================================================================
   GENERIC STEP — Question list
   ========================================================================= */
const StepQuestions = ({
  title,
  subtitle,
  questions,
  answers,
  setAnswers,
  missingIds = [],
}: {
  title: string;
  subtitle: string;
  questions: Question[];
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
  missingIds?: string[];
}) => (
  <Card title={title} subtitle={subtitle}>
    <div className="grid gap-6">
      {questions.map((q, i) => {
        const isMissing = missingIds.includes(q.id);
        return (
        <div
          key={q.id}
          data-missing={isMissing}
          className={`rounded-2xl bg-white/60 p-5 ring-1 transition ${isMissing ? "ring-2 ring-rose-500 bg-rose-50/40" : "ring-white/70"}`}
        >
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
          {isMissing && (
            <p className="mt-2 text-xs font-semibold text-rose-600">Välj ett svarsalternativ.</p>
          )}
        </div>
        );
      })}
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
  missingIds = [],
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
  missingIds?: string[];
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
      <div className="mb-5 rounded-xl bg-blue-50/80 px-4 py-3 ring-1 ring-blue-200">
        <p className="text-xs font-medium text-blue-900">
          <strong>Notera:</strong> Dina svar samlas in för evidence-badges på resultatsteget
          och kommer i nästa version finjustera ML-vikterna per leverantör. Just nu
          påverkar svaren inte den totala poängen direkt — de driver bara dokumentationen.
        </p>
      </div>

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

          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50/70 px-4 py-3 ring-1 ring-amber-200">
            <span className="text-xs font-semibold text-amber-900">Snabbifyll:</span>
            <button
              type="button"
              onClick={() => {
                const next: Answers = {};
                activeQuestions.forEach((q) => {
                  const best = [...q.svarsalternativ].sort((a, b) => b.scoreValue - a.scoreValue)[0];
                  if (best) next[q.id] = best.label;
                });
                setAnswers((a) => ({ ...a, ...next }));
              }}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Optimistisk (bästa svar)
            </button>
            <button
              type="button"
              onClick={() => {
                const next: Answers = {};
                activeQuestions.forEach((q) => {
                  const worst = [...q.svarsalternativ].sort((a, b) => a.scoreValue - b.scoreValue)[0];
                  if (worst) next[q.id] = worst.label;
                });
                setAnswers((a) => ({ ...a, ...next }));
              }}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700"
            >
              Pessimistisk (sämsta svar)
            </button>
            <span className="text-[11px] text-amber-800/80">Fyller i alla frågor för {vendor.name}.</span>
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
                  {qs.map((q, i) => {
                    const isMissing = missingIds.includes(q.id);
                    return (
                    <div
                      key={q.id}
                      data-missing={isMissing}
                      className={`rounded-2xl bg-white/60 p-5 ring-1 transition ${isMissing ? "ring-2 ring-rose-500 bg-rose-50/40" : "ring-white/70"}`}
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
                      {isMissing && (
                        <p className="mt-2 text-xs font-semibold text-rose-600">Välj ett svarsalternativ.</p>
                      )}
                    </div>
                    );
                  })}
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
   STEP 5 (final) — Interaktiv "Score Breakdown" / "Så räknades poängen fram"
   Tre vägda kort (Snabbanalys 20 %, Fördjupad analys 50 %, EU-efterlevnad &
   Suveränitet 30 %). Varje kort fälls ut till en drill-down:
   Regelverk (GDPR · DORA · NIS2) → Kategorier → Kontroller, där varje kontroll
   poängsätts med en badge (Ja = 100, Delvis = 50, Nej = 0). EU-kortet visar
   även leverantörstelemetri (region) och en tabell över tidigare böter.
   ========================================================================= */

// Fasta vikter enligt designen.
const BREAKDOWN_WEIGHTS = { snabb: 0.2, deep: 0.5, eu: 0.3 } as const;

type BreakdownControl = { id: string; label: string; answer: string; score: number };
type BreakdownCategory = { name: string; controls: BreakdownControl[] };
type BreakdownRegelverk = { name: string; desc: string; categories: BreakdownCategory[] };

// Färgton för en kontrollpoäng → Ja / Delvis / Nej.
const controlTone = (score: number) => {
  if (score >= 75)
    return { label: "Ja", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
  if (score <= 25) return { label: "Nej", cls: "bg-rose-50 text-rose-700 ring-rose-200" };
  return { label: "Delvis", cls: "bg-amber-50 text-amber-700 ring-amber-200" };
};

const ControlRow = ({ c }: { c: BreakdownControl }) => {
  const tone = controlTone(c.score);
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/40 py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium leading-snug text-foreground">{c.label}</p>
        <p className="mt-0.5 text-xs text-foreground/50">Svar: {c.answer}</p>
      </div>
      <span
        className={`mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${tone.cls}`}
      >
        {tone.label}
        <span className="tabular-nums opacity-70">· {c.score}</span>
      </span>
    </div>
  );
};

// Statisk "checkpoint"-rad som speglar ML-modellens features (ej quiz-svar).
const CheckpointRow = ({
  cp,
}: {
  cp: { label: string; status: string; score: number };
}) => {
  const tone =
    cp.score >= 75
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : cp.score <= 25
        ? "bg-rose-50 text-rose-700 ring-rose-200"
        : "bg-amber-50 text-amber-700 ring-amber-200";
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/40 py-2.5 last:border-0">
      <p className="min-w-0 text-sm font-medium leading-snug text-foreground">{cp.label}</p>
      <span
        className={`mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${tone}`}
      >
        {cp.status}
        <span className="tabular-nums opacity-70">· {cp.score}p</span>
      </span>
    </div>
  );
};

// Telemetri-uppslag per leverantör (origin / processing / storage).
const telemetryFor = (d?: ApiVendorDetail) => {
  const f = d?.features;
  const originStatus = regionStatus(undefined, f?.hq_in_eu);
  const originText =
    countryFromIso2(f?.hq_country_iso2) ||
    (originStatus === "eu" ? "Inom EU" : originStatus === "noneu" ? "Utanför EU" : "—");
  const procText = f?.processing_region || "—";
  const procStatus = f
    ? regionStatus(f.processing_region, f.cloud_act_exposure ? false : undefined)
    : "unknown";
  const storageText = f?.storage_region || "—";
  const storageStatus = regionStatus(f?.storage_region, f?.storage_in_eu);
  return {
    origin: { text: originText, status: originStatus },
    processing: { text: procText, status: procStatus },
    storage: { text: storageText, status: storageStatus },
  };
};

const eurFmt = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/* Tailored advisory paragraph driven by the organizational context captured in
   Step 1 (Verksamhetsanalys & Strategi). Pure presentation — does not alter any
   objective vendor scores or ML weights. */
const buildAdvisory = (step1: Step1State): string => {
  const urgent = step1.timeHorizon === "A";
  const privateInfra = step1.infrastructure === "A";
  const highCompetence = step1.techResource === "A";
  const regNis2Dora = step1.regulatoryFocus === "A";

  const horizonClause = urgent
    ? "Eftersom ni har angett ett omedelbart behov av en alternativ lösning bör migreringen drivas som ett prioriterat projekt med ett tydligt 1–3 månaders fönster och en konkret exit-plan från nuvarande leverantör"
    : "Med en strategisk tidshorisont på 6–12 månader rekommenderas en stegvis omställning där ni hinner utvärdera, pilotera och kontraktera europeiska alternativ utan att äventyra pågående drift";

  const infraClause = privateInfra
    ? "Er preferens för lokalt datacenter eller privat moln talar för en arkitektur där affärskritisk data hålls under egen eller europeisk drift med full kontroll över krypteringsnycklar"
    : "Er preferens för publikt moln inom EU innebär att fokus bör ligga på leverantörer med verifierad datalagring och bearbetning strikt inom unionen samt avtalsmässig garanti mot tredjelandsöverföring";

  const resourceClause = highCompetence
    ? "Med hög intern teknisk kompetens kan ni själva leda migrering och underhåll, vilket ger utrymme att välja mer flexibla, självdriftade europeiska plattformar"
    : "Med begränsade interna resurser bör ni prioritera paketerade Managed Services från europeiska leverantörer som tar ansvar för drift, support och löpande efterlevnad";

  const regClause = regNis2Dora
    ? "Då NIS2 och DORA sätter högst press ligger tyngdpunkten på driftsäkerhet, kontinuitet och incidentrapportering, vilket gör leverantörens motståndskraft och rapporteringsförmåga till avgörande urvalskriterier"
    : "Då GDPR och dataskydd sätter högst press ligger tyngdpunkten på juridisk rådighet, datalokalisering och kryptering, vilket gör leverantörens EU-suveränitet och avtalsmässiga dataskydd till avgörande urvalskriterier";

  return `${horizonClause}. ${infraClause}. ${resourceClause}. ${regClause}.`;
};


// Exakt rådgivningstext beroende på leverantörens regulatoriska status.
const PROFILE_SAFE_TEXT =
  "Leverantören bedöms ha fullständig geopolitisk rådighet och noll exponering mot tredjelandsstiftning. Befintlig infrastruktur uppfyller rådande suveränitetskrav under GDPR, NIS2 och DORA. Inga migreringsåtgärder krävs för denna tjänst, och organisationen rekommenderas att fortsätta driften i nuvarande miljö.";

const PROFILE_RISK_TEXT =
  "Leverantören uppvisar strukturella kontrollrisker gällande geopolitisk rådighet och dataägande. Eftersom er verksamhet står under omedelbar regulatorisk press samt har ett uttalat behov av publika molntjänster inom EU, innebär nuvarande leverantörsberoende en direkt strategisk verksamhetsrisk. En kontrollerad migration bör inledas.";

// Genererar en sammanhängande sårbarhetsbedömning (ett stycke, inga punktlistor)
// utifrån leverantörens exponering mot tredjelandslagstiftning.
const buildVulnerabilityProfile = (exposed: boolean): string =>
  exposed ? PROFILE_RISK_TEXT : PROFILE_SAFE_TEXT;

const Step6ScoreSummary = ({
  vendors,
  step1,
}: {
  vendors: VendorLike[];
  step1: Step1State;
  quick?: Answers;
  deepByVendor?: Record<string, Answers>;
  activeDeepQuestions?: Question[];
  scoredMap?: ScoredMap;
}) => {
  const navigate = useNavigate();

  // "Aktiv" leverantör: prioritera den med tredjelandsexponering, annars första.
  const activeVendor = useMemo(
    () => vendors.find((v) => v.cloud_act_exposure === true || v.hq_in_eu === false) ?? vendors[0],
    [vendors],
  );

  const exposed =
    !!activeVendor && (activeVendor.cloud_act_exposure === true || activeVendor.hq_in_eu === false);

  const profileText = buildVulnerabilityProfile(exposed);

  const category = activeVendor?.apiCategory ?? activeVendor?.type ?? null;

  const [alt, setAlt] = useState<{ loading: boolean; eu: string[]; error?: string }>({
    loading: true,
    eu: [],
  });

  useEffect(() => {
    if (!category) {
      setAlt({ loading: false, eu: [] });
      return;
    }
    let active = true;
    setAlt({ loading: true, eu: [] });
    fetchAlternatives(category)
      .then((r) => active && setAlt({ loading: false, eu: r.eu_alternatives }))
      .catch(
        (e: unknown) =>
          active &&
          setAlt({
            loading: false,
            eu: [],
            error: e instanceof Error ? e.message : "Kunde inte hämta alternativ",
          }),
      );
    return () => {
      active = false;
    };
  }, [category]);

  const recommended = alt.eu[0] ?? null;

  return (
    <section className="space-y-6">
      {/* TOP CARD — Sårbarhetsprofil för Ledningsgrupp */}
      <div className="rounded-3xl bg-[hsl(var(--sky-100))] p-6 ring-1 ring-[hsl(var(--sky-200))] shadow-[var(--shadow-deep)] md:p-8">
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 ring-1 ring-rose-200">
            <ShieldAlert className="h-5 w-5 text-rose-600" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              Sårbarhetsprofil för Ledningsgrupp
            </h2>
            {activeVendor && (
              <p className="text-xs font-medium text-foreground/55">
                Bedömd leverantör: {activeVendor.name}
                {category ? ` · ${category}` : ""}
              </p>
            )}
          </div>
        </div>
        <p className="max-w-3xl text-base leading-relaxed text-foreground/85">{profileText}</p>
      </div>

      {/* BOTTOM CARD — Rekommenderat EU-Alternativ (endast vid kontrollrisk) */}
      {exposed && (
      <div className="rounded-3xl border border-primary/20 bg-white p-6 shadow-[var(--shadow-deep)] md:p-8">
        <div className="mb-1 flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-primary" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Rekommenderat EU-Alternativ
          </p>
        </div>

        {alt.loading ? (
          <p className="inline-flex items-center gap-2 py-4 text-sm text-foreground/60">
            <Loader2 className="h-4 w-4 animate-spin" /> Hämtar suveränt europeiskt alternativ…
          </p>
        ) : recommended ? (
          <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {recommended}
              </p>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-foreground/65">
                Suveränt europeiskt alternativ inom kategorin {category ?? "—"}, med datalagring och
                bearbetning inom EU:s jurisdiktion och utan exponering mot tredjelandslagstiftning.
              </p>
              {alt.eu.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {alt.eu.slice(1).map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-[hsl(var(--sky-100))] px-2.5 py-0.5 text-xs font-medium text-foreground ring-1 ring-[hsl(var(--sky-200))]"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Button
              size="lg"
              onClick={() => navigate("/atgardsplan", { state: { vendors, step1 } })}
              className="group shrink-0 rounded-xl px-6 py-6 text-base font-bold text-white shadow-[var(--shadow-glow)] hover:opacity-95"
              style={{ background: "var(--gradient-cta)" }}
            >
              Visa Migreringsunderlag
              <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-1" />
            </Button>
          </div>
        ) : (
          <p className="py-4 text-sm text-foreground/60">
            {alt.error ?? "Inga EU-alternativ taggade för denna kategori."}
          </p>
        )}
      </div>
    </section>
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




/* =========================================================================
   STEP 5 — Measurement / Mätningssida
   ========================================================================= */

type ScoreBadge = { key: string; label: string; value: number; evidence: string };

const buildBadges = (quick: Answers, deep: Answers, hasDeep: boolean, eu: boolean): ScoreBadge[] => {
  const findQ = (id: string) => [...QUICK_SCAN, ...DEEP_DIVE].find((q) => q.id === id);
  const ans = (id: string) => (id in quick ? quick[id] : deep[id]) ?? "—";
  const score = (id: string) => {
    const q = findQ(id);
    if (!q) return 0;
    const a = id in quick ? quick : deep;
    return scoreFor(q, a);
  };

  // EU-suveränitetsmått: en leverantör utanför EU kan per definition inte
  // garantera datalagring inom EU/EES eller GDPR utan tredjelandsrisk
  // (US CLOUD Act). Dessa nollställs därför för icke-EU-leverantörer så att
  // poängen inte motsäger "0 % EU"-mätningen.
  const NON_EU_EVIDENCE_RESIDENCY =
    "Leverantören saknar huvudkontor/datalagring inom EU/EES – data lagras eller bearbetas globalt (USA).";
  const NON_EU_EVIDENCE_GDPR =
    "Tredjelandsöverföring och US CLOUD Act-exponering omöjliggör fullständig GDPR-garanti.";

  const base: ScoreBadge[] = [
    {
      key: "data_residency",
      label: "Datalagring",
      value: eu ? (hasDeep ? score("dd_loc_eu") : score("qs_sensitive_data")) : 0,
      evidence: !eu
        ? NON_EU_EVIDENCE_RESIDENCY
        : hasDeep
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
      value: eu ? (hasDeep ? score("dd_own_gdpr") : score("qs_certifications")) : 0,
      evidence: !eu
        ? NON_EU_EVIDENCE_GDPR
        : hasDeep
          ? `Mätt mot: "${findQ("dd_own_gdpr")?.text}" → ${ans("dd_own_gdpr")}`
          : `Mätt mot: "${findQ("qs_certifications")?.text}" → ${ans("qs_certifications")}`,
    },
  ];
  return base;
};

const CERT_LABELS: { key: keyof ApiVendorDetail["features"]["certifications"]; label: string }[] = [
  { key: "iso27001", label: "ISO 27001" },
  { key: "soc2", label: "SOC 2" },
  { key: "dora", label: "DORA" },
  { key: "nis2", label: "NIS2" },
  { key: "c5_attestation", label: "C5" },
  { key: "gdpr_commitments", label: "GDPR" },
];

const Step5Measurement = ({
  vendors,
}: {
  vendors: VendorLike[];
  step1: Step1State;
  quick: Answers;
  deepByVendor: Record<string, Answers>;
  hasDeep: boolean;
  scoredMap: ScoredMap;
  scoring: boolean;
  scoreError: string | null;
}) => {
  // Fetch full vendor detail (raw dataset features) per selected vendor.
  const [detailsById, setDetailsById] = useState<Record<string, ApiVendorDetail>>({});
  const apiIdsKey = vendors.map((v) => v.apiId ?? "").filter(Boolean).join("|");
  useEffect(() => {
    let active = true;
    vendors.forEach((v) => {
      if (!v.apiId) return;
      fetchVendor(v.apiId)
        .then((d) => {
          if (active) setDetailsById((prev) => ({ ...prev, [v.apiId!]: d }));
        })
        .catch(() => {});
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiIdsKey]);

  // Resolve the three technical regions for a vendor from raw dataset columns.
  const regionsFor = (v: VendorLike) => {
    const d = detailsById[v.apiId ?? ""];
    const f = d?.features;
    const originStatus = regionStatus(undefined, f?.hq_in_eu ?? v.hq_in_eu);
    const originText =
      countryFromIso2(f?.hq_country_iso2) ||
      v.country ||
      (originStatus === "eu" ? "Inom EU" : originStatus === "noneu" ? "Utanför EU" : "—");
    const procText = f?.processing_region || "—";
    const procStatus = f
      ? regionStatus(f.processing_region, f.cloud_act_exposure ? false : undefined)
      : "unknown";
    const storageText =
      f?.storage_region || (typeof v.storage_in_eu === "boolean" ? (v.storage_in_eu ? "Inom EU" : "Utanför EU") : "—");
    const storageStatus = regionStatus(undefined, f?.storage_in_eu ?? v.storage_in_eu);
    return {
      loading: !!v.apiId && !d,
      origin: { text: originText, status: originStatus },
      processing: { text: procText, status: procStatus },
      storage: { text: storageText, status: storageStatus },
    };
  };

  if (vendors.length === 0) {
    return (
      <Card title="Infrastruktur & Dataproveniens" subtitle="Inga leverantörer valda.">
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Inbox className="h-8 w-8 text-foreground/40" />
          <p className="max-w-sm text-sm font-medium text-foreground/60">
            Registrera minst en leverantör för att kartlägga dess geografiska dataproveniens och tekniska riskprofil.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Infrastruktur & Dataproveniens"
      subtitle="En objektiv kartläggning av var era valda leverantörers data har sitt ursprung, bearbetas och lagras, samt deras juridiska och tekniska riskattribut direkt från datasetet."
    >
      <div className="grid gap-6">
        {vendors.map((v) => {
          const reg = regionsFor(v);
          const d = detailsById[v.apiId ?? ""];
          const f = d?.features;
          const cloudAct = f?.cloud_act_exposure ?? v.cloud_act_exposure ?? false;
          const hqInEu = f?.hq_in_eu ?? v.hq_in_eu ?? false;
          const certScore = f?.cert_score ?? null;
          const euComplianceScore = f?.eu_compliance_score ?? null;
          const presentCerts = CERT_LABELS.filter((c) => {
            const val = f?.certifications?.[c.key];
            return typeof val === "number" && val > 0;
          });

          return (
            <section
              key={v.id}
              className="rounded-2xl bg-white/70 p-5 ring-1 ring-white/70 shadow-[var(--shadow-deep)] md:p-6"
            >
              {/* Vendor header */}
              <header className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-foreground md:text-xl">{v.name}</h3>
                  {(v.apiCategory ?? v.type) && (
                    <p className="text-xs font-medium text-foreground/55">{v.apiCategory ?? v.type}</p>
                  )}
                </div>
                {reg.loading && <Loader2 className="h-4 w-4 animate-spin text-foreground/40" />}
              </header>

              {/* Geographic provenance pipeline */}
              <div className="mb-6">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/55">
                  Geografisk dataproveniens
                </p>
                <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-1.5">
                  <RegionCell icon={Globe} label="Ursprungsregion" location={reg.origin.text} status={reg.origin.status} />
                  <FlowArrow />
                  <RegionCell icon={Cpu} label="Processeringsregion" location={reg.processing.text} status={reg.processing.status} />
                  <FlowArrow />
                  <RegionCell icon={Server} label="Lagringsregion" location={reg.storage.text} status={reg.storage.status} />
                </div>
              </div>

              {/* ML risk & compliance grid */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {/* Column 1 — Jurisdiktionell Exponering */}
                <div
                  className={`flex flex-col rounded-xl p-4 ring-1 ${
                    cloudAct ? "bg-rose-50/70 ring-rose-200" : "bg-emerald-50/70 ring-emerald-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {cloudAct ? (
                      <ShieldAlert className="h-5 w-5 text-rose-600" />
                    ) : (
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    )}
                    <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/55">
                      Jurisdiktionell Exponering
                    </p>
                  </div>
                  <div className="mt-3">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                        cloudAct ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
                      }`}
                    >
                      {cloudAct ? "CLOUD ACT EXPONERAD" : "SKYDDAD AV EU-LAG"}
                    </span>
                  </div>
                </div>

                {/* Column 2 — Äganderättslig Suveränitet */}
                <div
                  className={`flex flex-col rounded-xl p-4 ring-1 ${
                    hqInEu ? "bg-emerald-50/70 ring-emerald-200" : "bg-amber-50/70 ring-amber-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className={`h-5 w-5 ${hqInEu ? "text-emerald-600" : "text-amber-600"}`} />
                    <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/55">
                      Äganderättslig Suveränitet
                    </p>
                  </div>
                  <div className="mt-3">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                        hqInEu ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
                      }`}
                    >
                      {hqInEu ? "EU-REGISTRERAT MODERBOLAG" : "MODERBOLAG I TREDJELAND"}
                    </span>
                  </div>
                </div>

                {/* Column 3 — Teknisk Säkerhetsverifiering */}
                <div className="flex flex-col rounded-xl bg-blue-50/60 p-4 ring-1 ring-blue-200">
                  <div className="flex items-center gap-2">
                    <Stamp className="h-5 w-5 text-blue-700" />
                    <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/55">
                      Teknisk Säkerhetsverifiering
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {presentCerts.length > 0 ? (
                      presentCerts.map((c) => (
                        <span
                          key={c.key}
                          className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-800 ring-1 ring-blue-200"
                        >
                          <BadgeCheck className="h-3 w-3" />
                          {c.label}
                        </span>
                      ))
                    ) : reg.loading ? (
                      <span className="text-[11px] font-medium text-foreground/45">Hämtar verifieringar…</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground/45 ring-1 ring-foreground/15">
                        <XCircle className="h-3 w-3" />
                        Inga verifierade ramverk
                      </span>
                    )}
                  </div>
                  {(certScore !== null || euComplianceScore !== null) && (
                    <div className="mt-4 space-y-2 border-t border-blue-200/70 pt-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-medium text-foreground/60">
                          Verifierade Certifikat (ISO/SOC2)
                        </span>
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider ${
                            certScore === 1 ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {certScore === null ? "—" : certScore === 1 ? "Ja" : "Nej"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-medium text-foreground/60">
                          Fullständig EU-rådighet
                        </span>
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider ${
                            euComplianceScore === 1 ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {euComplianceScore === null ? "—" : euComplianceScore === 1 ? "Ja" : "Nej"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </Card>
  );
};

export default Quiz;
