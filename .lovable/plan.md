# Fix 9 — snyggare PDF-rapport med donut

Förbättra `handleExport` i `src/pages/Quiz.tsx` så rapporten ser professionell ut och innehåller en donut-graf över EU vs icke-EU.

## Ändringar — bara `src/pages/Quiz.tsx` `handleExport`

**1. Header-band**
- Mörkblå topbar (fylld rect) med vit titel "Eurostack — Suveränitetsrapport" + datum/leverantörsantal höger.
- Tunn accentlinje under.

**2. Sammanfattningskort med donut**
- Vänster: Donut (ritad med `doc.circle` + segment via `doc.lines`/`doc.path` eller flera arc-approx) som visar EU% (emerald) vs icke-EU% (rose). Center-text: stort `euPct%` + "EU".
- Höger: stat-rader — Total score, antal EU, antal icke-EU, sektor, prioriteringar. Tunn ram, ljus bg.

**3. Tabell över leverantörer**
- Header-rad med ljus bg: "#", "Leverantör", "Kategori", "Land", "Region", "Status", "Score".
- Zebra-rader (vit / very-light grey).
- Status som färgad pill (emerald/amber/rose fill + vit text).
- Auto-paginera, repetera tabellhead på ny sida.

**4. EU-alternativ-sektion**
- Endast för icke-EU vendors: kort lista "<vendor> → <alt> (<land>)".

**5. Footer**
- Sidnummer "Sida x / y" höger, copyright vänster, tunn linje över.
- Använd `doc.getNumberOfPages()` loop på slutet för x/y.

**6. Typografi & färger**
- Definiera palette-konstanter (primary `#0F1B3D`, emerald `#10B981`, rose `#E11D48`, amber `#F59E0B`, muted `#6B7280`, line `#E5E7EB`).
- Helvetica genomgående, tydlig hierarki (20/13/10/8).

## Donut-implementation

jsPDF saknar arc — approximera med fyllda kil-polygoner: för varje segment, sampla N punkter på ytter-radien + N på inner-radien (donut hål) och rita som `doc.lines(..., 'F')` eller `doc.triangle`-fan från center. ~60 segment ger jämn kant. Ren matte, inga externa libs.

## Verifiering
- Ladda ner PDF: header-band syns, donut visar rätt EU%, tabell med pills paginerar rent, footer med sidnummer på alla sidor.
- Happy path (M365+Slack+Oderland): donut 33% emerald / 67% rose, tabell 3 rader, EU-alternativ-sektion listar M365 och Slack.

## Out of scope
- Inga nya beroenden (chart.js, html2canvas).
- Atgardsplan-sidan rörs inte.
- Logo/varumärkesbild — bara text-header.
