import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, Download, ShieldCheck, Inbox, Sparkles, Info, Loader2, Globe, Cpu, Server, BadgeCheck, XCircle, Gavel, ScrollText } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { rescore, fetchScoreBreakdown, type RescoredVendor, type VendorClass, type ScoreBreakdownResponse, type ScoreBreakdownCategory } from "@/lib/api";
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
  priorities: string[]; // multi select
  sector: string;
  euDataWeight: number | null; // 1..5, null = unanswered
  readiness: string; // label
};

type Answers = Record<string, string>; // questionId -> option label

// VendorLike imported from "@/lib/vendorMapper"

const STEPS = ["Konfiguration", "Snabbanalys", "Fördjupad analys", "Resultat på mätning", "Så räknades poängen fram"] as const;

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

  // Trigger rescore when entering Resultat (step 3). Re-run if priorities change while on/after Resultat.
  useEffect(() => {
    if (stepIndex < 3) return;
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
      return step1.priorities.length > 0 && step1.sector !== "" && step1.euDataWeight !== null && step1.readiness !== "";
    if (stepIndex === 1) return QUICK_SCAN.every((q) => quickAnswers[q.id]);
    if (stepIndex === 2) {
      if (!deepDiveEnabled || deepVendors.length === 0) return true;
      return activeDeepQuestions.every((q) => currentDeepAnswers[q.id]);
    }
    return true;
  }, [stepIndex, step1, quickAnswers, currentDeepAnswers, deepDiveEnabled, deepVendors.length, activeDeepQuestions]);

  const missingQuickIds = useMemo(
    () => QUICK_SCAN.filter((q) => !quickAnswers[q.id]).map((q) => q.id),
    [quickAnswers],
  );
  const missingDeepIds = useMemo(
    () => activeDeepQuestions.filter((q) => !currentDeepAnswers[q.id]).map((q) => q.id),
    [activeDeepQuestions, currentDeepAnswers],
  );
  const step1Missing = {
    priorities: step1.priorities.length === 0,
    sector: step1.sector === "",
    euDataWeight: step1.euDataWeight === null,
    readiness: step1.readiness === "",
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

  // Redirect to vendor registration if no vendors in state (e.g. refresh of /quiz).
  useEffect(() => {
    if (vendors.length === 0) {
      toast.error("Inga leverantörer registrerade — börja här");
      navigate("/registrera-leverantorer", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePriority = (label: string) =>
    setStep1((s) => {
      if (s.priorities.includes(label)) {
        return { ...s, priorities: s.priorities.filter((p) => p !== label) };
      }
      if (s.priorities.length >= 3) return s;
      return { ...s, priorities: [...s.priorities, label] };
    });

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
              showErrors={showErrors}
              missing={step1Missing}
            />
          )}
          {stepIndex === 1 && (
            <StepQuestions
              title="Snabbanalys"
              subtitle="Generella frågor som gäller alla nuvarande leverantörer."
              questions={QUICK_SCAN}
              answers={quickAnswers}
              setAnswers={setQuickAnswers}
              missingIds={showErrors ? missingQuickIds : []}
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
              missingIds={showErrors ? missingDeepIds : []}
            />
          )}
          {stepIndex === 3 && (
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
          {stepIndex === 4 && (
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
              {stepIndex === 2 && deepDiveEnabled && deepVendors.length > 1 && deepVendorIndex < deepVendors.length - 1
                ? "Nästa"
                : ["Gå till snabbanalys", "Gå till fördjupad analys", "Gå till resultat på mätning", "Visa poängberäkning"][stepIndex]}
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
   STEP 1 — Konfiguration
   ========================================================================= */
const Step1Konfig = ({
  state,
  setState,
  togglePriority,
  showErrors,
  missing,
}: {
  state: Step1State;
  setState: React.Dispatch<React.SetStateAction<Step1State>>;
  togglePriority: (label: string) => void;
  showErrors: boolean;
  missing: { priorities: boolean; sector: boolean; euDataWeight: boolean; readiness: boolean };
}) => {
  const errCls = (bad: boolean) =>
    showErrors && bad ? "rounded-xl ring-2 ring-rose-500 ring-offset-2 ring-offset-transparent p-3 -m-3" : "";
  return (
  <Card title="Konfiguration" subtitle="Här sätter vi vikt och kontext för analysen.">
    <div className="grid gap-8">
      {/* Priorities */}
      <div className={errCls(missing.priorities)} data-missing={showErrors && missing.priorities}>
      <Field label="Vad är viktigast för er?" hint="Välj upp till 3 prioriteringar">
        <div className="flex flex-wrap gap-2">
          {STEP1_PRIORITIES.map((p) => {
            const active = state.priorities.includes(p.label);
            const unsupported = p.label === "Kostnad";
            const disabled = unsupported || (!active && state.priorities.length >= 3);
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => !unsupported && togglePriority(p.label)}
                disabled={disabled}
                aria-pressed={active}
                title={unsupported ? "Saknas i modellen — kommer i framtida version" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ring-1 ${
                  active
                    ? "bg-foreground text-background ring-foreground"
                    : "bg-white/70 text-foreground/80 ring-white/70 hover:bg-white"
                } ${disabled ? "opacity-40 cursor-not-allowed hover:bg-white/70" : ""}`}
              >
                {p.label}
                {unsupported && <span className="ml-1 text-xs">(ej i modell)</span>}
              </button>
            );
          })}
        </div>
        {showErrors && missing.priorities && (
          <p className="mt-2 text-xs font-semibold text-rose-600">Välj minst en prioritering.</p>
        )}
      </Field>
      </div>

      {/* Sector */}
      <div className={errCls(missing.sector)} data-missing={showErrors && missing.sector}>
      <Field label="Vilken sektor verkar ni inom?">
        <Select
          value={state.sector}
          onValueChange={(v) => setState((s) => ({ ...s, sector: v }))}
        >
          <SelectTrigger className={`h-11 rounded-xl bg-white/80 ${showErrors && missing.sector ? "ring-2 ring-rose-500" : ""}`}>
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
        {showErrors && missing.sector && (
          <p className="mt-2 text-xs font-semibold text-rose-600">Välj en sektor.</p>
        )}
      </Field>
      </div>

      {/* EU data weight */}
      <div className={errCls(missing.euDataWeight)} data-missing={showErrors && missing.euDataWeight}>
      <Field label="Hur viktig är EU-datalagring för er?">
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Inte viktigt", value: 1 },
            { label: "Lite viktigt", value: 2 },
            { label: "Ganska viktigt", value: 3 },
            { label: "Mycket viktigt", value: 4 },
            { label: "Avgörande", value: 5 },
          ].map((opt) => {
            const active = state.euDataWeight === opt.value;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => setState((s) => ({ ...s, euDataWeight: opt.value }))}
                aria-pressed={active}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ring-1 ${
                  active
                    ? "bg-foreground text-background ring-foreground"
                    : "bg-white/70 text-foreground/80 ring-white/70 hover:bg-white"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {showErrors && missing.euDataWeight && (
          <p className="mt-2 text-xs font-semibold text-rose-600">Välj ett alternativ.</p>
        )}
      </Field>
      </div>

      {/* Readiness */}
      <div className={errCls(missing.readiness)} data-missing={showErrors && missing.readiness}>
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
        {showErrors && missing.readiness && (
          <p className="mt-2 text-xs font-semibold text-rose-600">Välj ett alternativ.</p>
        )}
      </Field>
      </div>
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

const Step6ScoreSummary = ({
  vendors,
  step1,
  quick,
  deepByVendor,
  activeDeepQuestions,
}: {
  vendors: VendorLike[];
  step1: Step1State;
  quick: Answers;
  deepByVendor: Record<string, Answers>;
  activeDeepQuestions: Question[];
  scoredMap: ScoredMap;
}) => {
  // Hämta full leverantörsdetalj (cert, regioner, böter) för EU-kortet.
  const [detailsById, setDetailsById] = useState<Record<string, ApiVendorDetail>>({});
  const [loading, setLoading] = useState(true);
  const apiIdsKey = vendors.map((v) => v.apiId ?? "").filter(Boolean).join("|");

  useEffect(() => {
    let active = true;
    const ids = vendors.map((v) => v.apiId).filter((id): id is string => !!id);
    if (ids.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.allSettled(ids.map((id) => fetchVendor(id))).then((res) => {
      if (!active) return;
      const map: Record<string, ApiVendorDetail> = {};
      res.forEach((r, i) => {
        if (r.status === "fulfilled") map[ids[i]] = r.value;
      });
      setDetailsById(map);
      setLoading(false);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiIdsKey]);

  const details = useMemo(() => Object.values(detailsById), [detailsById]);

  /* ---- Kort 1: Snabbanalys ---- */
  const snabbScore = useMemo(() => weightedAverage(QUICK_SCAN, quick), [quick]);
  const quickControl = (id: string): BreakdownControl => {
    const q = QUICK_SCAN.find((x) => x.id === id);
    if (!q) return { id, label: id, answer: "—", score: 0 };
    return { id, label: q.text, answer: quick[id] ?? "Ej besvarad", score: scoreFor(q, quick) };
  };
  const snabbRegelverk: BreakdownRegelverk[] = [
    {
      name: "GDPR",
      desc: "Dataskydd & personuppgifter",
      categories: [
        {
          name: "Dataskydd",
          controls: ["qs_sensitive_data", "qs_legal_agreements", "qs_encryption_keys"].map(
            quickControl,
          ),
        },
      ],
    },
    {
      name: "NIS2",
      desc: "Verksamhetskritikalitet",
      categories: [
        { name: "Kontinuitet", controls: [quickControl("qs_business_critical")] },
      ],
    },
  ];

  /* ---- Kort 2: Fördjupad analys ---- */
  const deepAgg = useMemo(() => {
    const map: Record<string, { scores: number[]; answers: string[] }> = {};
    for (const ans of Object.values(deepByVendor)) {
      for (const q of activeDeepQuestions) {
        if (ans[q.id]) {
          (map[q.id] ??= { scores: [], answers: [] }).scores.push(scoreFor(q, ans));
          map[q.id].answers.push(ans[q.id]);
        }
      }
    }
    return map;
  }, [deepByVendor, activeDeepQuestions]);

  const deepControl = (q: Question): BreakdownControl => {
    const agg = deepAgg[q.id];
    if (!agg || agg.scores.length === 0)
      return { id: q.id, label: q.text, answer: "Ej besvarad", score: 0 };
    const score = Math.round(agg.scores.reduce((a, b) => a + b, 0) / agg.scores.length);
    const uniq = Array.from(new Set(agg.answers));
    const answer = uniq.length === 1 ? uniq[0] : `${uniq.length} olika svar`;
    return { id: q.id, label: q.text, answer, score };
  };

  const deepScore = useMemo(() => {
    const per = Object.values(deepByVendor)
      .filter((a) => Object.keys(a).length > 0)
      .map((a) => weightedAverage(activeDeepQuestions, a));
    return per.length ? Math.round(per.reduce((a, b) => a + b, 0) / per.length) : 0;
  }, [deepByVendor, activeDeepQuestions]);

  const deepCat = (name: string): BreakdownCategory => ({
    name,
    controls: activeDeepQuestions.filter((q) => q.kategori === name).map(deepControl),
  });

  const deepRegelverk: BreakdownRegelverk[] = [
    {
      name: "GDPR",
      desc: "Datalagring, jurisdiktion & ägarskap",
      categories: [deepCat("Datalagring och jurisdiktion"), deepCat("Ägarskap och regelverk")],
    },
    {
      name: "DORA",
      desc: "Digital driftsmotståndskraft",
      categories: [deepCat("Incidenthantering")],
    },
    {
      name: "NIS2",
      desc: "Cybersäkerhet för kritiska sektorer",
      categories: [deepCat("Säkerhetsnivå")],
    },
  ].map((r) => ({ ...r, categories: r.categories.filter((c) => c.controls.length > 0) }));

  /* ---- Kort 3: EU-efterlevnad & Suveränitet ---- */
  const avgCert = (key: keyof ApiVendorDetail["features"]["certifications"]): number | null => {
    const vals = details
      .map((d) => d.features.certifications[key])
      .filter((v): v is number => typeof v === "number");
    if (!vals.length) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100);
  };
  const fracTrue = (pick: (d: ApiVendorDetail) => boolean): number | null => {
    if (!details.length) return null;
    return Math.round((details.filter(pick).length / details.length) * 100);
  };

  const euCtrl = (label: string, score: number | null): BreakdownControl => ({
    id: label,
    label,
    answer:
      score === null
        ? "Saknar data"
        : score >= 75
          ? "Uppfylls"
          : score >= 50
            ? "Delvis uppfyllt"
            : "Brister",
    score: score ?? 0,
  });

  const euRegelverk: BreakdownRegelverk[] = [
    {
      name: "GDPR",
      desc: "Dataskydd & lagringsplats",
      categories: [
        {
          name: "Dataskydd & lagring",
          controls: [
            euCtrl("GDPR-åtaganden", avgCert("gdpr_commitments")),
            euCtrl("ISO 27001-certifiering", avgCert("iso27001")),
            euCtrl("Lagring inom EU/EES", fracTrue((d) => d.features.storage_in_eu)),
          ],
        },
      ],
    },
    {
      name: "DORA",
      desc: "Finansiell driftsmotståndskraft",
      categories: [
        {
          name: "Driftskontroller",
          controls: [
            euCtrl("DORA-efterlevnad", avgCert("dora")),
            euCtrl("SOC 2-attestering", avgCert("soc2")),
          ],
        },
      ],
    },
    {
      name: "NIS2",
      desc: "Cybersäkerhetskrav",
      categories: [
        {
          name: "Cybersäkerhet",
          controls: [
            euCtrl("NIS2-efterlevnad", avgCert("nis2")),
            euCtrl("C5-attestering", avgCert("c5_attestation")),
          ],
        },
      ],
    },
  ];

  const euScore = useMemo(() => {
    const all = euRegelverk
      .flatMap((r) => r.categories.flatMap((c) => c.controls))
      .map((c) => c.score);
    if (step1.euDataWeight && !details.length) return Math.round((step1.euDataWeight / 5) * 100);
    return all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details, step1.euDataWeight]);

  // Tidigare böter — sammanställs från leverantörsdata.
  const fines = useMemo(
    () =>
      details
        .filter((d) => d.features.gdpr_fines_count > 0 || (d.features.gdpr_fines_total_eur ?? 0) > 0)
        .map((d) => ({
          vendor: d.name,
          breach: "GDPR-överträdelse",
          count: d.features.gdpr_fines_count,
          amount: d.features.gdpr_fines_total_eur ?? 0,
        })),
    [details],
  );

  const total = Math.round(
    snabbScore * BREAKDOWN_WEIGHTS.snabb +
      deepScore * BREAKDOWN_WEIGHTS.deep +
      euScore * BREAKDOWN_WEIGHTS.eu,
  );

  const cards = [
    { key: "snabb", title: "Snabbanalys", weight: 20, score: snabbScore, regelverk: snabbRegelverk },
    { key: "deep", title: "Fördjupad analys", weight: 50, score: deepScore, regelverk: deepRegelverk },
    {
      key: "eu",
      title: "EU-efterlevnad & Suveränitet",
      weight: 30,
      score: euScore,
      regelverk: euRegelverk,
    },
  ];

  return (
    <section className="rounded-3xl bg-[hsl(var(--sky-100))] p-6 ring-1 ring-[hsl(var(--sky-200))] shadow-[var(--shadow-deep)] md:p-8">
      <header className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Så räknades poängen fram
        </h2>
        <p className="mt-1 text-sm font-medium text-foreground/60">
          Klicka på ett kort för att se underliggande regelverk, kategorier och kontroller.
        </p>
      </header>

      {loading && (
        <div className="mb-4 flex items-center gap-2 text-sm text-foreground/70">
          <Loader2 className="h-4 w-4 animate-spin" /> Hämtar leverantörsdata…
        </div>
      )}

      {/* Interaktiva, expanderbara kort */}
      <Accordion type="multiple" className="space-y-3">
        {cards.map((card) => (
          <AccordionItem
            key={card.key}
            value={card.key}
            className="overflow-hidden rounded-2xl border-0 bg-white/80 ring-1 ring-[hsl(var(--sky-200))] shadow-sm"
          >
            <AccordionTrigger className="px-5 py-4 hover:no-underline">
              <div className="flex w-full items-center justify-between gap-3 pr-2">
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-foreground">{card.title}</span>
                  <span className="inline-flex items-center rounded-full bg-[hsl(var(--sky-200))] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                    Vikt {card.weight}%
                  </span>
                </div>
                <span className="text-xl font-bold tabular-nums text-foreground">
                  {card.score}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--sky-200))]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, card.score)}%`, background: "var(--gradient-cta)" }}
                />
              </div>

              {/* Nivå 2: Regelverk */}
              <Accordion type="multiple" className="space-y-2">
                {card.regelverk.map((rv) => (
                  <AccordionItem
                    key={rv.name}
                    value={`${card.key}-${rv.name}`}
                    className="rounded-xl border-0 bg-[hsl(var(--sky-100))] ring-1 ring-[hsl(var(--sky-200))]"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center gap-2.5 text-left">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                        <span className="text-sm font-bold text-foreground">{rv.name}</span>
                        <span className="text-xs font-medium text-foreground/50">{rv.desc}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {/* Nivå 3: Kategorier → Kontroller */}
                      <div className="space-y-3">
                        {rv.categories.map((cat) => (
                          <div
                            key={cat.name}
                            className="rounded-lg bg-white/80 p-3 ring-1 ring-border/50"
                          >
                            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground/50">
                              {cat.name}
                            </p>
                            <div>
                              {cat.controls.map((c) => (
                                <ControlRow key={c.id} c={c} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {/* EU-kort: telemetri + bötestabell */}
              {card.key === "eu" && (
                <div className="mt-4 space-y-4">
                  {/* Leverantörstelemetri */}
                  <div className="rounded-xl bg-white/80 p-4 ring-1 ring-border/50">
                    <div className="mb-3 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      <p className="text-sm font-bold text-foreground">Leverantörstelemetri</p>
                    </div>
                    {details.length === 0 ? (
                      <p className="text-sm text-foreground/55">Ingen telemetridata tillgänglig.</p>
                    ) : (
                      <div className="space-y-3">
                        {details.map((d) => {
                          const t = telemetryFor(d);
                          return (
                            <div key={d.id}>
                              <p className="mb-1.5 text-xs font-semibold text-foreground/70">
                                {d.name}
                              </p>
                              <div className="grid grid-cols-3 gap-2">
                                <RegionCell
                                  icon={Globe}
                                  label="Ursprung"
                                  location={t.origin.text}
                                  status={t.origin.status}
                                />
                                <RegionCell
                                  icon={Cpu}
                                  label="Bearbetning"
                                  location={t.processing.text}
                                  status={t.processing.status}
                                />
                                <RegionCell
                                  icon={Server}
                                  label="Lagring"
                                  location={t.storage.text}
                                  status={t.storage.status}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Tidigare böter */}
                  <div className="rounded-xl bg-white/80 p-4 ring-1 ring-border/50">
                    <div className="mb-3 flex items-center gap-2">
                      <Gavel className="h-4 w-4 text-primary" />
                      <p className="text-sm font-bold text-foreground">Tidigare böter</p>
                    </div>
                    {fines.length === 0 ? (
                      <p className="text-sm text-foreground/55">
                        Inga registrerade regulatoriska böter.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-xs">Regelöverträdelse</TableHead>
                            <TableHead className="text-xs">Antal</TableHead>
                            <TableHead className="text-right text-xs">Belopp</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fines.map((f, i) => (
                            <TableRow key={i} className="hover:bg-transparent">
                              <TableCell className="py-2.5">
                                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                                  <ScrollText className="h-3.5 w-3.5 text-rose-500" />
                                  {f.vendor} — {f.breach}
                                </span>
                              </TableCell>
                              <TableCell className="py-2.5 text-sm text-foreground/70">
                                {f.count || "—"}
                              </TableCell>
                              <TableCell className="py-2.5 text-right text-sm font-semibold tabular-nums text-foreground">
                                {f.amount > 0 ? eurFmt.format(f.amount) : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Totalpoäng — mörk navy-footer */}
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-foreground px-6 py-5 text-background shadow-[var(--shadow-deep)]">
        <div>
          <p className="text-base font-bold">Totalpoäng</p>
          <p className="text-[11px] font-medium text-background/60">
            Snabbanalys 20% · Fördjupad analys 50% · EU-efterlevnad 30%
          </p>
        </div>
        <p className="text-4xl font-bold tabular-nums">{total}</p>
      </div>

      <p className="mt-5 text-xs text-foreground/55">
        Mätning sker mot Eurostack-standard (DORA, NIS2, GDPR, Data Act, EU-suveränitet).
        Kontrollerna poängsätts: Ja = 100, Delvis = 50, Nej = 0.
      </p>
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
  scoredMap,
  scoring,
  scoreError,
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
  const deepFor = (v: VendorLike) => deepByVendor[v.id] ?? {};
  const [openId, setOpenId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch EU alternatives per unique vendor category from API.
  const [altsByCategory, setAltsByCategory] = useState<Record<string, string[]>>({});
  const categoriesKey = vendors.map((v) => v.apiCategory ?? v.type ?? "").filter(Boolean).join("|");
  useEffect(() => {
    const cats = Array.from(new Set(
      vendors.map((v) => v.apiCategory ?? v.type).filter((t): t is string => !!t),
    ));
    cats.forEach((cat) => {
      setAltsByCategory((prev) => (prev[cat] ? prev : { ...prev, [cat]: [] }));
      fetchAlternatives(cat)
        .then((r) => setAltsByCategory((prev) => ({ ...prev, [cat]: r.eu_alternatives })))
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriesKey]);

  // Fetch full vendor detail (origin/processing/storage regions) per API vendor.
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

  // Resolve the three technical regions for a vendor (falls back to list-view booleans).
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
    const statuses: RegionStatus[] = [originStatus, procStatus, storageStatus];
    const hasNonEu = statuses.includes("noneu");
    const hasUnknown = statuses.includes("unknown");
    const euOnes = statuses.filter((s) => s === "eu").length;
    const mismatch = euOnes > 0 && euOnes < 3; // some EU, some not
    return {
      loading: !!v.apiId && !d,
      origin: { text: originText, status: originStatus },
      processing: { text: procText, status: procStatus },
      storage: { text: storageText, status: storageStatus },
      hasNonEu,
      hasUnknown,
      mismatch,
    };
  };

  const altFor = (v: VendorLike): { name: string; country: string; reason: string } => {
    const cat = v.apiCategory ?? v.type;
    const list = cat ? altsByCategory[cat] ?? [] : [];
    const name = list[0];
    if (name) {
      return {
        name,
        country: "EU",
        reason: "EU-baserat alternativ från Eurostack-datasetet.",
      };
    }
    return {
      name: "Inga EU-alternativ taggade för denna kategori",
      country: "—",
      reason: "Saknas i modellen — granska manuellt.",
    };
  };



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

  // Simplified split: "Kända" contains every active vendor regardless of how
  // it was added (snabbval or manual). "Nischade" only lists vendors that
  // have actually been put through the deep-dive — those answers exist in
  // `deepByVendor`. This avoids any reliance on a backend "general vs niche"
  // category, which the database doesn't model.
  const kanda = vendors;
  const nischade = vendors.filter(
    (v) => Object.keys(deepByVendor[v.id] ?? {}).length > 0,
  );

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

      // Palette (RGB)
      const C = {
        primary: [15, 27, 61] as [number, number, number],
        primarySoft: [30, 58, 95] as [number, number, number],
        emerald: [16, 185, 129] as [number, number, number],
        rose: [225, 29, 72] as [number, number, number],
        amber: [245, 158, 11] as [number, number, number],
        text: [20, 24, 35] as [number, number, number],
        muted: [107, 114, 128] as [number, number, number],
        line: [229, 231, 235] as [number, number, number],
        zebra: [248, 250, 252] as [number, number, number],
        white: [255, 255, 255] as [number, number, number],
      };
      const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
      const setStroke = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);
      const setText = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);

      // Data
      const perVendorTotals = vendors.map((v) => computeVendorScore(v, scoredMap).total);
      const total = perVendorTotals.length
        ? Math.round(perVendorTotals.reduce((a, b) => a + b, 0) / perVendorTotals.length)
        : 0;
      const euCount = vendors.filter(isEU).length;
      const nonEuCount = vendors.length - euCount;
      const euPct = vendors.length ? Math.round((euCount / vendors.length) * 100) : 0;

      // ===== Header band =====
      setFill(C.primary);
      doc.rect(0, 0, pageW, 90, "F");
      setFill(C.emerald);
      doc.rect(0, 90, pageW, 3, "F");
      setText(C.white);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Eurostack — Suveränitetsrapport", margin, 48);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(200, 215, 235);
      const headRight = `${new Date().toLocaleDateString("sv-SE")}  ·  ${vendors.length} leverantörer`;
      doc.text(headRight, pageW - margin, 48, { align: "right" });
      doc.setFontSize(9);
      doc.text("Datadriven analys baserad på EU-suveränitetsmodell", margin, 68);

      let y = 90 + 28;

      // ===== Summary card with donut =====
      const cardH = 170;
      setFill(C.zebra);
      setStroke(C.line);
      doc.setLineWidth(0.6);
      doc.roundedRect(margin, y, pageW - margin * 2, cardH, 6, 6, "FD");

      // Donut (left)
      const cx = margin + 80;
      const cy = y + cardH / 2;
      const rOuter = 55;
      const rInner = 34;
      const drawDonutSegment = (
        startAngle: number,
        endAngle: number,
        color: [number, number, number],
      ) => {
        setFill(color);
        const steps = Math.max(8, Math.ceil(((endAngle - startAngle) / (Math.PI * 2)) * 80));
        for (let i = 0; i < steps; i++) {
          const a1 = startAngle + ((endAngle - startAngle) * i) / steps;
          const a2 = startAngle + ((endAngle - startAngle) * (i + 1)) / steps;
          const x1o = cx + rOuter * Math.cos(a1);
          const y1o = cy + rOuter * Math.sin(a1);
          const x2o = cx + rOuter * Math.cos(a2);
          const y2o = cy + rOuter * Math.sin(a2);
          const x1i = cx + rInner * Math.cos(a1);
          const y1i = cy + rInner * Math.sin(a1);
          const x2i = cx + rInner * Math.cos(a2);
          const y2i = cy + rInner * Math.sin(a2);
          // Quad as two triangles
          doc.triangle(x1o, y1o, x2o, y2o, x2i, y2i, "F");
          doc.triangle(x1o, y1o, x2i, y2i, x1i, y1i, "F");
        }
      };

      if (vendors.length === 0) {
        setFill(C.line);
        doc.circle(cx, cy, rOuter, "F");
        setFill(C.white);
        doc.circle(cx, cy, rInner, "F");
      } else {
        const euFrac = euCount / vendors.length;
        const start = -Math.PI / 2;
        if (euFrac > 0) drawDonutSegment(start, start + Math.PI * 2 * euFrac, C.emerald);
        if (euFrac < 1) drawDonutSegment(start + Math.PI * 2 * euFrac, start + Math.PI * 2, C.rose);
      }
      // Center label
      setText(C.primary);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(`${euPct}%`, cx, cy + 2, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setText(C.muted);
      doc.text("EU", cx, cy + 14, { align: "center" });

      // Legend under donut
      const legY = y + cardH - 22;
      setFill(C.emerald);
      doc.rect(cx - 56, legY, 8, 8, "F");
      setText(C.text);
      doc.setFontSize(9);
      doc.text(`EU (${euCount})`, cx - 44, legY + 7);
      setFill(C.rose);
      doc.rect(cx + 6, legY, 8, 8, "F");
      doc.text(`Icke-EU (${nonEuCount})`, cx + 18, legY + 7);

      // Stats (right)
      const sx = margin + 180;
      let sy = y + 28;
      setText(C.muted);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("SAMMANFATTNING", sx, sy);
      sy += 16;
      const statRow = (label: string, value: string) => {
        setText(C.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(label, sx, sy);
        setText(C.text);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(value, sx + 160, sy, { align: "left" });
        sy += 18;
      };
      statRow("Total Eurostack-score", `${total} / 100`);
      statRow("EU-leverantörer", `${euCount} (${euPct}%)`);
      statRow("Icke-EU-leverantörer", `${nonEuCount} (${100 - euPct}%)`);
      statRow("Sektor", step1.sector || "–");
      const prios = step1.priorities.join(", ") || "–";
      statRow("Prioriteringar", prios.length > 38 ? prios.slice(0, 36) + "…" : prios);

      y += cardH + 26;

      // ===== Vendors table =====
      setText(C.text);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Leverantörer", margin, y);
      y += 12;

      const cols = [
        { key: "#", w: 24, align: "left" as const },
        { key: "Leverantör", w: 130, align: "left" as const },
        { key: "Kategori", w: 100, align: "left" as const },
        { key: "Region", w: 60, align: "left" as const },
        { key: "Status", w: 110, align: "left" as const },
        { key: "Score", w: 75, align: "right" as const },
      ];
      const tableW = cols.reduce((a, c) => a + c.w, 0);
      const tableX = margin;
      const rowH = 22;

      const drawHeader = () => {
        setFill(C.primary);
        doc.rect(tableX, y, tableW, rowH, "F");
        setText(C.white);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        let x = tableX + 8;
        cols.forEach((c) => {
          doc.text(
            c.key,
            c.align === "right" ? x + c.w - 16 : x,
            y + rowH / 2 + 3,
            { align: c.align === "right" ? "right" : "left" },
          );
          x += c.w;
        });
        y += rowH;
      };

      drawHeader();

      const ensureSpace = (need: number) => {
        if (y + need > pageH - 60) {
          doc.addPage();
          y = margin;
          drawHeader();
        }
      };

      vendors.forEach((v, i) => {
        ensureSpace(rowH);
        const status = statusFromVendor(v, scoredMap);
        const score = computeVendorScore(v, scoredMap).total;
        const eu = isEU(v);
        // Zebra
        if (i % 2 === 0) {
          setFill(C.zebra);
          doc.rect(tableX, y, tableW, rowH, "F");
        }
        // Bottom line
        setStroke(C.line);
        doc.setLineWidth(0.3);
        doc.line(tableX, y + rowH, tableX + tableW, y + rowH);

        let x = tableX + 8;
        const cellY = y + rowH / 2 + 3;
        setText(C.text);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);

        const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max - 1) + "…" : s);

        // #
        doc.text(String(i + 1), x, cellY);
        x += cols[0].w;
        // Name
        doc.setFont("helvetica", "bold");
        doc.text(clip(v.name || "–", 28), x, cellY);
        doc.setFont("helvetica", "normal");
        x += cols[1].w;
        // Category
        setText(C.muted);
        doc.text(clip(v.type ?? "–", 22), x, cellY);
        x += cols[2].w;
        // Region pill
        const regionLabel = eu ? "EU" : "Icke-EU";
        const regionColor = eu ? C.emerald : C.rose;
        setFill(regionColor);
        doc.roundedRect(x, y + 5, 44, rowH - 10, 6, 6, "F");
        setText(C.white);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(regionLabel, x + 22, y + rowH / 2 + 2.5, { align: "center" });
        x += cols[3].w;
        // Status pill
        const stTone = status.tone as "ok" | "warn" | "bad" | string;
        const stColor =
          stTone === "ok" ? C.emerald : stTone === "warn" ? C.amber : C.rose;
        setFill(stColor);
        const stLabel = clip(status.label, 18);
        const stW = Math.min(96, doc.getTextWidth(stLabel) + 16);
        doc.roundedRect(x, y + 5, stW, rowH - 10, 6, 6, "F");
        setText(C.white);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(stLabel, x + stW / 2, y + rowH / 2 + 2.5, { align: "center" });
        x += cols[4].w;
        // Score
        setText(C.text);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(`${score}`, x + cols[5].w - 16, cellY, { align: "right" });

        y += rowH;
      });

      y += 22;

      // ===== EU alternatives =====
      const nonEuVendors = vendors.filter((v) => !isEU(v));
      if (nonEuVendors.length > 0) {
        ensureSpace(40);
        setText(C.text);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Rekommenderade EU-alternativ", margin, y);
        y += 14;
        nonEuVendors.forEach((v) => {
          ensureSpace(20);
          const alt = altFor(v);
          setFill(C.zebra);
          setStroke(C.line);
          doc.setLineWidth(0.4);
          doc.roundedRect(margin, y, pageW - margin * 2, 22, 4, 4, "FD");
          setText(C.text);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.text(v.name, margin + 10, y + 14);
          setText(C.muted);
          doc.setFont("helvetica", "normal");
          doc.text("→", margin + 130, y + 14);
          setText(C.emerald);
          doc.setFont("helvetica", "bold");
          doc.text(alt.name, margin + 145, y + 14);
          setText(C.muted);
          doc.setFont("helvetica", "normal");
          doc.text(`(${alt.country})`, margin + 145 + doc.getTextWidth(alt.name) + 6, y + 14);
          y += 26;
        });
      }

      // ===== Footer on every page =====
      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        setStroke(C.line);
        doc.setLineWidth(0.4);
        doc.line(margin, pageH - 36, pageW - margin, pageH - 36);
        setText(C.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("© 2026 Lumen Analytics AB — Eurostack", margin, pageH - 22);
        doc.text(`Sida ${p} / ${pageCount}`, pageW - margin, pageH - 22, { align: "right" });
      }

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
    const { total: tot } = computeVendorScore(v, scoredMap);
    const status = statusFromVendor(v, scoredMap);
    const badges = buildBadges(quick, deep, hasDeep);
    const isOpen = !eu ? true : openId === v.id;
    const alt = altFor(v);
    const reg = regionsFor(v);

    return (
      <div
        key={v.id}
        className={`w-full rounded-2xl bg-white/75 p-4 ring-1 transition ${
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
        </button>

        {/* 1 — TECHNICAL PROVENANCE: where data originates → is processed → is stored */}
        <div
          className={`mt-3 rounded-xl p-3 ring-1 ${
            reg.hasNonEu
              ? "bg-rose-50/70 ring-rose-200"
              : reg.hasUnknown
                ? "bg-amber-50/60 ring-amber-200"
                : "bg-emerald-50/60 ring-emerald-200"
          }`}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-foreground/55">
              Teknisk dataproveniens
            </p>
            {reg.hasNonEu ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-700">
                <AlertTriangle className="h-3 w-3" />
                Risk för avbrott
              </span>
            ) : reg.mismatch ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700">
                <AlertTriangle className="h-3 w-3" />
                Jurisdiktionsglapp
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Samlad i EU
              </span>
            )}
          </div>

          {reg.loading ? (
            <p className="flex items-center gap-2 py-2 text-[11px] font-medium text-foreground/55">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Hämtar regioner…
            </p>
          ) : (
            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-1">
              <RegionCell icon={Globe} label="Ursprung" location={reg.origin.text} status={reg.origin.status} />
              <FlowArrow />
              <RegionCell icon={Cpu} label="Bearbetning" location={reg.processing.text} status={reg.processing.status} />
              <FlowArrow />
              <RegionCell icon={Server} label="Lagring" location={reg.storage.text} status={reg.storage.status} />
            </div>
          )}

          {!reg.loading && (reg.hasNonEu || reg.mismatch) && (
            <p className="mt-2 text-[10px] font-medium leading-snug text-foreground/70">
              {reg.hasNonEu
                ? "Data lämnar EU i ett eller flera led – konkret risk för avbrott eller dataåtkomst under tredjelandsregler (t.ex. US CLOUD Act)."
                : "Regionerna spänner över olika jurisdiktioner – verifiera dataflödet mellan ursprung, bearbetning och lagring."}
            </p>
          )}
        </div>

        {/* Risk read */}
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

        {/* 2 — REGULATORY SUPPORT: certifications as secondary verification ("bevisbörda") */}
        <div className="mt-3 rounded-lg bg-white/60 px-2.5 py-2 ring-1 ring-white/70">
          <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-foreground/55">
            <BadgeCheck className="h-3 w-3 text-blue-500" aria-hidden="true" />
            Regulatoriskt stöd · Bevisbörda
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {badges.map((b) => {
              const pass = b.value >= 70;
              const partial = b.value >= 40 && b.value < 70;
              const Mark = pass ? CheckCircle2 : partial ? AlertTriangle : XCircle;
              const markColor = pass ? "text-emerald-600" : partial ? "text-amber-600" : "text-rose-500";
              return (
                <div
                  key={b.key}
                  title={b.evidence}
                  className="flex items-center gap-1.5 rounded-md bg-white/80 px-2 py-1 ring-1 ring-white/70"
                >
                  <Mark className={`h-3.5 w-3.5 flex-shrink-0 ${markColor}`} aria-hidden="true" />
                  <span className="truncate text-[10px] font-semibold text-foreground/75">{b.label}</span>
                  <span className="ml-auto text-[10px] font-bold text-foreground/55">{b.value}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3 — ACTIONABLE SOLUTION: European alternative */}
        {!eu && isOpen && (
          <div className="mt-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="rounded-lg bg-emerald-200/40 p-3 ring-1 ring-emerald-300/50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-900/70">
                Matchande EU-alternativ
              </p>
              <p className="mt-0.5 text-sm font-bold text-emerald-950">{alt.name}</p>
              <p className="text-[11px] font-medium text-emerald-900/75">{alt.country}</p>
              <p className="mt-1 text-[11px] text-emerald-900/85">{alt.reason}</p>
            </div>
          </div>
        )}
      </div>
    );
  };


  return (
    <Card
      title="Resultat på mätning"
      subtitle="Översikt av era leverantörer mätt mot Eurostack-standard."
    >
      {/* HEADER: Donut + summary */}
      <div className="mb-8 flex flex-col items-center gap-6 rounded-2xl bg-white/60 p-5 ring-1 ring-white/70 md:flex-row md:items-center md:gap-8">
        <div
          className="relative h-36 w-36 flex-shrink-0"
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
        </div>



        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/55">
            Efterlevnadsstatus
          </p>
          <p className="mt-1 text-lg font-bold text-foreground">{complianceText}</p>
          {(() => {
            const rating =
              euPct >= 90
                ? { label: "Utmärkt", tone: "text-emerald-700 bg-emerald-100" }
                : euPct >= 80
                  ? { label: "Bra", tone: "text-emerald-700 bg-emerald-100" }
                  : euPct >= 60
                    ? { label: "Acceptabelt", tone: "text-amber-700 bg-amber-100" }
                    : { label: "Otillräckligt", tone: "text-rose-700 bg-rose-100" };
            const meets = euPct >= 80;
            return (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${rating.tone}`}>
                  {rating.label} enligt Eurostack-standard
                </span>
                <span className="text-[11px] font-medium text-foreground/60">
                  {meets
                    ? `Tröskeln på 80 % är uppnådd (+${euPct - 80} p över gränsen).`
                    : `${80 - euPct} p kvar till Eurostack-tröskeln på 80 %.`}
                </span>
                <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Vad krävs för 100 %?"
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-foreground/40 transition hover:bg-white hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs rounded-lg bg-foreground px-3 py-2 text-xs font-medium leading-relaxed text-background shadow-lg">
                    För att nå 100 % krävs att samtliga leverantörer har huvudkontor och datalagring inom EU/EES, omfattas av EU-jurisdiktion (utan CLOUD Act-exponering) och uppfyller fullständig efterlevnad av GDPR, NIS2 och DORA. Eurostack-tröskeln går vid 80 %.
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })()}
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

      {/* UNIFIED VENDOR ANALYSIS */}
      <div className="mb-6">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-bold text-foreground">
            Leverantörsanalys <span className="text-foreground/50">· Samlad vy</span>
          </h3>
          <span className="text-[11px] font-medium text-foreground/55">
            {vendors.length > 0
              ? `${vendors.length} leverantör${vendors.length === 1 ? "" : "er"}`
              : "Tom lista"}
          </span>
        </div>
        <div className="flex flex-col gap-3 pb-3">
          {vendors.length > 0 ? (
            vendors.map(renderCard)
          ) : (
            <div className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-foreground/20 bg-white/50 px-4 py-8 text-center">
              <Inbox className="h-6 w-6 text-foreground/40" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground/70">
                Inga leverantörer ännu
              </p>
              <p className="text-xs text-foreground/55">
                Lägg till leverantörer via snabbval eller manuell registrering för att se analysen här.
              </p>
            </div>
          )}
        </div>
      </div>


      {/* Sticky Actions */}
      <div className="sticky bottom-4 mt-4 flex flex-col items-center gap-2">
        <Button
          onClick={() => {
            const scores: Record<string, number> = {};
            const scoredArr: RescoredVendor[] = [];
            vendors.forEach((v) => {
              const r = computeVendorScore(v, scoredMap);
              scores[v.id] = r.total;
              if (r.rec) scoredArr.push(r.rec);
            });
            navigate("/atgardsplan", { state: { vendors, scores, scored: scoredArr } });
          }}
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

    </Card>
  );
};

export default Quiz;
