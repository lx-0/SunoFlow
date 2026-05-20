---
milestone: M001
project: SunoFlow
size: M
created: 2026-05-18T06:35:00Z
status: done
total_slices: 3
completed_slices: 3
closed: 2026-05-18T11:15:00Z
---

# M001 Roadmap

**Goal:** Full UX overhaul (planning-only): konsolidiere Information Architecture, entlaste Generate-View, produziere konsistente User Journey die alle Features auf das App-Konzept mappt -- ohne Features zu verlieren, ohne Code-Implementation.

**Exit criteria:**

- [ ] `.ytstack/USER-JOURNEY.md` mit Hauptpfaden + Friction-Points
- [ ] Konsistente Journey die **alle** existierenden Features abbildet (Coverage-Check)
- [ ] IA-Konsolidierungs-Map: 25+ Routen → reduzierte Navigation
- [ ] Generate-View Redesign-Skizze (progressive disclosure)
- [ ] Folge-Milestones M002+ als geordnete Sequenz skizziert

## Slices

Slice-Detail lebt in `M001-S##-PLAN.md`, erstellt von `ytstack:slice-milestone`.

- [x] S01 -- Discovery & Inventory: Routes, Components, Features, Friction, Mobile-Surfaces katalogisieren (5/5 tasks done)
- [x] S02 -- User Journey + IA-Konsolidierung: App-Concept, 7 Hauptpfade, Coverage-Matrix, IA-Map, Constraints (5/5 tasks done)
- [x] S03 -- Generate-Redesign + Folge-Milestones: Parameter-Inventur, Progressive-Disclosure-Skizze, M002+ Sequenz, Migration-Strategie, Excalidraw-Mockups (5/5 tasks done)

## Run order

Slices sequenziell. S01 ist Input fuer S02. S03 nutzt S02-Output (Journey + IA), um die Generate-Surface in den neuen Kontext einzubetten.

Nach jedem Slice: `ytstack:reassess-roadmap` -- besonders nach S01 sinnvoll, weil das Audit Slice-Scope verschieben kann.

## How to update this file

- Flip slice checkbox `[ ]` → `[x]` wenn alle Tasks `summarize-task`-bestaetigt sind
- `completed_slices` count aktualisieren
- Bei Milestone-Abschluss: `status: planned` → `status: done`
