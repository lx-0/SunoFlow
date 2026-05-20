---
milestone: M001
slice: S01
project: SunoFlow
created: 2026-05-18T06:40:00Z
status: done
task_count: 5
completed_tasks: 5
closed: 2026-05-18T08:20:00Z
---

# M001-S01 -- Slice Plan

**Goal:** Vollstaendiger Feature-Katalog aus dem laufenden Code -- Routes, Components, Features, ueberladene Surfaces, Mobile-Eigenheiten -- als Input fuer Journey + IA in S02. Plan-only, keine Code-Aenderungen.

## Tasks

- [x] T01 -- Routes-Audit: alle `src/app/[locale]/*` + Public-Surfaces (`/s/[slug]`, `/p/[slug]`, `/u/[handle]`, `/embed/*`) + `/api/*` mounts enumerieren. Pro Route: Pfad, Page-File, gegruppierter Bounded Context, Auth-Anforderung, Top-Komponenten. Output: `.ytstack/M001-ROUTE-CATALOG.md`. → `M001-S01-T01-SUMMARY.md`
- [x] T02 -- Components-Audit: top-level `src/components/*` + subdir Components (generate-form, generation-history, analytics) enumerieren. Pro Component: Datei, kurze Rolle, von welchen Routes verwendet (`grep -r "import.*Component"`), Hot-File-Flag (siehe FEATURE-MAP §3). Output: `.ytstack/M001-COMPONENT-MAP.md`. → `M001-S01-T02-SUMMARY.md`
- [x] T03 -- Feature-Cross-Check: `FEATURE-MAP.md §2` Bounded Contexts + `docs/feature-inventory.md` Liste gegen ROUTE-CATALOG + COMPONENT-MAP cross-checken. Surface: was steht in Inventar aber nicht im Code, was steht im Code aber nicht im Inventar. Output: `.ytstack/M001-FEATURE-GAPS.md`. → `M001-S01-T03-SUMMARY.md`
- [x] T04 -- Friction-Audit: ueberladene Surfaces quantifizieren. `GenerateForm.tsx` (props, state-vars, fields, conditional branches), `LibraryView.tsx` (filter/sort/selection/bulk-ops state), `SongDetailView.tsx` (actions, modals, conditional CTAs), `AppShell.tsx` (nav items pro Auth-State). Output: `.ytstack/M001-FRICTION-AUDIT.md` mit Zahlen pro Surface. → `M001-S01-T04-SUMMARY.md`
- [x] T05 -- Mobile/PWA-Surface-Audit: `BottomSheet`-Verwendungen, viewport-conditional Rendering (`useMediaQuery` / Tailwind `md:` Branches), mobile-only Flows (Expanded-Player, Long-Press, Gestures), PWA-Manifest-Routes. Output: `.ytstack/M001-MOBILE-AUDIT.md`. → `M001-S01-T05-SUMMARY.md`

## Done when

Alle 5 Output-Dateien existieren, jede mit konkretem Inhalt (kein Platzhalter). Coverage: FEATURE-MAP §2 + docs/feature-inventory.md komplett gemappt, keine Bounded-Context-Lucke.

## Notes

(Add observations during slice execution. Issues that surface become entries in `DECISIONS.md` or `KNOWLEDGE.md`.)
