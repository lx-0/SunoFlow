---
target: SunoFlow native mobile app UX
total_score: 22
p0_count: 3
p1_count: 2
timestamp: 2026-06-07T11-24-23Z
slug: sunoflow-native-mobile-app-ux
---
# Critique: SunoFlow native mobile app (apps/mobile) — UX/design review

Register: product. Target: all 57 Expo Router screens + shared components/theme. Method: 6 isolated design-review sub-agents (Assessment A) + RN-adapted deterministic ban scan (Assessment B). Code is statically clean, never device-tested.

## Design Health Score (Nielsen)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Generation = prose + generic spinner, not status-as-verb pills; 0 skeletons across 52 spinner screens; focus-refetch blanks Favorites/History on every return |
| 2 | Match System / Real World | 3 | Mostly fine; em dashes + smart quotes in copy; "do it on the web" empty states push off-platform |
| 3 | User Control and Freedom | 2 | No queue reorder/remove, no Decline on playlist invite, add-to-playlist add can't be undone; nav rework helps but is runtime-unverified |
| 4 | Consistency and Standards | 2 | 3+ active-state treatments (chip/segment/tab), EmptyState vs bare-text errors, Alert.prompt edit is iOS-only (dead on Android), divergent chip patterns |
| 5 | Error Prevention | 2 | Password-match / URL-format / email-match validation all deferred to server 400; submit enabled on invalid input |
| 6 | Recognition Rather Than Recall | 3 | Decent; missing timestamps in History, no cover-art thumbs in several lists |
| 7 | Flexibility and Efficiency | 2 | Power-user affordances thin (no drag-reorder, no inline secret copy) for a "tenth-session" audience |
| 8 | Aesthetic and Minimalist Design | 2 | Off-brand violet accent app-wide, banned hero-metric tiles, raw emoji, at-rest shadows: brand discipline broken at the root |
| 9 | Error Recovery | 2 | Raw `HTTP 500` strings shown as titles, missing retry CTAs, silent `console.error`-only swallows in play handlers |
| 10 | Help and Documentation | 2 | Empty states name absence instead of teaching the in-app path |
| **Total** | | **22/40** | **Needs work** |

## Anti-Patterns Verdict

**Does this look AI-/template-generated? Partly, and worse: it looks like a port of the exact product it was spec'd to reject.**

**LLM assessment:** The build is competent RN (good state coverage, sane navigation model, real theme abstraction) but it systematically violates its own locked DESIGN.md and PRODUCT.md at the token + strategy level. Three root causes account for ~80% of findings.

**Deterministic scan:** Confirms the LLM review. `violet` is the default theme accent in `src/theme/theme.ts:75` (`#8b7cff`/`#7c3aed`) with no magenta palette anywhere; `bg:#0b0b0f`, `text:#ffffff`, `onAccent:#ffffff` are pure/untinted; 9 at-rest shadows across 8 files; 0 skeleton files vs 52 ActivityIndicator files; 0 files honor reduced-motion; accessibilityLabel in only 5 files. False positive: the single `borderRightWidth` hit (Sidebar.tsx:176) is a drawer edge, not a side-stripe callout — ignore.

## Overall Impression

The engineering is solid; the *design contract is not being honored*. The single biggest issue is not visual, it is strategic: roughly half the screen surface is the discovery-feed + social-network + recommendation-rail product that PRODUCT.md explicitly says SunoFlow "is not." No amount of polish fixes that — it is a product decision. The cheapest high-impact visual win, by contrast, is tiny: three edits to `theme.ts` (add magenta, tint neutrals, add a mono token + load Geist) repaint the entire app on-brand because theme adoption is already good (65/93 screens use `useTheme`).

## What's Working

1. **Theme plumbing is right, the palette is wrong.** 65/93 screens pull `useTheme()` + `makeStyles`; only 14 hardcoded-hex bypasses exist (mostly `Icons.tsx` defaults). Fixing the tokens fixes the app — no per-screen rework.
2. **State coverage is broadly present.** EmptyState in 37 files, error handling in 54; most list screens handle loading/empty/error. The gap is consistency and copy, not absence.
3. **Navigation model is sound on paper.** The switchTo/goToSection/openPlayer collapse-then-navigate engine + global chrome + singleton player is the correct native pattern (NAVIGATION.md), pending the device pass.
4. **Drawer-first mostly respected.** Only 3 Modal/modal hits; the player proves a themed-sheet pattern the laggard screens should copy.

## Priority Issues

### [P0] Half the app contradicts the product thesis ("Tool, not feed")
- **What:** `discover` (trending/recommended feed), `feed` (follow-activity), `recommendations` ("For You" rails), `u/[username]` (public profiles + follow graph), `comments` (threads) are direct, named violations of PRODUCT.md ("not a discovery feed, not a social network, not a Suno clone"). `radio`, `profile`, `notifications`, `notification-settings`, `following-people` carry social cruft to strip.
- **Why it matters:** This is ~50% of the surface implementing the three things the spec disclaims. It dilutes the workbench, adds maintenance load, and is exactly the Suno-com energy DESIGN.md's "Anti-Suno discipline" rejects. Polishing it would entrench the drift.
- **Fix:** Product decision first. Cut discover/feed/recommendations/u/comments/following; rescope radio to the user's own library; strip follower/comment toggles from notifications + profile, keeping only own-work (generation-status) notifications and editable settings.
- **Suggested command:** `impeccable distill` (after the cut decision)

