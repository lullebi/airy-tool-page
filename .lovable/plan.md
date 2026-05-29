## Goal

Remove four questions from the "Snabbanalys" step in `src/pages/Quiz.tsx` because they duplicate inputs already collected in the "Konfiguration" (Konfigurera) step. The step's numbering and scoring must stay clean and continuous.

## What gets removed

From the `QUICK_SCAN` array (currently 8 questions), remove these 4 objects:

- `qs_eu_data_weight` — "Hur viktig är EU-datalagring för er?"
- `qs_sector` — "Vilken sektor verkar ni inom?"
- `qs_readiness` — "Hur bedömer ni er förmåga vid avbrott?"
- `qs_priority` — "Vad är viktigast för er?"

After removal, `QUICK_SCAN` keeps these 4:

- `qs_sensitive_data`, `qs_business_critical`, `qs_legal_agreements`, `qs_encryption_keys`

## Why nothing else needs changing

- **Numbering is automatic.** The "Fråga {i + 1}" label in `StepQuestions` is rendered from the array index (`questions.map((q, i) => …)`), so removing entries renumbers the remaining questions 1–4 with no gaps.
- **Completion gate is automatic.** Step validation uses `QUICK_SCAN.every((q) => quickAnswers[q.id])` and `missingQuickIds` is derived from `QUICK_SCAN`, so both adjust to the shorter list.
- **Scoring is self-normalizing.** `weightedAverage` divides by the sum of the remaining `viktning` values (`totalW`), so the quick-scan score stays valid without re-tuning weights.
- **No orphaned references.** The removed data (sector, EU weight, readiness, priorities) is still fully sourced from the Konfiguration step via `Step1State` (`step1.sector`, `step1.euDataWeight`, `step1.readiness`, `step1.priorities`), which the Result step already reads. `findQ` falls back safely if an old id isn't found.

## Files

- `src/pages/Quiz.tsx` — delete the 4 question objects from the `QUICK_SCAN` array (lines ~183–220). No other edits required.
