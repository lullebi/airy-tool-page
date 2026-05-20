## Ändring i RISKANALYS-kortet (Quiz.tsx, rader 1519–1538)

1. **Ta bort knappen** "Ersätt med detta alternativ" helt (Button-blocket på rad 1526–1537).
2. **Behåll all text** ("Matchande EU-alternativ", `alt.name`, `alt.country`, `alt.reason`) oförändrad.
3. **Ändra inre containern** från vit (`bg-white/80 ring-white/70`) till en solid grön bakgrund med god kontrast:
   - Container: `bg-green-600 ring-green-700`
   - Etikett "Matchande EU-alternativ": `text-white/80`
   - `alt.name`: `text-white`
   - `alt.country`: `text-white/75`
   - `alt.reason`: `text-white/85`

Inga andra ändringar – layout, typografi och övriga element rörs ej.