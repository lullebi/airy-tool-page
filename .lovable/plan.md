# Fix: dropdown-val fyller inte i "Land"

## Rotorsak
I `src/pages/RegistreraLeverantorer.tsx` fylls "Land" aldrig i direkt vid val. Både snabbval och dropdown sätter bara `name`/`type`/`apiId` och lämnar `country` tomt — själva landet hämtas av en separat `useEffect` (rad 261–284) som anropar `fetchVendor(apiId)` och läser `hq_country_iso2`. Den effekten körs bara när villkoret `v.apiId && !v.country.trim()` är sant.

Problemet uppstår i dropdownens `onPickApi` (rad 465–476): den **återställer inte `country`** när man byter leverantör. 
- Första valet på ett tomt kort fungerar (country tomt → effekten hämtar).
- Men byter man leverantör i dropdownen ligger förra landets värde kvar, `country.trim()` är icke-tomt, och effekten hoppar över → "Land" blir kvar/oförändrad (stale) i stället för att matcha den nya leverantören.

Snabbvalet (`handleQuickPick`, rad 308–326) återanvänder/skapar alltid ett rent kort med `country: ""`, så där triggas hämtningen korrekt — därav skillnaden.

## Lösning
Gör dropdownvalet reaktivt genom att nollställa `country` när en ny API-leverantör väljs, så auto-fill-effekten kör om för det nya `apiId`.

- I `onPickApi` (raderna 465–476): lägg till `country: ""` i patchen till `updateVendor`. Då hämtas och sätts rätt land för den nyvalda leverantören, både vid första val och vid byte.

Det är den enda ändringen som behövs — `useEffect` och `countryFromIso2` är redan korrekta och återanvänds. Ingen ändring av tema, layout eller datakälla.

## Teknisk sammanfattning
- Fil: `src/pages/RegistreraLeverantorer.tsx`, `VendorNameCombobox`-propet `onPickApi`.
- Effekt: när "Leverantörsnamn" ändras via dropdown nollställs landet och hämtas på nytt från datasetets `hq_country_iso2`, vilket gör "Land" reaktivt mot namnvalet — precis som snabbvalet.
