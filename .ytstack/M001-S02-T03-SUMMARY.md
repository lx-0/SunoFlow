---
milestone: M001
slice: S02
task: T03
project: SunoFlow
closed: 2026-05-18T09:10:00Z
verification: passed
---

# M001-S02-T03 -- Summary

## Outcome

`.ytstack/USER-JOURNEY.md` §9 vollstaendig befuellt mit Coverage-Matrix in 6 Subsektionen:

- **§9.1 Pages Coverage** -- alle 56 Pages (51 `[locale]/*` + 5 public) klassifiziert auf §2-§8. Plus §9.1.H "Out-of-Journey" Sektion (Admin + Dev-Tools + Cross-Cuts wie /pricing /settings) und §9.1.I Authoring-Helpers als Cross-Section.
- **§9.2 API Routes Coverage** -- alle 224 API-Routen klassifiziert (Gruppe-Granularitaet, sum=224 ✓).
- **§9.3 Components Coverage** -- alle 101 Top-Components + 6 Subdir-Cluster zugewiesen. god-objects expliziert, dead-code als Orphans markiert.
- **§9.4 Orphans** -- 8 Items: 4 dead components (DashboardView, HistoryView, WaveformPlayer, SunoImportModal) + 4 out-of-journey routes (api-docs, pricing, test/login, agent-skill). Pro Item: Begruendung + delete/re-wire/leave-alone Vorschlag.
- **§9.5 Multi-Home Decisions** -- 12 Features mit Default-Decision-Vorschlag fuer T04. Headline: `/discover`+`/explore` merge (gleicher Component!), Analytics-Cluster collapse, `/songs` killen zugunsten /library, /discover/collections URL-Fix, Authoring-Hub fuer Personas+Templates+Style-Templates.
- **§9.6 Coverage Audit** -- Zaehl-Tabelle: 56/56 Pages ✓, 224/224 API routes ✓, 101/101 Components ✓ (97 live + 4 orphans), 6/6 Subdir-Cluster ✓, 10/10 Bounded Contexts auf §-Stationen gemappt, 12/12 Multi-Home-Decisions mit Default. **Hartes Kriterium "kein Feature outside the journey" formal erfuellt.**

Klassifikations-Regel gesetzt: FEATURE-MAP §2 als Source-of-Truth (per T01-Decision). Wird in T04 als formaler DECISIONS.md-Entry ueberfuehrt.

## Deviations from plan

- Plan-Verification erwartete `PAGES_COUNTED_HEURISTIC >= 30`. Actual `PAGES_LISTED=58` -- weil mehrere Pages (z.B. `/library/[id]`) in zwei Sektionen erscheinen (Primary + Cross-Reference). Ueber-Coverage akzeptabel.
- `MULTI_HOME_DECISIONS=12` (Plan-Threshold >=5). Mehr als doppelt soviel weil das Coverage-Audit echte Cross-Map-Konflikte aus FEATURE-GAPS §D + neue Konflikte aus T01/T02 (z.B. /songs vs /library) zusammenfuehrt.
- Plan-Section-Liste war "§9.1 bis §9.6" (6 Subsektionen). Output hat tatsaechlich 6 Hauptsektionen aber §9.1 zerfaellt in Sub-Sub-A bis I (mehr Granularitaet als geplant -- 9 sub-blocks). Akzeptabel weil die Struktur natuerlich aus dem Klassifikations-Bedarf entstand.

## Follow-ups

**Fuer T04 IA-Konsolidierungs-Map** (M001-IA-MAP.md):

Die 12 Multi-Home-Decisions sind formal Decision-Inputs. Default-Vorschlaege aus §9.5:
1. `/inspire` → §3 Primary
2. `/compare` → §3 Primary (sub-Tab in /generate)
3. `/discover` + `/explore` → merge zu /discover mit Tabs
4. `/radio` → §7 Primary, Secondary in §4
5. `/songs` → kill, merge in /library
6. `/discover/collections/[id]` → URL-Fix /library/collections/[id]
7. `/users/[id]` → rename /profile/[id], `/u/[username]` bleibt
8. Analytics 5-Cluster → kollabieren zu 2 (1 user-facing mit Sub-Tabs + 1 admin)
9. Generate-5-Cluster → /generate mit Tabs (Simple/Advanced/Mashup/Compare) + /generations als History-Sub
10. Authoring-3-Cluster → ein /authoring Hub
11. Personas-Management-Heimat → /authoring (Auswahl bleibt inline in GenerateForm)
12. `/library/[id]` → Primary §6 Refine

**Rechnung fuer T04:** 25 Top-Level-Routen heute → ~10-12 nach Konsolidierung (wenn alle 12 Decisions accepted). Plus eine Bottom-Nav-Entscheidung (MOBILE-AUDIT findings: 17 items im Drawer auf Mobile -- separate Mobile-Bottom-Nav oder einheitliche Liste).

**DECISIONS.md Entry-Kandidaten fuer T04 (formal eintragen):**
- D1: FEATURE-MAP §2 ist Source-of-Truth fuer Heimat-Zuweisungen
- D2-D13: Die 12 Multi-Home-Decisions (eine pro Multi-Home-Feature)
- D14: 4 dead-code candidates → delete in M002+ (oder re-wire fuer SunoImportModal)

**Fuer S03 (Generate-Redesign):**
- Generate-Cluster-Konsolidierung (Decision #9) ist Voraussetzung fuer Generate-Redesign: erst klar `/generate` Tabs vs separate Routes, dann Progressive-Disclosure-Skizze in S03.
- `/compare` als sub-Tab in /generate aendert die Heimat des SongCompareView Components -- T04 muss das markieren.

**Out-of-Scope dokumentiert:**
- `/admin/*` 12 pages bleiben in §10 Admin-Sub-App, KEINE Konsolidierung in M001.
- `/api-docs` bekommt Dev-Menu im Profile-Dropdown, nicht Main-Nav.
- `/pricing` `/settings` `/settings/billing` bleiben Cross-Cut (kein primary loop home).

## Verification

Plan-Command:
```bash
test -f .ytstack/USER-JOURNEY.md && \
  grep -cE '^### §9\.' .ytstack/USER-JOURNEY.md && \
  awk '/^### §9\.1/,/^### §9\.2/' .ytstack/USER-JOURNEY.md | grep -cE '^\| `/' && \
  awk '/^### §9\.4/,/^### §9\.5/' .ytstack/USER-JOURNEY.md | grep -cE '^- ' && \
  awk '/^### §9\.5/,/^### §9\.6/' .ytstack/USER-JOURNEY.md | grep -cE '^- ' && \
  grep -cE '\(to be filled' .ytstack/USER-JOURNEY.md
```

Result: `COVERAGE_SUBSECTIONS=6` ✓, `PAGES_LISTED=58` (>= 30 ✓), `ORPHANS_FLAGGED=8` (>= 4 ✓), `MULTI_HOME_DECISIONS=12` (>= 5 ✓), `STILL_PLACEHOLDER=0` ✓. All thresholds met.
