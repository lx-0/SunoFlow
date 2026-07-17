# SunoFlow Mobile — Navigation Spec

> UX-centered master plan for the app's navigation model. Source of truth for how
> screens relate, how Back behaves, and how the Now-Playing player is presented.
> Lives next to `README.md`; the logic lives in `src/navigation.ts`.

## The model (since the tabs rework)

The app is a **real Tabs navigator** with **one stack per tab** — the native
music-app architecture (Apple Music / Spotify):

- **Tab switches are instant.** No push animation, no remount. Each tab keeps
  its own navigation stack *and* scroll position while you're away.
- **Back always returns to where you actually came from.** Every section and
  detail screen is pushed onto the *current* tab's stack. iOS swipe-back works
  on every pushed screen.
- **The active tab stays highlighted** while you're drilled into any screen of
  its stack (navigator state, not pathname matching).
- **Re-tapping the active tab pops its stack** back to the tab's home screen.
- **Now Playing is a single headerless native modal** over everything
  (swipe-down or chevron to dismiss). Queue / Lyrics / Add-to-playlist stack as
  sheets *above* it; content destinations (song details, comments, …) close the
  player first and land on the active tab's stack with chrome visible.

### History of the previous model (why it felt unnatural)

The first rework (commit `26b8b832`) kept a single flat root Stack and faked
tabs via `dismissAll()+navigate()`. Consequences: every tab change animated
like a push and remounted the target (scroll loss), Back jumped to Library
regardless of origin, Profile was a pushed screen with a back chevron inside a
"tab", the tab highlight died on ~90% of screens, and the player modal carried
a doubled header. The current model replaces all of that structurally instead
of via call-site discipline.

## The tree

```
Root Stack
├── (tabs)                          ← Tabs navigator (owns bottom bar + mini-player)
│   └── (library,playlists,favorites,history,profile)   ← ONE shared route group,
│       │                             instantiated as five independent stacks
│       ├── index        "Library"    (anchor of (library))
│       ├── playlists    "Playlists"  (anchor of (playlists))
│       ├── favorites    "Favorites"  (anchor of (favorites))
│       ├── history      "History"    (anchor of (history))
│       ├── profile      "Profile"    (anchor of (profile))
│       └── <everything else>         sections (discover, radio, generate, …),
│                                     details (song/[id], playlist/[id], …),
│                                     settings + its sub-pages
├── login                           (no chrome)
├── player                          (modal, headerless, swipe-down dismiss)
├── queue │ lyrics │ add-to-playlist  (sheets stacked over the player)
```

- The **array group** `(library,…,profile)` is expo-router's shared-routes
  mechanism: every route inside exists once per tab group, so any tab can push
  any section/detail onto *its own* stack. `unstable_settings` anchors each
  group to its home screen.
- **Chrome lives inside `(tabs)/_layout.tsx`**: the custom `BottomTabBar` is the
  Tabs navigator's `tabBar` (rendered in-flow, so content never scrolls under
  it) and the `MiniPlayer` floats above it. Login and the player modal have no
  chrome by construction — no pathname checks.
- **Sidebar** remains the full menu (every section), overlaying everything. Its
  left-edge swipe is only active on the five tab roots: on pushed screens that
  edge belongs to iOS swipe-back.

## Navigation intents (src/navigation.ts)

| Intent | Trigger | Primitive | Back behavior |
| --- | --- | --- | --- |
| **Switch tab** | Bottom bar, sidebar tab rows | `switchTo(route, pathname)` → group-qualified `router.navigate` | Tab keeps its own stack; re-tap pops to tab home |
| **Go to section** | Sidebar section rows, in-view jumps ("Use in Generate") | `goToSection(href)` → `router.navigate` | Returns to the screen you came from |
| **Drill down** | Song / playlist / detail from a list | `router.push(...)` at the call site | Returns to the originating list |
| **Open player** | Mini-player tap, play actions | `openPlayer()` → `router.navigate("/player")` | Swipe-down / chevron dismisses the modal |
| **Leave player to content** | Player menu: Song details, Comments, Related, Versions, Extend; art/title tap | `closePlayerThen(href)` | Dismisses the modal, then pushes on the active tab |

