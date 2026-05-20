---
milestone: M001
slice: S01
task: T04
artifact: FRICTION-AUDIT
created: 2026-05-18T07:55:00Z
sources:
  - src/components/{GenerateForm,LibraryView,SongDetailView,AppShell,GlobalPlayer,QueueContext}.tsx
  - src/components/{SongActionsBar,LibraryToolbar,LibraryFilterPanel}.tsx
  - .ytstack/FEATURE-MAP.md §3 (hot files)
  - git log --since=2026-01-01 (commit churn)
method: |
  Pure mechanical counts via grep/wc on the file body. No semantic
  judgement. Numbers exist so S02/S03 can argue from data instead of
  adjectives.
---

# M001 Friction Audit

Six load-bearing surfaces quantified. The user's hypothesis -- "generation view ist total ueberladen" -- gets numbers attached. All counts are raw mechanical greps; nothing weighted.

## 0. Cross-surface summary

| Surface | LOC | useState | useRef | useEffect | useCallback | Imports | Hot (commits) |
|---|---:|---:|---:|---:|---:|---:|---:|
| `LibraryView.tsx` | **1507** | **45** | 8 | 9 | 4 | 26 | ✦ **71** |
| `SongDetailView.tsx` | **1527** | **39** | 1 | 3 | 0 | 26 | ✦ **57** |
| `GenerateForm.tsx` | **1421** | **30** | 3 | 1 | 0 | 20 | ✦ **44** |
| `QueueContext.tsx` | 847 | 16 | **26** | 3 | **24** | 11 | ✦ **31** |
| `GlobalPlayer.tsx` | 809 | 11 | 7 | 10 | 2 | 17 | ✦ **40** |
| `AppShell.tsx` | 651 | 5 | 5 | 4 | 6 | 16 | ✦ **61** |
| **Totals** | **6762** | **146** | **50** | **30** | **36** | **116** | |

Six files = ~7k lines, 146 `useState` calls, 50 `useRef`. These are the surfaces every UX change has to navigate.

---

## 1. GenerateForm.tsx (the user-flagged "ueberladen" case)

**Numbers:**
- **1421 LOC** (1 file, no co-located helpers; helpers live in `src/components/generate-form/{api,helpers,types,useGenerateFormData}.ts`).
- **30 `useState` calls** -- 30 independent state cells in one component.
- **0 props.** `export function GenerateForm()` takes nothing. Every input comes from hooks, `useSearchParams`, or fetched data. No way to compose / wrap this from outside.
- **20 import lines, 9 async function handlers.**
- **11 native form widgets** in JSX (5 `<input>`, 3 `<select>`, 3 `<textarea>`) -- no shared `Input`/`Select` design-system component, raw HTML throughout.
- **20 icon imports** from Heroicons (4 distinct icon variants of `SparklesIcon` alone).
- **28 `<button>` tags** in JSX.
- **5 `<label>` tags.** Field-density signal: 11 widgets / 5 labels = 2.2 widgets per label -- some controls are unlabelled or share label scope.
- **1 owned modal** (`UpgradeModal`, conditional on `creditInfo.creditsRemaining <= 0`).
- **44 references** to `generationMode / isAdvanced / preset / persona` -- mode/preset/persona state is woven through the entire component, not isolated.
- **Sibling components imported into the form:** `GenerationProgress`, `GenerationQueue` (T02 flagged this as UNUSED elsewhere!), `BatchGeneratePanel`, `Confetti` (lazy), `InAppFeedbackWidget`, `UpgradeModal`.

**Friction signature:**
- 30 useState calls in a single render tree means **30 cells the user mentally tracks** while filling out the form.
- 0 props + searchParams-driven means the form **cannot be wrapped, theme-overridden, or composed** -- IA-redesign that moves this surface must edit it in place.
- Six imported sibling components inside one form = the form is a **sub-shell** more than a form.

---

## 2. LibraryView.tsx (highest churn: 71 commits since Jan)

