---
milestone: M001
slice: S03
project: SunoFlow
created: 2026-05-18T06:40:00Z
status: planned
task_count: 5
completed_tasks: 5
status: done
closed: 2026-05-18T11:10:00Z
---

# M001-S03 -- Slice Plan

**Goal:** Konkrete Redesign-Skizze fuer die ueberladene Generate-View (progressive disclosure) plus geordnete Sequenz von Folge-Milestones M002+, die die in S02 entworfene IA Schritt fuer Schritt realisieren -- ohne Feature-Verlust. Visuelle Mockups als Anker. Plan-only.

## Tasks

- [x] T01 -- Generate-Surface Parameter-Inventur: `GenerateForm.tsx` + `lib/generation/params.ts` + `GenerateTabs` + `generate-form/*` enumerieren. Pro Parameter: Name, Typ, Default, wer braucht es (Persona-Defaults vs. Power-User), wie oft genutzt (PostHog/PlayHistory falls verfuegbar -- sonst Schaetzung mit "needs verification"). Klassifizierung Primary / Secondary / Advanced. Output: `.ytstack/M001-GENERATE-INVENTORY.md`. → `M001-S03-T01-SUMMARY.md`
- [x] T02 -- Progressive-Disclosure-Skizze: entlastete Generate-View mit Default-Mode (nur Primary-Felder, ein CTA, Persona-Default-Fill) vs. Advanced-Mode (alle Felder ueber Disclosure-Toggle/Tabs/Accordion). ASCII-Mockup + Verhaltens-Beschreibung (was passiert beim Persona-Pick, was kollabiert beim Submit). Output: `.ytstack/M001-GENERATE-REDESIGN.md`. → `M001-S03-T02-SUMMARY.md`
- [x] T03 -- Folge-Milestones-Sequenz: M002+ Liste als geordnete Roadmap. Pro Milestone: Name, Scope (welche Surface, welche Files), Dependencies (was muss vorher fertig sein), Risk-Klasse (Daten-Migration? Auth-Flow? Player-Race?), Rough Size (S/M/L). Beispiele: M002 Generate-Refactor · M003 Nav-Umbau · M004 Library/Discover-Merge · M005 Authoring-Helpers-Heimat. Output: `.ytstack/M001-FOLLOWUP-ROADMAP.md` + Eintrag in DECISIONS.md. → `M001-S03-T03-SUMMARY.md` (M002-M007 + D15+D16)
- [x] T04 -- Migration-Strategie: wie verhindern wir Feature-Verlust waehrend der Umbauten? Optionen: Feature-Flags pro neuer Route, parallel-Routes mit Redirect-Tabelle, hidden-but-routable Legacy-Pfade fuer einen Release-Cycle. Empfehlung + Rationale. Output: `.ytstack/M001-MIGRATION-STRATEGY.md`, Decision-Entry in `DECISIONS.md`. → `M001-S03-T04-SUMMARY.md` (D17)
- [x] T05 -- Visual-Mockups via Excalidraw: 3 Screens als visuelle Referenz fuer M002+ Implementer -- (a) entlastete Generate-View (Default + Advanced State), (b) konsolidierte Top-Level-Navigation (Mobile + Desktop), (c) Library mit ggf. integrierten Discover-Elementen. Nutze `excalidraw-diagram` Skill. Output: `.ytstack/mockups/M001-{generate,navigation,library}.excalidraw` (+ PNG-Renders). → `M001-S03-T05-SUMMARY.md`

## Done when

Alle 5 Outputs liegen unter `.ytstack/`. Die 3 Excalidraw-Files oeffnen ohne Fehler. Folge-Milestones haben jeweils Goal + Size + Dependencies definiert (genug fuer `plan-milestone` Spaeter ohne Rueckfragen). DECISIONS.md hat Migration-Strategie-Entry.

## Notes

(Add observations during slice execution. Issues that surface become entries in `DECISIONS.md` or `KNOWLEDGE.md`.)
