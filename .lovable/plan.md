# Fix 8 — datadrivna risktexter

Ersätt hårdkodade risktexter i åtgärdsplanen med faktiska `top_risk_drivers` från `/vendors`-svaret. Behåll fallback för manuellt tillagda vendors.

## Ändringar

**1. `src/lib/vendorMapper.ts`**
- Lägg till `top_risk_drivers?: string[]` i `VendorLike`.
- Sätt `top_risk_drivers: v.top_risk_drivers` i `apiToVendorLike`.

**2. `src/pages/RegistreraLeverantorer.tsx`**
- Lägg till `top_risk_drivers?: string[]` i `Vendor`-typen.
- Propagera `top_risk_drivers: pick.top_risk_drivers` i `handleQuickPick` och `VendorNameCombobox onPickApi`.
- Nolla med `top_risk_drivers: undefined` i `onPickCustom` och `onClear`.

**3. `src/pages/Atgardsplan.tsx`**
- Importera `RISK_DRIVER_SV` från `@/lib/scoringConstants`.
- I `rows`-useMemo: om `v.top_risk_drivers?.length`, mappa via `RISK_DRIVER_SV[driver] ?? driver`. Annars fallback (EU→CLOUD Act-text, score-baserade rader, exkl. den gamla "NIS2/DORA-beredskap"-raden — ersätts av "Begränsad regulatorisk dokumentation enligt självskattning").
- Lämna `riskLabel` och score-fallback (75/38) orörda.

## Verifiering

- M365 + Slack: visar CLOUD Act / HQ ej i EU / Lagring ej i EU.
- Oderland: visar cert-score / EU-compliance / CISPE-gap istället för "Inga väsentliga risker".
- EU-alternativ-listan från Fix 7 fungerar fortfarande.

## Out of scope
- Mätningssidans riskprofil (Quiz.tsx).
- `riskLabel`-trösklar och score-fallback.
