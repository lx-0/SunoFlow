# SunoFlow Mobile — Navigation Spec

> UX-centered master plan for the app's navigation model. Source of truth for how
> screens relate, how Back behaves, and how the Now-Playing player is presented.
> Lives next to `README.md`; the logic lives in `src/navigation.ts`.

## The problem this fixes

The app grew as one flat stack: every feature screen was a root-level sibling and
nearly every navigation used `router.push(...)`. Two concrete UX failures resulted:

1. **Unbounded back stack.** Moving between sections (Library → Discover → Radio →
   Tags) pushed a new screen each time. `router.navigate` only pops when the *exact*
   target already exists in history, so cross-section moves always stacked. Drilling
   into a song and then switching sections left Back pointing "wherever you were",
   not at a stable home.
2. **The player opened multiple times.** 21 call sites did `router.push("/player")`.
   `push` always adds a screen, so opening Now-Playing while an instance already
   existed stacked a second modal — you had to close it twice.

Neither is standard native music-app behavior. The fixes below restore a fixed
navigation tree with predictable Back and a single player.

## Mental model

A native music app has **one persistent home**, **shallow drill-downs**, and **one
Now-Playing surface**. SunoFlow maps to exactly three navigation intents:

| Intent | Trigger | Primitive | Back behavior |
| --- | --- | --- | --- |
| **Switch section** | Bottom nav, Sidebar | `switchTo(route, pathname)` | Returns to the home tab (Library), not the previous section |
| **Go to section** | In-view action that jumps to a section ("Use in Generate", "Browse library", "Manage RSS feeds") | `goToSection(href)` | Returns to the home tab |
| **Drill down** | Opening a song / playlist / detail from a list | `router.push(...)` | Returns to the originating list |
| **Open player** | Mini-player tap, "play" actions | `openPlayer()` | Dismisses the modal back to where you were |

`switchTo` and `goToSection` share one collapse-then-navigate engine (dismissAll →
navigate); `switchTo` only adds a no-op guard for tapping the already-active tab.
Everything else is a consequence of keeping every call site mapped to one of these.

## The tree

```
Root Stack
├── (tabs)            ← home base (persistent), bottom-nav destinations
│   ├── index         "Library"      ┐
│   ├── playlists     "Playlists"    │ reachable from the bottom tab bar
│   ├── favorites     "Favorites"    │ (Profile is a root section, see below)
│   ├── history       "History"      │
│   └── settings      "Settings"     ┘
├── login             (no chrome)
├── player            (modal, "Now Playing", no chrome)
└── <sections + details>   ← discover, radio, profile, stats, song/[id], …
                              pushed over the base; chrome stays visible
```

- **Persistent chrome** — the bottom tab bar + mini-player — is rendered **once,
  globally** in `app/_layout.tsx` (`GlobalChrome`), so it survives navigating into
  any section or detail. It is hidden only on `login` and the `player` modal. This
  is the Spotify / Apple Music pattern: tab bar + mini-player stay put while you
  browse; Now-Playing is a modal over everything.
- **Sidebar** is the full menu (every section). It overlays the chrome (rendered
  after `GlobalChrome`) and is also reachable by left-edge swipe anywhere.
- **Bottom tab bar**: Library · Playlists · Favorites · History · Profile.
  Settings moved to the Sidebar's "You" section.

## Rules

1. **Section navigation never stacks.** Both `switchTo` (nav bars) and
   `goToSection` (in-view jumps) call `router.dismissAll()` (popToTop of the
   closest stack) when `router.canDismiss()`, then `router.navigate(href)`. Net
   effect: the back stack is at most `[home base] → [one section]`. Back from any
   section returns to the home tab. Params on an object href are preserved (e.g.
   "Use in Generate" carries `style`/`prompt`/`personaId`).
2. **The player is a singleton.** `openPlayer()` uses `router.navigate("/player")`,
   never `push`. `navigate` pops to an existing `/player` instead of stacking a
   duplicate. **Never** call `router.push("/player")`.
3. **Drill-downs push.** Contextual children (`/song/[id]`, `/playlist/[id]`,
   `/stems/[id]`, Settings → API keys, …) keep `router.push(...)`. Back returns to
   the parent list — this is correct and intentional.
4. **One source of truth.** All section-switch and player-open logic lives in
   `src/navigation.ts`. New nav surfaces import `switchTo` / `openPlayer` rather
   than calling `router` directly.

## Implementation map

- `src/navigation.ts` — `switchTo()`, `goToSection()`, `openPlayer()` (+ rationale).
- `app/_layout.tsx` — `GlobalChrome` (mini-player + bottom tab bar), hidden on
  `login` / `player`, rendered before `Sidebar`.
- `app/(tabs)/_layout.tsx` — home base Stack only; chrome removed (now global).
- `src/components/BottomTabBar.tsx`, `src/components/Sidebar.tsx` — switchers call
  `switchTo(route, usePathname())`.
- `src/components/MiniPlayer.tsx` + 20 play-action sites — `openPlayer()` /
  `router.navigate("/player")` instead of `push`.

## Call-site audit

Every navigation in the app goes through the `router` singleton (no `<Link>` /
`useRouter`). All call sites were classified:

**Converted to `goToSection` (in-view jumps to a section — previously stacked):**
`style-templates` → Generate · `presets` → Generate · `prompt-templates` →
Generate · `personas` → Generate · `inspire` → Generate / Manage RSS · `generations`
→ Generate (empty CTA) · `favorites` → Library (empty CTA) · player "…" → Extend.

**Kept as `router.push` (correct drill-downs — Back returns to the parent):**
- Item details: `/song/[id]`, `/playlist/[id]`, `/u/[username]`, `/tag/[id]`,
  `/collection/[id]`, `/stems/[id]`, `/song-versions/[id]`, `/song-analytics/[id]`,
  `/song-tags/[id]`, `/related/[id]`, `/lyrics-edit/[id]`, `/comments/[id]`,
  `/collaborators/[id]`, `/replace-section/[id]`.
- Settings → its sub-pages (`api-keys`, `rss-feeds`, `notification-settings`,
  `manage-tags`, `rate-limits`, `feedback`, `change-password`, `delete-account`):
  drill-downs **within** the Settings section; Back → Settings is intended.
- Player "…" peeks (Lyrics, Versions, Add-to-playlist, Queue, Comments, Related,
  Song details): contextual to the now-playing song; layer over the modal and
  Back returns to the player (the now-playing-peek pattern).
- Notification row → its target (a specific song/user/playlist = a detail).

**Kept as `router.replace` (correct — must not be in the back stack):**
`generate` / `upload` / `mashup` → the created song; `generate` → Library;
`playlist-invite` → the joined playlist; root auth gate → `login`.

## Verification (on-device — REQUIRED)

Static checks pass (`tsc` clean, `eslint` 0 errors) but navigation behavior is
runtime-only. On a dev build, confirm:

- [ ] Library → Discover → Radio → Tags, then Back **once** → Library (not Tags→Radio→…).
- [ ] Open a song detail, then switch section via Sidebar; Back → home tab, not the song.
- [ ] Open the player from the mini-player, dismiss; open again — only ever one modal.
- [ ] Trigger play from a list (which auto-opens the player) twice — no stacked players.
- [ ] Bottom tab bar + mini-player visible on section/detail screens; hidden on the player modal and login.
- [ ] Sidebar drawer overlays the bottom tab bar when open.
- [ ] Tapping the already-active bottom tab is a no-op (no flicker / re-push).
