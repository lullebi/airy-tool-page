## Mål
Flytta klickfunktionen som öppnar "Så räknades poängen fram"-popupen från donutdiagrammet på **Mätningssidan** (Fullständig analys, steg 5) till de svarta score-rutorna på **Resultat-sidan** (steg 4). Innehållet i popupen ska vara identiskt. Score-rutorna ska tydligt signalera att de är klickbara — utan att layout, färg, typografi eller spacing ändras.

Alla ändringar sker i `src/pages/Quiz.tsx`.

## Ändringar

### 1. Mätningssidan (MeasurementStep, ~rad 1499–1524)
- Byt tillbaka `<button onClick={() => setScoreBreakdownOpen(true)} ...>` runt donuten till en vanlig `<div className="relative h-36 w-36 flex-shrink-0">`.
- Ta bort `cursor-pointer`, hover-ring, focus-ring och `aria-label="Visa poängberäkning"`.
- Donutens utseende, storlek och position är oförändrad.

### 2. Mätningssidan — Dialog & state
- Ta bort `<Dialog open={scoreBreakdownOpen} ...>`-blocket (rad 1658–1695).
- Ta bort `scoreBreakdownOpen`-state och de aggregerade variablerna (`aggQuick`, `aggDeep`, `aggEu`, `aggReadiness`, `aggTotal`) som bara används av popupen, om de inte används någon annanstans.
- Behåll Dialog-importerna i filen eftersom de nu används av Step4Result.

### 3. Resultat-sidan (Step4Result, ~rad 925–)
- Lägg till `useState` för `scoreBreakdownOpen` lokalt i komponenten.
- Beräkna aggregerade snittpoäng från `scores`-arrayen: snitt av `quickScore`, `deepScore`, `euWeight`, `readinessScore` och `total` över alla vendors (matchar nuvarande logik på Mätning).
- Wrappa den svarta score-rutan (rad 987–989) i ett `<Tooltip>` + `<button>`:
  - `<button type="button" onClick={() => setScoreBreakdownOpen(true)}>` runt den exakt likadana rutan.
  - Lägg till `cursor-pointer`, mild `hover:ring-2 hover:ring-primary/40`, `focus:outline-none focus:ring-2 focus:ring-primary/50` — samma teknik som donut-knappen hade.
  - `<TooltipContent>`: "Klicka för detaljer".
- Inga textetiketter, ikoner eller extra element läggs till bredvid rutan.

### 4. Resultat-sidan — Dialog
- Lägg in samma Dialog-markup som tidigare fanns på Mätning, med identiskt innehåll (Snabbanalys 35 %, Fördjupad analys 35 %, EU-vikt 15 %, Beredskap 15 %, Totalpoäng), men matad med Resultat-sidans aggregerade värden.
- Placera Dialog inuti `<Card>` så den inte påverkar layout.

## Inte berört
- Inga ändringar i färger, typografi, spacing eller positionering.
- Ingen ny ikon, ingen "Så räknas poängen"-text.
- Per-vendor delpoäng-raderna (`Snabbanalys/Fördjupad analys/EU-vikt/Beredskap`) under varje kort behålls oförändrade.
- All registreringslogik och övriga sidor är orörda.
