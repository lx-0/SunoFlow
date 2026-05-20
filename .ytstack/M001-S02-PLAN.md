---
milestone: M001
slice: S02
project: SunoFlow
created: 2026-05-18T06:40:00Z
status: planned
task_count: 5
completed_tasks: 5
status: done
closed: 2026-05-18T09:45:00Z
---

# M001-S02 -- Slice Plan

**Goal:** Konsistente User Journey die alle Features auf das App-Konzept mappt, plus IA-Konsolidierungs-Map die 25+ Top-Level-Routen auf eine reduzierte Navigation reduziert -- ohne Features zu verlieren. Plan-only.

## Tasks

- [x] T01 -- App-Concept-Statement: was ist SunoFlow in 3 Saetzen, fuer wen (Persona), was ist der primaere Loop (Generate→Listen→Refine→Share). Output: Frontmatter + §1 in `.ytstack/USER-JOURNEY.md`. Quelle: PROJECT.md + Plugin-Description + Marketplace-Description + ehrlicher Code-Read. → `M001-S02-T01-SUMMARY.md`
- [x] T02 -- Journey-Hauptpfade schreiben: Onboarding → Create → Listen → Organize → Discover → Share → Engage. Pro Pfad: Steps (Wo bin ich? Was klicke ich? Was sehe ich?), Friction-Points (gegrounded in FRICTION-AUDIT aus S01), heutige Route(s), beteiligte Components. Output: §2-§8 in `USER-JOURNEY.md`. → `M001-S02-T02-SUMMARY.md`
- [x] T03 -- Coverage-Check: jedes Feature aus ROUTE-CATALOG + COMPONENT-MAP + FEATURE-GAPS (S01) genau einer Journey-Station zuordnen. Orphans (gehoert nirgends rein) und Multi-Home Features (gehoert ueberall rein) explizit markieren. Hartes Kriterium: kein Feature ausserhalb der Journey. Output: §9 Coverage-Matrix in `USER-JOURNEY.md`. → `M001-S02-T03-SUMMARY.md`
- [x] T04 -- IA-Konsolidierungs-Map: 25+ heutige Top-Level-Routen → reduzierte Top-Level-Nav (Ziel: ~5-7 Items). Pro Konsolidierung: "alte Route(n) → neue Heimat" + Begruendung (frequency, semantic-fit, journey-station). Output: `.ytstack/M001-IA-MAP.md` mit Mapping-Tabelle und Vorher/Nachher-Diagramm (ASCII). → `M001-S02-T04-SUMMARY.md` (13 DECISIONS-Entries D1-D14)
- [x] T05 -- Locked-in Constraints: was darf der Redesign NICHT brechen. GlobalPlayer als persistente Bottom-Komponente, AppShell-Sidebar-Pattern, Public-URLs (`/s/[slug]` etc.) bleiben unveraendert, `/admin` ausgenommen, `/api/v1/*` programmatisch, Auth-Flows. Output: §Constraints in `IA-MAP.md`. → `M001-S02-T05-SUMMARY.md` (22 Constraints in §7 + PR-Checklist)

## Done when

`USER-JOURNEY.md` enthaelt App-Concept + 7 Hauptpfade + Coverage-Matrix. `IA-MAP.md` enthaelt Mapping-Tabelle + Constraints. Hartes Kriterium aus M001-CONTEXT: kein Feature aus dem S01-Katalog steht ausserhalb der Journey.

## Notes

(Add observations during slice execution. Issues that surface become entries in `DECISIONS.md` or `KNOWLEDGE.md`.)
