---
milestone: M001
slice: S01
task: T05
project: SunoFlow
closed: 2026-05-18T08:20:00Z
verification: passed
---

# M001-S01-T05 -- Summary

## Outcome

`.ytstack/M001-MOBILE-AUDIT.md` existiert. Sechs-Sektionen-Audit (A viewport-conditional rendering, B mobile-specific components, C PWA infrastructure, D gesture patterns, E offline cache, F cross-cutting). Headline-Findings:

- **Tailwind:** 296 breakpoint usages ueber 50 files. 51% `sm:`, 38% `md:`, 11% `lg/xl/2xl`. **Die App ist responsive-from-mobile** (mobile-Defaults + Desktop-Layer), nicht Desktop-Adapted.
- **JS-Level Viewport-Branches:** nur 3 echte Viewport-Checks (GlobalPlayer 768px, LibraryView + swipable-song-row `pointer: coarse`), die anderen 7 `matchMedia`-Calls sind theme-detection. Mobile-Logik fast immer in CSS, nicht in JS.
- **AppShell-Nav:** 17 Items bleiben 17 auf Mobile -- gleiche Liste im Drawer wie in der Sidebar. Eine Bottom-Nav-Redesign-Entscheidung in S02 waere **net-new work**, nicht CSS-Refactor.
- **Mobile-Primitives:** je 1 Consumer (BottomSheet → PlaylistDetailView, SwipeablePlaylistItem, PullToRefresh 2x, library/swipable-song-row, OfflineIndicator, PwaInstallPrompt, ExpandedPlayer → GlobalPlayer:797). Pattern "exactly one consumer per primitive" -- under-utilised vs. exactly-right ist Decision-Point S02.
- **PWA-Infra ist mature:** per-deploy cache-namespacing via BUILD_ID, audio-aware auto-reload (`isAudioPlaying()` checks mediaSession + `<audio>` element), 4 cache namespaces (3 deploy-coupled, AUDIO_CACHE stable across deploys), manifest mit `display: standalone`. Gaps fuer post-M001: kein `shortcuts`, kein `share_target` (beide cheap UX wins).
- **Gestures:** keine geteilte `useSwipe`/`useLongPress` Hook-Library. 4 swipe-Surfaces rollen eigene Touch-Math. 1 long-press (`SongListItem`). Wenn M002+ neue Swipe-Surface bringt, droht Duplication -- DECISIONS-Kandidat fuer M002+.
- **Offline:** Cache-API + localStorage (kein IndexedDB), 500 MB default, 4 Consumers konsistent (LibraryView, SongDetailView, SongsGalleryView, settings/local-preferences). Substrate ist gesund.
- **md: (768px) ist DER Desktop-Pivot.** Sidebar erscheint, Bottom-Sheets weichen Modals. Neue Breakpoints einzufuehren wuerde 50 Files toucher.

## Deviations from plan

- Plan unterschied "JS-level viewport branches" und "tailwind breakpoint uses" -- Audit erweitert das um die Klarstellung dass 7 von 10 `matchMedia`-Calls eigentlich theme-detection sind. Wichtig fuer S02, weil "die App entscheidet runtime auf Width" das **falsche** mentale Modell ist.
- Plan-Verification-Pattern fuer Sektionen war `^## [A-F]\.` -- exact match. Ich habe Sektionen A-F geschrieben, plus mehrere Subsektionen `A.1`/`A.2`/etc. Verification zaehlte korrekt 6 Top-Sektionen.
- `MOBILE_FILES_REFERENCED=14` (>= 10 Threshold). Plan-Pattern matched nur src-Pfade; die 14 sind valid Pfade in den Tabellen.

## Follow-ups

**Fuer S02 (USER-JOURNEY + IA-MAP):**
- Entscheidung **Bottom-Nav vs. einheitliche Item-Liste auf Mobile**. AppShell-Pattern heute: Drawer mit allen 17 Items. Eine Bottom-Nav waere echte Architektur-Aenderung, kein CSS-Tweak. **DECISIONS-Kandidat.**
- `md:` (768px) als hard Pivot-Constraint dokumentieren in IA-MAP Section Constraints. Kein neuer Breakpoint vorschlagen.
- Mobile-Primitives Decision: BottomSheet, SwipeablePlaylistItem, PullToRefresh ausbauen (mehr Konsumenten) oder lassen wie sie sind. Empfehlung: lassen wie sind -- Pattern "one consumer per primitive" ist disciplinable, nicht problem.

**Fuer S03 (Generate-Redesign):**
- Progressive-Disclosure-Skizze muss mobile-default-friendly sein (sm: stack, md: side-by-side). Generate-Form hat heute nur 10 breakpoint-classes -- viel Raum fuer mobile-spezifischen Re-Layout.
- ExpandedPlayer-Pattern (Fullscreen-Modal) als Template fuer mobile-only Advanced-Mode in Verlauf moeglich.

**Post-M001 cheap wins:**
- Manifest `shortcuts` (z.B. "Quick Generate", "Open Library") -- 1 File-Edit, Homescreen-Quick-Actions.
- Manifest `share_target` -- Share-Songs-IN-app aus anderen Apps.
- Shared `useSwipe` / `useLongPress` Hook extrahieren -- pre-emptive falls M002+ weitere Gesten bringt.

Keine `DECISIONS.md` / `KNOWLEDGE.md` Entries faellig in T05 -- die Decisions entstehen in S02 mit dem Bottom-Nav-Argument.

## Verification

Plan-Command:
```bash
test -f .ytstack/M001-MOBILE-AUDIT.md && \
  echo "SECTIONS=$(grep -cE '^## [A-F]\.' .ytstack/M001-MOBILE-AUDIT.md)" && \
  echo "MOBILE_FILES_REFERENCED=$(grep -cE 'src/(components|hooks|lib|app)/' .ytstack/M001-MOBILE-AUDIT.md)" && \
  echo "MANIFEST_EXISTS=$(test -f public/manifest.json && echo yes || echo no)"
```

Result: `SECTIONS=6` (>= 5 ✓), `MOBILE_FILES_REFERENCED=14` (>= 10 ✓), `MANIFEST_EXISTS=yes` ✓. All thresholds met.