Rules:

1. **Tab switches dispatch at the navigator level, never via hrefs.**
   expo-router's `linkTo` cannot express "switch tab without touching its
   stack": navigating an anchor href from a drilled tab PUSHES a duplicate
   anchor, and cross-tab hrefs carry nested `screen` params that reset the
   target tab (verified against the vendored react-navigation source in
   expo-router 56). The BottomTabBar registers the Tabs navigator with
   `src/navigation.ts`; `jumpToTab` dispatches `NAVIGATE` by NAME with no
   params (switch, stack untouched — the TabRouter resolves `payload.name`
   only) and the tab bar dispatches `POP_TO_TOP` on a focused re-tap — the
   stock react-navigation tab-bar actions.
2. **Tab-root hrefs (`/`, `/playlists`, …) are tab switches everywhere.**
   `goToSection`/`switchTo` detect them (`TAB_GROUP_BY_HREF`) and route through
   `jumpToTab`; a plain `router.navigate("/")` from another tab would push a
   Library copy into that tab instead.
3. **The player is a singleton.** `openPlayer()` uses `navigate`, never `push`.
   `closePlayerThen` must group-qualify its push (`/(tabs)/(group)/…`): the
   dismiss and the push drain in one router batch, so path resolution still
   sees the modal's segments and a bare href would always land in the first
   group — the Library tab.
4. **Async completions must not navigate blind.** Poll loops (generate /
   mashup / upload) gate their redirect on `useIsFocused` and defer it until
   the screen is focused again — otherwise the replace hits whatever tab the
   user moved to meanwhile.
5. **Sections are ordinary pushes now.** Stacks may grow during a session —
   that is native behavior; re-tapping the tab or Back unwinds them.
6. **One source of truth.** New nav surfaces import from `src/navigation.ts`
   rather than hand-rolling `router` calls for tab switches or player exits.

### Deep links

Cold-start deep links to shared-group routes (e.g. `/playlist-invite/[token]`,
`/song/[id]`) resolve into the FIRST group — they open in the Library tab with
the target pushed there. That is the accepted behavior for now ("open in
Library context"); if a link should land in a semantic tab, rewrite it to a
group-qualified href via a `+native-intent` layer.

## Verification (on-device — REQUIRED)

Static checks pass (`tsc` clean, `expo lint` 0 errors) but navigation behavior
is runtime-only. On a dev build, confirm:

- [ ] Tab switch (Library → Playlists → Library) is instant, no slide animation,
      and Library keeps its scroll position.
- [ ] Drill into a song from Library, switch to Playlists and back — Library
      still shows the song detail; Back pops to the Library list.
- [ ] Re-tapping the active tab pops its stack to the tab home.
- [ ] Profile tab: hamburger (no back chevron), stays highlighted on its
      sub-screens.
- [ ] Sidebar → Discover → Radio → Back lands on Discover, Back again on the
      originating tab home. iOS swipe-back works on every pushed screen.
- [ ] Sidebar edge-swipe opens the drawer on tab roots only; on pushed screens
      the same edge triggers swipe-back instead.
- [ ] Player opens as a headerless sheet (no "Now Playing" native bar), swipe-down
      dismisses; only ever one player instance.
- [ ] Player menu: Queue / Lyrics / Add-to-playlist appear as sheets over the
      player (close via X or swipe); Song details / Comments / Related / Versions /
      Extend close the player and land on the active tab with chrome visible.
- [ ] Mini-player + tab bar visible on all tab screens, absent on login; they
      slide under the player modal instead of popping in/out.
- [ ] Last list rows reachable above the mini-player while music plays
      (Library, Search, Playlist detail, Settings, Profile, RSS feeds).
- [ ] Sign out (Settings) lands on login with no chrome; logging back in lands
      on Library.
- [ ] Generate → song ready → replaces to the song detail inside the current tab.
