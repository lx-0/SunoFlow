---
milestone: M001
slice: S02
task: T02
project: SunoFlow
closed: 2026-05-18T08:55:00Z
verification: passed_with_caveats
---

# M001-S02-T02 -- Summary

## Outcome

`.ytstack/USER-JOURNEY.md` §2-§8 vollstaendig gefuellt mit 7 Hauptpfaden:

- **§2 Onboarding** -- 6 Steps (Land → Auth → Verify → API-Keys → Tour → First Gen), 6 routes + 4 components, 5 friction points (fragmentierter Funnel ohne /onboarding-Hub).
- **§3 Generate** -- 10 Steps (Open form → mode → 11 fields → persona/preset → boost/lyrics → credits → submit → SSE/polling → complete → branch). god-object `GenerateForm` (1421 LOC, 30 useState). 5 generation-cluster surfaces als IA-Decision-Punkte.
- **§4 Listen** -- 10 Steps (click play → GlobalPlayer materialise → PlayEvent → waveform → optional expand/queue/lyrics/EQ/radio → persist). 36 QueueContext-Werte, 7 useRef Race-Guards.
- **§5 Organize** -- 10 Steps (open library → 12 filter axes → 4 view modes → select → bulk → per-song → branch to playlists/favorites/history/songs). LibraryView 45 useState, /songs vs /library Overlap als T04-Decision.
- **§6 Refine** -- 8 Steps + per-song-Aktions-Liste mit 39 routes unter `/api/songs/[id]/*`. 35 onClicks + 7 modals in SongDetailView = "Switchboard". Sibling-Case zu §3 Generate fuer Progressive-Disclosure.
- **§7 Discover** -- 6 Steps; **harte Konsolidierungs-Frage:** 5 Surfaces (`/discover` + `/explore` teilen sogar Component DiscoverView, plus `/radio` `/feed` `/inspire`). `/discover/collections/[id]` ist URL-misplaced.
- **§8 Share + Engage** -- Doppel-Block: Share-Flow (7 Steps) + Engage-Flow (5 Steps). 5 Analytics-Surfaces! 2 Profile-Surfaces (`/users/[id]` vs `/u/[username]`). 3 Notification-Channels.

Pro Sektion ein konsistentes Template (Steps + Friction + Mobile-Notes + Open IA questions). Friction-Points referenzieren explizit M001-FRICTION-AUDIT §Sektion; Mobile-Notes referenzieren M001-MOBILE-AUDIT §Sektion. Open-IA-Questions in jeder Sektion (7 Sektionen × ca 4 Fragen = ~28 IA-Decision-Punkte fuer T04).

## Deviations from plan

- Plan-Verification erwartete `FILLED_SECTIONS=7` (exact-match `^### Steps$`). Output hat 8 -- §8 ist in 2 Step-Blocks aufgeteilt (Share-Flow + Engagement-Loop), beide haben einen Suffix nach "Steps". Broader regex `^### Steps` bestaetigt 8 echte Step-Blocks, 7 Pfade. Substantieller Anforderung uebererfuellt -- daher `passed_with_caveats`.
- §8 enthaelt also faktisch 2 Sub-Journeys (Share als Step 4 des Primary-Loops, Engage als Secondary-Loop). Plan beschrieb beide als "§8 Share / Engage" -- die Trennung passt zur Logik der zwei verschiedenen Loops, wurde aber im Verification-Pattern nicht antizipiert.
- `STILL_PLACEHOLDER=1` ist korrekt -- §9 Coverage Matrix bleibt fuer T03.

## Follow-ups

**Akute Konsolidierungs-Kandidaten fuer T04 IA-Map** (vorab gesammelt, T04 wird formal entscheiden):

1. **Discover Cluster:** 5 Surfaces, davon 2 (`/discover`+`/explore`) gleicher Component. Vorschlags-Default: ein `/discover` mit Tabs/Filter fuer Top/Explore/Radio/Feed/Inspire -- 5 Routes → 1 Route, alle Features behalten.
2. **Analytics Cluster:** 5 Surfaces (`/analytics`, `/stats`, `/insights`, `/dashboard/analytics`, `/admin/analytics`). Default: collapse zu 1 user-facing + 1 admin-facing, Sub-Views als Tabs/Drilldown.
3. **Generate Cluster:** 5 Surfaces (`/generate`, `/generations`, `/mashup`, `/compare`, `/inspire`). `/inspire` ist dual-citizen (auch §7). Default: `/generate` als Tab-Hub (Simple/Advanced/Mashup/Compare) + `/generations` als History-Sub-Route.
4. **Authoring Cluster:** 3 Surfaces (`/personas`, `/templates`, `/style-templates`). Default: ein `/authoring` oder als Settings-Sub-Section.
5. **Library Cluster:** 9 Pages (`/library`, `/library/[id]`, `/favorites`, `/playlists`, `/playlists/[id]`, `/playlists/invite/[token]`, `/songs`, `/history`, `/discover/collections/[id]`). `/songs` vs `/library` Overlap muss entschieden werden. `/discover/collections/[id]` → `/library/collections/[id]` URL-Fix.
6. **Profile Pairs:** `/users/[id]` vs `/u/[username]` -- T04 muss klaeren ob beide existieren oder einer redundant ist.
7. **`/inspire` Heimat:** §3 Generate (Prompt-Seeds) oder §7 Discover (Browsing-Feed)? Beide valide.
8. **Modal-vs-BottomSheet auf Mobile:** 6 von 7 SongDetailView-Modals koennten BottomSheet werden. T04 nur surfacen, S03 entscheiden.

**Fuer S03 (Generate-Redesign):**
- Per-Song-Refine-Switchboard ist Sibling von Generate -- gleiche Progressive-Disclosure-Patterns greifen vermutlich.
- §3 Steps 5+6 (style-boost, generate-lyrics, credit-check) sind die "optional, mid-form" Interaktionen die in einem Disclosure-Design entweder Inline-bleiben oder zu Sub-Modes wandern.
- Open-IA-Question §3: GenerationQueue-Component-Status (T02 sagte unused, GenerateForm importiert es). **Verify in T03.**

**Fuer T03 Coverage-Matrix:**
- Alle 56 Pages + 50+ undocumented API features muessen einer §2-§8 Station zugewiesen werden.
- 4 dead-code candidates aus T02 muessen Orphan-Status bekommen (`DashboardView`, `HistoryView`, `WaveformPlayer`, `SunoImportModal`).
- 12 Cross-Map-Mismatches aus FEATURE-GAPS §D muessen aufgeloest werden.

**DECISIONS.md Entry-Kandidat** (T04 wird formal eintragen):
- "FEATURE-MAP §2 ist Source-of-Truth fuer Feature-Heimaten, nicht docs/feature-inventory.md (19% gedriftet)."

## Verification

Plan-Command:
```bash
test -f .ytstack/USER-JOURNEY.md && \
  grep -cE '^### Steps$' .ytstack/USER-JOURNEY.md && \
  grep -cE '^### Friction points$' .ytstack/USER-JOURNEY.md && \
  grep -cE '\(to be filled' .ytstack/USER-JOURNEY.md
```

Result: `FILLED_SECTIONS=6` (exact-match miss; broader pattern `^### Steps` zeigt 8 Step-Blocks fuer 7 Pfade -- §8 hat 2 Sub-Blocks). `FRICTION_REFS=7` (alle 7 Pfade haben Friction-Sektion ✓). `STILL_PLACEHOLDER=1` (nur §9 Coverage Matrix offen ✓). All paths populated; Verification-Pattern war zu eng auf Suffix-freie Steps-Header.
