---
milestone: M001
project: SunoFlow
created: 2026-05-18T06:35:00Z
size: M
---

# M001 -- Context

## Goal

Full UX overhaul (planning-only): konsolidiere Information Architecture, entlaste die Generate-View, und produziere eine konsistente User Journey, die jedes existierende Feature einer Heimat zuweist -- ohne Features zu verlieren und ohne Code-Implementierung in diesem Milestone.

## Exit criteria

- [ ] `.ytstack/USER-JOURNEY.md` existiert: dokumentiert Hauptpfade (Onboarding → Create → Listen → Organize → Discover → Share → Engage) mit Friction-Points pro Schritt, gegroundet im aktuellen Code (FEATURE-MAP §2 + `[locale]/*` Routes-Inventar).
- [ ] Konsistente User Journey, die **alle** existierenden Features (aus FEATURE-MAP §2 + `docs/feature-inventory.md`) auf das App-Konzept abbildet. Jedes Feature hat genau eine primaere Heimat, optionale sekundaere Entry-Points sind explizit benannt. Coverage-Check: kein Feature steht ausserhalb der Journey.
- [ ] IA-Konsolidierungs-Map (`.ytstack/M001-IA-MAP.md` oder Sektion in USER-JOURNEY): 25+ Top-Level-Routen aus `src/app/[locale]/*` → reduzierte Navigation, mit Mapping "alte Route → neue Heimat" und Begruendung pro Merge.
- [ ] Generate-View Redesign-Skizze: konkreter Vorschlag fuer entlastete Generation-Surface (progressive disclosure / tabs / collapsing / persona-defaults) mit Vorher/Nachher-Inventur der Parameter aus `GenerateForm.tsx` + `lib/generation/params.ts`. Plan-only, kein Code.
- [ ] Folge-Milestones skizziert: M002+ als geordnete Sequenz benannt (z.B. M002 Generate-Refactor, M003 Navigation-Umbau, M004 Library/Discover-Merge), je mit grobem Scope + Risiko-Klasse. Klar markiert was wann.

## Size

M -- 2-3 slices, geplant als:

- **S01** -- Discovery & Inventory: Audit der Routes, Components, Bounded Contexts vs. tatsaechliche User-Pfade. Output: FEATURE-CATALOG.md (vollstaendige Liste).
- **S02** -- User Journey + IA-Konsolidierung: USER-JOURNEY.md + IA-MAP.md. Feature-Heimaten zuweisen, Konsolidierungsvorschlaege begruenden.
- **S03** -- Generate-Redesign + Folge-Milestones: Generate-View Skizze (progressive disclosure) + M002+ Roadmap-Sequenz.

Slice-Detail kommt in `M001-S##-PLAN.md` via `ytstack:slice-milestone`.

## Decisions locked in discuss phase

- 2026-05-18: M001 ist **plan-only**. Keine Code-Aenderungen im Repo. Implementations-Arbeit verteilt sich auf M002+.
- 2026-05-18: Scope = Full UX overhaul (nicht nur Generate, nicht nur Navigation). Begruendung: User explizit gewaehlt, mit Hinweis dass Generate-View ueberladen ist UND viele Nav-Items existieren -- partielle Loesung wuerde Konflikt erzeugen.
- 2026-05-18: "Keine Features verlieren" ist harte Bedingung. Coverage-Check beim Journey-Mapping ist Exit-Kriterium, nicht nur Wunschvorstellung.

## Open questions

- Welche Bestands-Surfaces sind tabu fuer Konsolidierung (z.B. `/admin`, `/api-docs`, programmatic `/api/v1/*`)? Vermutung: ja, aber bestaetigen waehrend S02.
- Public-facing URLs (`/s/[slug]`, `/p/[slug]`, `/u/[handle]`, `/embed/*`) sind Permalinks -- nicht Teil der internen Navigation, aber muessen in der Journey vorkommen (Share-Pfad). Klaeren in S02.
- Mobile-First vs. Desktop-First fuer den Redesign? PWA-Kontext (siehe PWA cache-busting Memory) macht Mobile vermutlich primaer.
- Welche existierenden UX-Patterns sind locked-in (BottomSheet, GlobalPlayer-Position, AppShell-Sidebar)? Nicht-verhandelbare Constraints frueh dokumentieren.
- Wie behandeln wir Authoring-Helpers (Personas, Style-Templates, Prompt-Templates)? Eigenes Top-Level-Item oder Untermenu von Generate? Eine der wichtigsten IA-Fragen.
