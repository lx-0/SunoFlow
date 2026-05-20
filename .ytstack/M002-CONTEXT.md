---
milestone: M002
project: SunoFlow
created: 2026-05-18T11:20:00Z
size: L
---

# M002 -- Context

## Goal

Implement Generate-Refactor per M001-S03 Plan: GenerateForm `useState` count from 30 to ~13, extract 5 sub-components (PersonaPicker, StyleBoostButton, LyricsGeneratorSheet, AdvancedDisclosure, refactored GenerateForm), implement 4 tabs (simple/advanced/mashup/compare), fix Naming-Drift (D15), and Preset/Template-CRUD moves to placeholder for M004 `/authoring` Hub.

## Exit criteria

- [ ] `GenerateForm.tsx` has ~13 `useState` calls (was 30)
- [ ] 4 new sub-components in `src/components/generate-form/`: `PersonaPicker.tsx`, `StyleBoostButton.tsx`, `LyricsGeneratorSheet.tsx`, `AdvancedDisclosure.tsx`
- [ ] D15 naming aligned: form state vars use API vocab (`style` not `stylePrompt`, `prompt` not `lyrics`)
- [ ] 4 tabs in `/generate` page via `?tab=` URL param (simple/advanced/mashup/compare)
- [ ] 301-Redirects `/mashup` → `/generate?tab=mashup`, `/compare` → `/generate?tab=compare`
- [ ] All existing tests pass (`pnpm test`, baseline 1274/47/0 from STATE.md)
- [ ] Typecheck clean (`pnpm tsc --noEmit`)
- [ ] Generate-Loop end-to-end manuell verifiziert (prompt → song → playable)
- [ ] Feature-Flag `generate_v2` aktiv (Default OFF, opt-in via env or admin-flag)

## Size

L -- 4-5 slices, 11-20 tasks. Reference plan in `.ytstack/M001-FOLLOWUP-ROADMAP.md §M002`.

## Decisions locked in discuss phase

- 2026-05-18: D15 Naming-Drift -- API vocab wins (`style`, `prompt` everywhere in code; UI labels stay user-friendly). Source: M001-S03-T03.
- 2026-05-18: D17 Migration -- Feature-Flags + permanent 301-Redirects. Source: M001-S03-T04.
- 2026-05-18: D10 Generate-Cluster -- /generate Tabs + /generations Sub-View + /inspire separate. Source: M001-S02-T04.
- 2026-05-18: D11 (partial) -- Preset/Template-Picker read-only in form; full CRUD wandert in M004 /authoring. Source: M001-S02-T04.
- 2026-05-18: D12 Persona-Auswahl inline preserved. Source: M001-S02-T04.

## Open questions

- Wo wohnt `generate_v2` Feature-Flag? Existing `lib/feature-gates.ts` infrastructure to check at M002-S01 start.
- Tab-Komponent: existierendes `GenerateTabs` Component erweitern oder neu?
