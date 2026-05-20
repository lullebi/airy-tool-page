# API-koppling: Eurostack → UI

Mål: Riv ut lokal scoring och hårdkodade vendor-listor. All data och scoring kommer från `https://eurostack-api.onrender.com`. Inga ändringar i `Index.tsx`, design-tokens, UI-komponenter eller routes.

## Nya filer

### `src/lib/api.ts`
Tunn klient + typer enligt specifikationen i instruktionerna:
- Typer: `VendorClass`, `ApiVendorListItem`, `ApiVendorDetail`, `ScoreWeights`, `RescoredVendor`.
- Funktioner: `fetchVendors()`, `fetchVendor(id)`, `fetchAlternatives(kategori)`, `fetchMeta()`, `rescore(ids, weights)`.
- `asJson<T>` med tydligt fel vid !ok.

### `src/lib/vendorMapper.ts`
- `VendorLike` (bevarar existerande form + nytt `apiId: string`).
- `apiToVendorLike(v)` mappar API-listobjekt → `VendorLike`.

### `src/lib/scoringConstants.ts`
- `CLASS_TAILWIND`, `CLASS_LABELS`, `SCORE_CAP = 85`, `SCORE_TOOLTIP`, `RISK_DRIVER_SV` enligt spec.
- `prioritiesToWeights(priorities)` — chip-label → `ScoreWeights` (Säkerhet→säkerhet, Efterlevnad→compliance, Flexibilitet+Skalbarhet→flexibilitet, Kostnad ignoreras).

## Ändringar

### `src/pages/RegistreraLeverantorer.tsx`
- Ta bort `QUICK_PICKS` och `VENDOR_TYPES`.
- `useEffect` + `useState` hämtar `fetchVendors()` vid mount. Spinner under load (≥40 s tolerans för Render-kallstart). På fel: `toast.error("Kunde inte ladda — försök igen")`.
- Snabbval-griden renderar de 12 första vendor-namnen från API:t. Klick fyller form-card som idag, men sparar även `apiId`.
- `Vendor`-typen utökas med `apiId?: string`. Vid custom vendor: `apiId` saknas → varnar och utesluts från `/score`-anrop (eller blockar "Starta").
- Skickar fortsatt `vendors` via `navigate` state till `/quiz`.

### `src/pages/Quiz.tsx`
- Ta bort: `computeVendorScore` (~rad 269), `DEFAULT_VENDORS` (~rad 298), `weightedAverage`-baserad totalscoring i MeasurementStep/ResultsStep, lokala vikt-formler kring `step1.priorities` och `euDataWeight`.
- Behåll: stegens layout, frågedata (QUICK_SCAN/DEEP_DIVE), tooltips. Svaren visas som dokumentation men påverkar inte scoren denna runda.
- Ny state: `scored: RescoredVendor[] | null`, `scoring: boolean`, `scoreError: string | null`.
- Vid övergång till Mätning/Resultat (eller på "Beräkna"-knapp om sådan finns): bygg `apiIds = vendors.map(v => v.apiId).filter(Boolean)`, `weights = prioritiesToWeights(step1.priorities)`, anropa `rescore(apiIds, weights)` en gång.
- Donut, kort-strip, swimlanes använder `contextual_score` (skala 0–85). Tooltip `SCORE_TOOLTIP` på donut/score-badge.
- Klass-färger via `CLASS_TAILWIND[v.class]`, etiketter via `CLASS_LABELS`.
- Risk-drivers: visa `top_risk_drivers.map(d => RISK_DRIVER_SV[d] ?? d)`.
- Step 1 chips: "Kostnad" alltid `disabled`, opacity-50, tooltip "Saknas i modellen — kommer i framtida version", inkluderas ej i `priorities`. "Skalbarhet" aktiv, mappar till flexibilitet via `prioritiesToWeights`.
- Om `apiIds.length === 0` (alla custom utan apiId): visa info-state, ingen score-rendering.

### `src/pages/Atgardsplan.tsx`
- Ta bort `EU_ALTERNATIVES` + `defaultAlternative`.
- Per vendor: `fetchAlternatives(vendor.type)` (om `type` finns). Visa `eu_alternatives`-listan i "Rekommenderat EU-alternativ"-blocket.
- Om `type` saknas eller listan är tom: "Inga EU-alternativ taggade för denna kategori".
- Score/klass: använd `RescoredVendor` om det skickas vidare via route-state; annars hämta `fetchVendor(id)` per vendor för klass + drivers (lättviktigt parallellt med `Promise.all`).

## Refaktor-policy
Bryt bara ut `src/components/quiz/` om Quiz.tsx blir svårt att redigera kirurgiskt. Default: edits in-place.

## Sanity-check efter implementation
- /registrera-leverantorer listar 95 vendors från API.
- "Kostnad"-chippet disablerat med tooltip.
- AWS i Resultat: rose-färgad "Hög kontrollrisk", score ~4/85, drivers innehåller CLOUD Act, HQ ej i EU, Lagring ej i EU.
- OVHcloud: emerald "Låg kontrollrisk", score 70+/85.
- /atgardsplan för AWS listar OVHcloud, Hetzner, Scaleway.
- DevTools Network: `/score`-payload har endast `säkerhet, compliance, flexibilitet`.
- Växla prio från Säkerhet → Flexibilitet ändrar AWS contextual_score märkbart.

## Inte rört
`Index.tsx`, `src/index.css`, `tailwind.config.ts`, `src/components/ui/*`, routes, inga nya features (PDF, sökruta, RSS).
