## Fix 7 — separera UX-`type` från API-`apiCategory`

Problem: `fetchAlternatives(v.type)` skickar svenska UX-kategorier ("Infrastruktur", "Plattform") → 404. Lösning: spara API-kategorin separat i `apiCategory`, behåll `type` för dropdown-UX.

### Ändringar

**1. `src/pages/RegistreraLeverantorer.tsx`**
- Lägg till `apiCategory?: string` i `Vendor`-typen.
- `handleQuickPick`: sätt `apiCategory: pick.category ?? undefined`.
- `VendorNameCombobox onPickApi`: sätt `apiCategory: pick.category ?? undefined`.
- `onPickCustom` och `onClear`: nolla med `apiCategory: undefined`.

**2. `src/lib/vendorMapper.ts`**
- Lägg till `apiCategory?: string` i `VendorLike`-interfacet.
- `apiToVendorLike`: sätt `apiCategory: v.category ?? undefined`.

**3. `src/pages/Quiz.tsx` (Step5Measurement)**
- `categoriesKey` och fetch-useEffect: använd `v.apiCategory ?? v.type`.
- `altFor`: läs `cat = v.apiCategory ?? v.type`, slå upp `altsByCategory[cat]`.

**4. `src/pages/Atgardsplan.tsx`**
- Kategori-useEffect + dependency-key: använd `v.apiCategory ?? v.type`.
- `rows`-useMemo: samma uppslagsnyckel.

### Verifiering (efter implement)

Happy path M365 + Slack + Oderland:
- `/alternatives/SaaS%20Productivity` → 200, M365-kort visar "scrive".
- Slack-kort visar "intercom" (+ ev. fler).
- Oderland: inget EU-block eller ovhcloud/hetzner/scaleway.
- Inga "Inga EU-alternativ taggade…"-meddelanden för API-pickade leverantörer.

Out of scope: städa `VENDOR_TYPES`-listan (lever sida vid sida denna runda).
