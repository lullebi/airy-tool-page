## Mål
Gör fältet "Leverantörsnamn" till en sökbar dropdown med alla ~96 leverantörer från API:t (`GET /vendors`), istället för fri textinput. Snabbval-chipsen behålls oförändrade ovanför.

## Beteende
- Klick på fältet → dropdown öppnas med hela listan, alfabetiskt sorterad.
- Typ i fältet → filtrerar listan (case-insensitive substring-match på `name`, ev. även `category`).
- Val av rad → fyller `name`, `type` (= `category`), `apiId` automatiskt (precis som Snabbval idag). Land/System lämnas tomt för användaren.
- Ingen träff → visa "Hittade inte 'X' — lägg till manuellt" som en sista rad. Klick lägger in namnet som custom vendor (utan `apiId`), så befintlig validering (`incompleteCustomVendors`) kräver Typ + Land.
- Redan vald i en annan rad → visa raden men disablad med liten "redan vald"-tag.
- Loading-state: medan `loadingApi` är true, visa fältet med spinner-placeholder "Hämtar leverantörer…".
- Tangentbord: ↑/↓ navigerar, Enter väljer, Esc stänger.

## Implementation
- Komponent: `shadcn` `Command` + `Popover` (redan i `src/components/ui/`), exakt samma mönster som combobox-receptet i shadcn-dokumentationen. Inga nya deps.
- Ny lokal komponent `VendorNameCombobox` (in-fil eller `src/components/vendor/VendorNameCombobox.tsx`) som tar `value`, `onSelect(pick | { name: string })`, `apiVendors`, `disabledNames`.
- Ersätt `<Input>` för Leverantörsnamn i `RegistreraLeverantorer.tsx` med komponenten. `Snabbval`-sektionen, kortlayout, validering och `Starta quiz`-CTA är oförändrade.
- När användaren börjar typa i en redan vald rad och väljer en API-leverantör → samma logik som `handleQuickPick` (sätt `apiId`, `type`).
- Om användaren rensar fältet → rensa `apiId` och `type` på den raden.

## Inte i scope
- Quiz.tsx, Atgardsplan.tsx, scoring, Index.tsx.
- Ingen ändring av Snabbval-chipsens 12-cap (du kan välja allt via dropdown istället).
- Ingen design-revamp — samma `bg-white/70`, rounded, glass-style.