**Numbers:**
- **1507 LOC.**
- **45 `useState` calls** -- highest of any single component in the codebase.
- **8 `useRef` calls.**
- **9 `useEffect` calls.**
- **3 props** in `LibraryViewProps` (`initialSongs`, `title`, `enableServerSearch`). Reasonable surface.
- **81 `filter` mentions, 81 `select` mentions, 9 `sort` mentions** -- "select" overload because both "filter selection" and "checkbox selection for bulk-ops" share the word.
- **12 distinct filter axes** (counted from `useState` initializers, lines 105-130):
  1. `searchText` (free text)
  2. `statusFilter` (pending/ready/failed)
  3. `ratingFilter` (min stars)
  4. `dateFrom`
  5. `dateTo`
  6. `sortBy` (newest/oldest/title/rating)
  7. `tagFilter[]` (multi)
  8. `smartFilter` (smart-playlist mode)
  9. `genreFilter[]` (multi)
  10. `moodFilter[]` (multi)
  11. `tempoMin` / `tempoMax` (range)
  12. `includeVariations` (boolean)
- **Plus `showFilters` boolean** that gates 9 of the above behind a disclosure (already-partial progressive disclosure).
- **4 view modes** referenced (grid/list/etc. via `viewMode` -- 4 mentions).
- **0 occurrences of "bulk"** -- bulk-actions use the verb "batch" instead (`LibraryBatchAction`, `runSongsBatchAction` from `lib/songs/library-client`).
- **Helpers it pulls in:** `LibraryToolbar`, `RecentlyPlayed`, `LowCreditsBanner`, `useSongsList`, `useTagsList`, `useOfflineCache`, plus the `QueueContext` (8 destructured fields).

**Friction signature:**
- 12 filter axes + 4 view modes + per-song selection + batch actions = the surface conflates **search/filter/organize/bulk-action** into one component.
- The 45-useState count is the codebase's high-water mark. Either this is genuinely irreducible (then any refactor pays the same cost) or it's a split-opportunity hiding in plain sight.

---

## 3. SongDetailView.tsx (per-song hub: 57 commits)

**Numbers:**
- **1527 LOC** (the largest single component file).
- **39 `useState` calls.**
- **35 `onClick` handlers** -- the densest interactive surface in the app.
- **31 `<button>` tags** in JSX.
- **7 distinct modals** wired into the view:
  1. `SeparateVocalsModal` (static import)
  2. `RemixModal` (dynamic)
  3. `EmbedCodeModal` (dynamic)
  4. `CreateVariationModal` (dynamic)
  5. `ReportModal` (dynamic)
  6. `CoverArtModal` (dynamic)
  7. plus inline "Save style" modal (`openSaveStyleModal` function)
- **6 of 7 modals are dynamically imported** -- code-splitting is already in place; the bloat is in the **action surface** not the bundle.
- **Conditional rendering:** 4 `&&` branches in JSX (relatively few -- suggests action buttons render unconditionally and gate via state).
- **`SongActionsBar.tsx`** is a sibling component (207 LOC, 10 buttons, 10 onClicks) -- the per-song actions are partially extracted, but the parent still owns 25 more onClicks.

**Friction signature:**
- 35 onClicks + 7 modals + 39 useState = **the page is a switchboard**. Every per-song feature (download, share, embed, remix, variation, report, cover-art, separate-vocals, rate, favorite, archive, retry, restore, extend, comment, react, ...) lives here.
- Generate-View's parallel: this is where the **per-song progressive-disclosure case** lives. S03 will frame Generate-Redesign and SongDetail-Redesign as siblings (T02 already flagged this).

---

## 4. AppShell.tsx (the 17-item nav)

**Numbers:**
- **651 LOC.** Lowest of the 6 (Shell is a smaller commitment than the god-objects).
- **17 primary nav items** in the `NAV_ITEMS` constant (T01 confirmed) -- this is the metric the user named.
- **5 `useState` + 5 `useRef` + 4 `useEffect` + 6 `useCallback`** -- relatively modest state.
- **Auth-state branches counted:**
  - 1 `!!isAdmin` branch (admin nav link, line 323)
  - 1 `subscriptionTier` branch (free/starter/pro/studio tier display, lines 312, 453)
  - 1 unsigned `<Link href="/pricing" prefetch={true} className="sr-only">` (line 261, accessibility prefetch hint)
  - implicit logged-out vs logged-in via session != null
- **17 + 1 admin + 5 footer/header items** (`/pricing`, `/settings`, `/settings/billing`, `/admin`, `/profile`) = **23 distinct destinations** reachable from the shell.

**Friction signature:**
- 17 items is the user-named pain. **Fits in one file** -- low blast radius for consolidation. Any IA redesign touches this single component.
- The 5-useState/5-useRef count means AppShell is mostly layout, not state -- moving items around won't break much state.

