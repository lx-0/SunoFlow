---
milestone: M002
project: SunoFlow
size: L
created: 2026-05-18T11:20:00Z
status: planned
total_slices: 4
completed_slices: 1
---

# M002 Roadmap

**Goal:** Implement Generate-Refactor: GenerateForm 30→13 useState, 5 Sub-Components, 4 Tabs, D15 Naming-Drift, Preset/Template-CRUD-Auswanderungs-Vorbereitung.

**Exit criteria:** see `M002-CONTEXT.md`.

## Slices

Detail in `M002-S##-PLAN.md`.

- [x] S01 -- Baseline + Naming-Drift (D15 Lite): rename form state-vars in GenerateForm.tsx, tests/typecheck/build all green, commit 3622822 pushed to main
- [ ] S02 -- Sub-Component Extraction: PersonaPicker, StyleBoostButton, AdvancedDisclosure aus GenerateForm.tsx extrahieren
- [ ] S03 -- LyricsGeneratorSheet + BottomSheet-Pattern: Sub-Flow als eigene Component, callback-API
- [ ] S04 -- Tabs + Redirects + Feature-Flag: /generate?tab=, /mashup+/compare redirects, generate_v2 flag

## Run order

S01 → S02 → S03 → S04 sequentiell. Baseline + D15 zuerst weil sie GenerateForm-Touch ohne Architektur-Change sind.

## How to update this file

- Flip slice checkbox `[ ]` → `[x]` when its tasks are all `summarize-task`-confirmed
- Update `completed_slices` count
- On milestone completion, flip `status: planned` → `status: done`
