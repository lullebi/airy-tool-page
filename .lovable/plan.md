# Plan: Få frontend och backend 100% syncade

## Nuläge (verifierat mot live-API)
Jag testade det driftsatta API:t (`https://eurostack-api.onrender.com`) mot kontraktet. **Alla endpoints svarar och formerna stämmer**: `/`, `/health`, `/vendors`, `/vendors/{id}`, `/score`, `/alternatives/{kategori}`, `/meta`. Frontend anropar redan alla relevanta endpoints korrekt. Det betyder att grund-kopplingen är på plats — det som återstår är robusthet och några små avvikelser mellan kontrakt och kod.

## Vad som faktiskt saknas för att det ska vara 100%

### 1. Render kall-start hanteras inte (största praktiska problemet)
Render gratis-tier somnar efter inaktivitet. Första anropet kan ta 30–60 s eller timea ut, vilket gör att första användaren får fel eller en hängande sida.
- Lägg en central `fetch`-wrapper i `src/lib/api.ts` med timeout + automatisk retry (t.ex. 2 försök med backoff) som tål kall-start.
- Lägg en tyst "warm-up"-ping mot `/health` när appen laddas (t.ex. i `App.tsx`), så servern hinner vakna innan användaren når quizet.

### 2. Felmeddelanden parsas inte enligt kontraktet
Kontraktet säger att alla fel har formen `{ "detail": "..." }`. Idag kastar `asJson` bara `status statusText`, så backendens riktiga meddelande (t.ex. `vendor 'foo' not found`) syns aldrig.
- Uppdatera `asJson` så den läser `detail`-fältet ur felsvaret och använder det i felmeddelandet.

### 3. Typavvikelse: `confidence`
Live-API:t returnerar `confidence: "Average"`, men frontend-typen tillåter bara `"High" | "Medium" | "Low" | null`. Det är en tyst typmismatch.
- Bredda `confidence`-typen i `ApiVendorDetail` så den matchar verkligheten (inkludera `"Average"`, alternativt `string | null`).

### 4. Base-URL hårdkodad
`API_BASE` är hårdkodad. Kontraktet nämner att CORS tightenas till Lovable-domänen efter 2026-06-02 och att lokal dev kör mot `127.0.0.1:8000`.
- Läs base-URL från en env-variabel med nuvarande prod-URL som fallback, så lokal dev och framtida domänbyten inte kräver kodändring.

### 5. Saknad fetcher (valfritt, för komplett kontrakt)
`GET /alternatives` (utan slug, hela kategorimappningen) finns i kontraktet men inte i `api.ts`.
- Lägg till en `fetchAllAlternatives()` (valfritt — bara om vi vill ha hela mappningen cachad).

## Utanför frontend (kräver ML-spåret / Lukas)
Detta kan jag inte fixa i koden men måste göras för 100% sync:
- **CORS efter 2026-06-02:** backend måste allowlista den publicerade Lovable-domänen (`airy-tool-page.lovable.app` + ev. custom domän), annars slutar alla anrop fungera.
- **Kontraktets `status: UTKAST`:** bekräfta att kontraktet är godkänt så inga fältnamn ändras under oss.

## Teknisk sammanfattning (filer)
- `src/lib/api.ts`: central fetch-wrapper (timeout + retry), `detail`-felparsing, env-baserad `API_BASE`, bredda `confidence`-typ, ev. `fetchAllAlternatives()`.
- `src/App.tsx`: warm-up-ping mot `/health` vid mount.
- Inga ändringar i UI/tema, ingen ny logik i quiz-flödet — bara robusthet och kontrakts-trohet.

## Vad jag INTE ändrar
- Inget tema/layout, inga quizfrågor, ingen scoring-formel (den bor i backend).
- `alpha` skickas inte med — backend defaultar till 0.5 vilket är kontraktets rekommendation.