### [P0] Accent is violet, the one banned color; Electric Magenta does not exist
- **What:** `THEMES` ships `violet` as default (`theme.ts:75`, `darkColors = THEMES.violet.dark`) and even offers a user-pickable "Violet" theme. Every `colors.accent`/`accentStrong` app-wide renders the single most-forbidden hue. No magenta token exists.
- **Why it matters:** The brand's entire identity is "one hot magenta like a status LED." Shipping violet is an immediate, total brand failure on the most visible element (login title + primary buttons included).
- **Fix:** Add `magenta`/`magenta-strong` to `theme.ts` from DESIGN.md OKLCH values, make it the default theme, drop or rename the violet option. One file, repaints everything.
- **Suggested command:** `impeccable colorize`

### [P0] Mono-for-Content is entirely unimplemented (and no Geist font is loaded)
- **What:** No mono token in `theme.ts`; RN falls back to system sans. Lyrics editor, lyrics view, Suno IDs, prompt bodies, style-tag strings, timestamps, offsets, API keys, URLs all render sans. DESIGN.md calls this seam "structural."
- **Why it matters:** The font-as-signal is how the operator's own work is visually separated from chrome. Its absence flattens the single most distinctive thing about the system, and the lyrics editor (the headline mono surface) is plain sans.
- **Fix:** Load Geist Sans + Geist Mono (expo-font/expo-google-fonts), add a `mono` text style, apply to user-authored/identifying content (start with lyrics-edit, lyrics, song/[id] IDs+prompt, api-keys).
- **Suggested command:** `impeccable typeset`

### [P1] Banned hero-metric / big-number tiles on every analytics surface
- **What:** `insights` (2-up 32px/800 tiles on colored fills), `stats` (36px streak + 22px headline grid), `song-analytics` (bordered number tiles), `u/[username]` + `profile` (stat grids). DESIGN.md and PRODUCT.md both ban this by name ("dense tables and small numbers, not SaaS-pitch tiles").
- **Why it matters:** It's the generic SaaS-dashboard look the brand explicitly rejects, plus colored fills misuse status hues as decoration and big numbers in magenta blow the One-Spark budget.
- **Fix:** Replace tiles with dense inline rows/small tabular figures; remove decorative background fills; drop magenta from non-interactive numbers.
- **Suggested command:** `impeccable distill`

### [P1] Pure/untinted neutrals + at-rest shadows + em dashes break the look
- **What:** `bg:#0b0b0f`, `text:#ffffff`, `onAccent:#ffffff` (no magenta chroma); resting cover-art/grid shadows in `index`, `player`, `song/[id]`, `playlist/[id]`, `discover`; em dashes in copy across generate/mashup/upload/inspire/lyrics-edit/song/add-to-playlist; smart quotes in `inspire`.
- **Why it matters:** Each is a named DESIGN.md "Don't." Together they read as un-art-directed; the tinted-near-black + flat-tonal discipline is what makes cover art "win."
- **Fix:** Tint neutrals toward magenta hue (chroma ~0.01) in `theme.ts`; remove resting shadows (keep player-bar/drag/lyrics-focus only); sweep em dashes + smart quotes to commas/colons/straight quotes.
- **Suggested command:** `impeccable polish`

## Persona Red Flags

**The Operator (power user, tenth session, 11pm):** Primary CTAs are violet not magenta, so the "system is alive" signal never fires. Queue has no reorder/remove; playlist reorder is up/down chevrons not drag. Generation feedback is a prose spinner with no Ready/Generating verb color, so a glance doesn't tell state. Half the nav leads to a discovery feed they didn't ask for. Lyrics editor — their core surface — is plain sans, not the mono console the brand promises.

**The Android beta friend:** `Alert.prompt` edit flows (prompt-templates, style-templates, manage-tags, playlist create) are iOS-only and silently no-op via optional chaining: rename/edit/create are dead actions with zero feedback on Android.

**The Returning Triage User:** Tapping back into Favorites/History sets state to null and flashes a full spinner every time (no stale-while-revalidate), punishing the exact high-frequency loop the product is built for.

## Minor Observations

- 0 files honor `prefers-reduced-motion` (PRODUCT.md marks it "Required"); lyrics auto-scroll animates unconditionally.
- accessibilityLabel in only 5 files; many icon-only controls unlabeled.
- Tags entered as freeform strings, not chips (generate, style-templates), against the chip mandate.
- Raw emoji as iconography (insights 👍/👎, stats/profile milestones) where Lucide is the house style.
- Silent async failures: play handlers in search/tag swallow errors to console only.
- Error states often show raw `HTTP <status>` as the title and omit a retry CTA (favorites, history, playlist).
- Inputs carry rest borders + no magenta Focus Glow (replace-section, collaborators, comments, profile), against the borderless-input + focus-ring spec.
- One-Spark budget routinely blown: per-row accent icons (collections, smart-playlists), multi-accent panels (player, collaborators).

## Questions to Consider

- Is the feed/social/discovery surface intentional strategy drift, or a port to undo? The answer decides whether ~25 screens get polished or deleted.
- What would the app feel like if the only saturated color on screen were a single magenta status LED, and everything the user typed were in mono?
- Should analytics tell the truth in one dense table instead of five tiles?
