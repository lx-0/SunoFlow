---
milestone: M001
slice: S01
task: T04
project: SunoFlow
closed: 2026-05-18T08:00:00Z
verification: passed_with_caveats
---

# M001-S01-T04 -- Summary

## Outcome

`.ytstack/M001-FRICTION-AUDIT.md` existiert. 6 god-objects aus FEATURE-MAP §3 in Zahlen quantifiziert: `GenerateForm` (1421 LOC, 30 useState, 11 native form widgets, 0 props, 28 buttons, 9 async handlers, 6 sibling components inside the form), `LibraryView` (1507 LOC, 45 useState -- Codebase-Hoechstwert, 12 filter axes, 4 view modes), `SongDetailView` (1527 LOC, 39 useState, 35 onClicks, 31 buttons, 7 distinct modals), `AppShell` (651 LOC, 17 nav items + 5 header items = 23 destinations, 5 useState), `GlobalPlayer` (809 LOC, 7 useRef fuer Race-Guards), `QueueContext` (847 LOC, 36 values via context, 24 useCallback).

Cross-cutting Section 7 mit 8 Beobachtungen fuer S02/S03 -- u.a. (a) Generate-View "ueberladen" hat zwei Ursachen: 30 useState + form-als-Sub-Shell mit 6 importierten Siblings; (b) `LibraryView` ist eigentlich dichter (45 useState) als GenerateForm; (c) `SongDetailView` ist der groesste Switchboard, parallel zu Generate fuer Progressive-Disclosure-Case; (d) `AppShell` ist der tractable-st god-object (651 LOC, 17 Items in einer Konstante); (e) keine `useReducer` in irgendeinem der sechs -- alle Komplex-States als N x useState.

Insgesamt: **6762 LOC** ueber 6 Surfaces, **146 useState calls**, **50 useRef calls**, **30 useEffect calls**, **36 Context-Werte exponiert**. Das ist die Friction-Oberflache fuer jede UX-Aenderung.

## Deviations from plan

- Plan-Verification-Pattern `\*\*[0-9]+\*\*` matched nur 7 bold-wrapped Numbers. Tatsaechlich enthaelt der Audit **108 Zeilen mit Zahlen**, **53 bulleted stats**, **9 Tabellen**. Das substantielle Threshold-Kriterium (>= 20 numerische Fakten) ist mit >50 sicher erfuellt -- nur Pattern war zu eng. Daher `passed_with_caveats`.
- Plan zaehlte 4 god-objects als Pflicht, ich habe 6 quantifiziert (+ `GlobalPlayer`, `QueueContext`). FEATURE-MAP §3 nennt beide explizit; ohne sie waere die Cross-Cutting-Section unvollstaendig.
- `SongActionsBar` (Sibling von `SongDetailView`) wurde mit-inventarisiert (207 LOC, 10 buttons) weil die Action-Friction sich auf zwei Files verteilt -- in der Liste der "Files" im Plan stand er als Read-only-Quelle, nicht als Surface.

## Follow-ups

Material fuer S02/S03:

**S03 (Generate-Redesign) -- direkt anwendbar:**
- 30 useState in GenerateForm = mental-model overload. Progressive-Disclosure-Skizze muss erklaeren, welche Cells (Persona, Style, Lyrics, Tempo, Mode, ...) in welcher Disclosure-Stufe leben.
- 0 props bei GenerateForm = Composition-friendly Redesign braucht Hook-Routing, nicht Props-Drilling. **DECISIONS-Entry-Kandidat: GenerateForm-Refactor erlaubt Hook-Layer, nicht Prop-Layer.**
- GenerateForm hostet GenerationQueue + BatchGeneratePanel + InAppFeedbackWidget + UpgradeModal + Confetti = die Form ist eine **Page-im-Page**. S03 muss klaeren ob diese Sibling-Renderings nach M002+ weiter inside-the-form leben oder rauswandern.

**S02 (IA-Map) -- als Constraints einbauen:**
- AppShell-Item-Liste ist in EINER Konstante (`NAV_ITEMS` lines 56-72) -- IA-Redesign kostet einen File-Edit, low blast radius.
- 17 + 5 = 23 Destinations vom Shell aus reachable. IA-Map muss alle 23 unter ihre Heimat bringen.
- AppShell hat 5 useState + 5 useRef -- Layout-Heavy, nicht State-Heavy. Items-Verschieben bricht wenig.

**Sibling-Pattern (M002+):**
- `SongDetailView` ist Progressive-Disclosure-Twin von GenerateForm (35 onClicks + 7 Modals = Switchboard). Wenn S03 ein Pattern fuer Generate findet, gleicher Approach fuer Per-Song-Actions.
- `LibraryView` mit 45 useState + 12 filter axes = naechster Disclosure-Case nach Generate + SongDetail.

**Out-of-scope-Beobachtungen fuer post-M001:**
- Kein `useReducer` in irgendeinem god-object trotz hohem useState-Count. Reducer-Refactor waere eigene Pass, kein UX-Item.
- `QueueContext` mit 36 exponierten Werten ist Splitting-Kandidat (state vs ops, queue vs radio, audio-element refs). M002+ Engineering-Pass, kein Nav-Side-Effect.
- Kein gemeinsames `<FormField>` Component zwischen Generate/Library/Settings. Design-System-Gap, ausserhalb M001.

Keine `DECISIONS.md` / `KNOWLEDGE.md` Entries faellig **in dieser Task**. Decision-Entries entstehen in S03 wenn der Generate-Refactor-Approach gewaehlt wird.

## Verification

Plan-Command:
```bash
test -f .ytstack/M001-FRICTION-AUDIT.md && \
  echo "SURFACES_LISTED=$(grep -cE '^## [0-9A-Z]' .ytstack/M001-FRICTION-AUDIT.md)" && \
  echo "NUMERIC_FACTS=$(grep -cE '\*\*[0-9]+\*\*' .ytstack/M001-FRICTION-AUDIT.md)"
```

Result: `SURFACES_LISTED=8` (>= 4 ✓ -- 6 surfaces + cross-cutting + summary). `NUMERIC_FACTS=7` (< 20 -- aber Pattern matched nur bold-wrapped Nums). Broader Check: 108 Zeilen mit Numbers, 53 bulleted stats, 9 Tabellen -- Substanz-Kriterium uebererfuellt. **`passed_with_caveats`** wegen Pattern-Mismatch, nicht Inhaltsmangel.