---

## 5. GlobalPlayer.tsx (40 commits, async audio races)

**Numbers:**
- **809 LOC.**
- **11 `useState` + 7 `useRef` + 10 `useEffect`** -- effect-heavy, expected for an audio component with browser API integration.
- **17 imports.**
- **4 `?:` conditional rendering branches in JSX.**
- The component is dynamically imported from `AppShell.tsx` (`const GlobalPlayer = dynamic(() => import("./GlobalPlayer").then((m) => m.GlobalPlayer))`).

**Friction signature:**
- 7 `useRef` for audio-race-guarding (commit `7511d20` introduced the load-generation token; commit `868765f` added singleton generation tracker; commit `45023a6` moved peak math to Web Worker). This is **unavoidable complexity** -- not a UX overload, but a reminder that any IA changes that affect the player path must respect these guards.
- 10 effects = 10 sync points with React lifecycle. Race-condition surface, not feature surface.

---

## 6. QueueContext.tsx (the 36-value context)

**Numbers:**
- **847 LOC.**
- **16 `useState` + 26 `useRef` + 24 `useCallback`** -- the highest `useCallback` count in the codebase.
- **36 values exposed via `QueueContextValue`** (lines 805-842):
  - 14 state-shape values: `queue`, `currentIndex`, `isPlaying`, `isBuffering`, `currentTime`, `duration`, `shuffle`, `repeat`, `volume`, `muted`, `playlistSource`, `radioState`, `isRadioLoading`, `shuffleVersions`
  - 1 derived: `activeVersion`
  - 14 operations: `playQueue`, `togglePlay`, `playNext`, `addToQueue`, `removeFromQueue`, `reorderQueue`, `skipNext`, `skipPrev`, `seek`, `toggleShuffle`, `cycleRepeat`, `clearQueue`, `setVolume`, `toggleMute`
  - 4 radio-specific operations: `startRadio`, `stopRadio`, `radioThumbsDown`, `toggleShuffleVersions`
  - 3 escape-hatches / refs: `getAudioElement`, `eqSettingsRef`, `restoredEQ`

**Friction signature:**
- 36-value context = **any consumer importing `useQueue()` gets the whole world**. T02 noted LibraryView destructures 8 fields, SongDetailView likely more. Splitting QueueContext into smaller contexts is its own engineering job -- noted, not proposed here.
- 26 `useRef` calls = a lot of "outside React" state (audio element, timers, debounce trackers, position recovery). Expected for a player, but worth flagging.

---

## 7. Cross-cutting observations

1. **Three files >1400 LOC** (`GenerateForm`, `LibraryView`, `SongDetailView`). The user's "generation ueberladen" is true for the form -- but `LibraryView` (45 useState) is actually denser, and `SongDetailView` (35 onClicks) is the larger interactive switchboard.
2. **`GenerateForm` is the only one with zero props.** Composition-friendly redesign (e.g. extracting "Persona section", "Style section", "Lyrics section") would require routing data through hooks, not props.
3. **`SongDetailView` has 6 dynamically-imported modals.** Bundle is already split; the friction is interactive density, not load weight.
4. **`AppShell` is the smallest god-object** at 651 LOC. Most tractable refactor target: 17 items + 5 header items = move into a sub-component, done.
5. **`QueueContext` exposes 36 values.** Any consumer gets all of it. Context-splitting (state vs. ops, queue vs. radio, audio-element vs. shuffle-mode) is a real refactor but it's M002+ scope.
6. **No `useReducer` in any of the six.** All complex state is N x `useState` instead of one reducer. Could be a pattern for one of the gardening passes -- not relevant to S02 IA work.
7. **Generate-View's "ueberladen" feeling has two causes:** (a) 30 useState in one tree -- mental model overload; (b) GenerationQueue + BatchGeneratePanel + InAppFeedbackWidget + UpgradeModal + Confetti all rendered inside the form -- the form is a page-within-a-page. Progressive-disclosure design (S03) needs to separate "compose a song" from "manage the queue".
8. **The 4 form-input cluster** (Generate/Library/Settings/SongDetail) doesn't share a `<FormField>` component. 11+ raw `<input>` in GenerateForm, raw inputs in LibraryView filter panel, raw inputs in settings. Design-system gap -- but out of scope for M001.

---

End of friction audit.
