# SunoFlow Journey Audit

Recorded 2026-06-02 by walking a fresh authed user through the live app at `http://127.0.0.1:3200` with Playwright + Chromium. 32 screenshots in `/tmp/sunoflow-journey/` (ephemeral, regenerate with `node /tmp/sunoflow-journey/journey.mjs`). Findings below are observations from the actual rendered UI, not from reading source.

This audit captures the **current state**, not the target. It exists to make the gap between PRODUCT.md (strategy) and the real product visible, so the next round of design work has a concrete starting point.

## Headline finding

The "three modes" story (Browse, Generate, Edit) in PRODUCT.md does not survive contact with the product. The real surface area is roughly **twenty top-level routes**, organized as if SunoFlow were a discovery social network with a generation tool attached. Strategy says workbench, product says Bandcamp+Suno hybrid.

## Surface inventory (what actually exists)

Twenty routes visible in the sidebar after login:

| Cluster | Routes | PRODUCT.md says |
|---|---|---|
| Browse | Library, Favorites, History, Playlists | Mode 1 of 3 |
| Generate | Generate, Templates, Style Templates, Personas, Generation History, Inspire | Mode 2 of 3 |
| Edit | Mashup | Mode 3 of 3 (paywalled in reality) |
| Discovery / social | Discover, Explore, Feed, Radio, Inspire | Explicitly rejected ("no recommendation rails, no Made for you, no algorithmic feed") |
| Meta | Stats, Insights, Analytics, Compare, Notifications, Profile, Settings | Not discussed |

Discovery and Meta together are larger than Browse + Generate + Edit. The strategic model treats them as if they don't exist.

## Journey 1: Unauthenticated landing

`/` shows `LandingPage`. Light theme, large hero.

What works:
- Clear value prop ("Your personal AI music studio")
- "Private beta in progress" amber pill at the top of the hero
- Real beta-honest panel at the bottom ("Free during the beta, expect rough edges")

What contradicts PRODUCT.md / DESIGN.md:
- **Gradient text on "AI music"** in the hero headline. DESIGN.md absolute ban.
- **3 x 2 grid of identical feature cards** ("AI Music Generation / Library Management / Inspiration Feeds / One-click Sharing / Presets & Templates / Analytics") with the same icon-tile-heading-description shape. DESIGN.md "identical card grids" ban, exactly.
- **Inspiration Feeds is a marketed feature**, yet PRODUCT.md says SunoFlow is not a feed product. Strategy and marketing copy disagree.
- Light theme everywhere. PRODUCT.md sets dark-first.

## Journey 2: Login

`/login` is the most-restrained surface in the app: centered single-column form, big empty top, oversized lavender "SunoFlow" wordmark.

Friction:
- Wordmark is huge relative to the form. Vertical center is dead, so the form sits visually low.
- "Sign in to your music manager" subtitle uses *music manager*, not *music studio* (landing copy). Three different self-descriptions on three pages.
- Dark "N" debug indicator in the bottom-left is visible to a real user. Looks like a stray dev tool, not a designed element.

## Journey 3: First minute after login

After successful login, the app redirects to `/library` (not `/`). Library IS the home.

**The library renders an error state, not an empty state.** A new user with zero songs sees:

> ⚠ Failed to load library
> Something went wrong loading your songs. Please try again.
> [Try Again] [Go Home]

This is the most consequential finding in the audit. The single most-trafficked surface in the app, on its most common visit (fresh login), shows a fatal-error UI when the user has no data. There should be a celebratory or instructive empty state here ("No songs yet. Pick a style and Generate."). Same bug on mobile (`80-library-mobile.png`).

Cluster of related bugs:
- A red `2 Issues` pill (Sentry/GlitchTip dev overlay) appears in the bottom-left during the error state. In production this debug surface should never reach a user, dev or otherwise.
- `/history` (Recently Played) shows seven empty white skeleton cards with no content and no message. Not an error, not an empty state, just blank rectangles. Indistinguishable from "the list never finished loading".
- These two together mean the operator's two most-likely-first-screens (Library, History) both look broken to a fresh user.

## Journey 4: Generate mode

`/generate` is the densest surface in the app, and the closest fit to PRODUCT.md's tool ambition.

Strong:
- Two clear tabs at the top (Create, Upload).
- Auto-generate-from-description amber callout sits at the top of the form for the lowest-friction path.
- Form layout reads as a recipe: title → style → saved styles → lyrics generation → toggles → variations → big Generate button at the bottom.
- Save-as-preset and Save-as-template both visible inline as ghost buttons; the operator can capture a working configuration without leaving the page.

Friction:
- **Three layers of nested purple-tinted panels** (Apply Saved Style, Generate Lyrics, Generate Variations) sit inside the form. Cards inside a form inside a layout. DESIGN.md "no nested cards" rule is violated by design here.
- "Templates" + "Save as template" appear at the top, but "Presets" + "Save as preset" appear right below. Two terms for the same concept (a stored configuration), with no visible distinction. The sidebar has a `Templates` route AND a `Style Templates` route; the settings screens has a `Style Templates` tab too. Three names, unclear hierarchy.
- The top-bar (search, FREE pill, monitor icon, bell, Sign out) is **missing on `/generate`** but present on `/templates`, `/settings`, `/feed`, etc. The shell changes between routes. Inconsistent.

## Journey 5: Edit mode (Mashup)

`/mashup` is the entire Edit surface, and it is **paywalled behind "Upgrade to Starter"** for a fresh user.

> 🔒 Mashup Studio
> Blend two songs together into a unique mashup.
> [Upgrade to Starter →]

This is a strategic contradiction worth naming clearly:
- PRODUCT.md: "The product must make all three modes first-class on the same surface. No mode is 'primary'; the session decides."
- Reality: One of the three modes is locked. A user on the free tier has two modes, not three.

If PRODUCT.md's mode model is the strategy, this paywall is wrong. If the paywall is the strategy, PRODUCT.md is wrong. The team has to pick.

There is also no second Edit route: no extend-song, no stem-separation, no audio-upload-edit beyond the upload tab on Generate. Edit-as-a-mode currently means exactly Mashup, exactly paywalled.

## Journey 6: Discovery surface (a contradiction)

PRODUCT.md says, twice:

> Don't add "Made for you" sections, recommendation rails, marketing banners inside the player, or any algorithmic feed surface.
> SunoFlow is a workbench, not a recommendation engine.

The product has five discovery routes that all do exactly that:

- `/discover` ("Explore 0 publicly shared songs"): For-You / Browse / Trending / Popular / Collections / Playlists tabs; 16 genre chips; mood chips; tempo chips. Pure Spotify/Bandcamp browse pattern.
- `/explore` (same as discover, slightly different shell)
- `/feed` ("Your feed is empty. Follow other creators to see their songs..."): A social-network feed. Implies Profile + Follow + Comments + public song pages. Not mentioned in PRODUCT.md.
- `/radio`: presumably an algorithmic radio. Not opened in detail.
- `/inspire`: ambiguous, possibly LLM-suggested prompts.

`/playlists` shows three **auto-generated playlist cards** at the top of the page:
- "Your Top Hits" (Top Hits badge): most-played in 30d
- "New This Week" (New This Week badge): created in last 7d
- "Mood: Chill" (Mood badge): songs tagged chill

Those are the exact "Made for you" recommendation rails PRODUCT.md rejects, only with a different label.

This is either:
- a leftover from an earlier strategy and ready to be ripped out, or
- still on the roadmap and PRODUCT.md is the leftover.

Either way, picking one and removing the other is the next strategic decision, not "what color is the magenta".

## Journey 7: Settings cluster

`/settings` has Profile / Preferences / Account tabs. `/profile` is separate (public profile-as-page).

Working:
- Profile fields (avatar, display name, username, bio) are conventional and readable.
- Top bar shows a `200 cr` credit balance pill and a `FREE` tier pill. Both useful, both visible.

Friction:
- `Profile` appears as both a sidebar item AND a Settings tab. Two routes, partially overlapping. Username on Settings/Profile vs at `/profile` are different pages.
- `Templates` (sidebar) vs `Style Templates` (sidebar) vs Settings/Style-Templates tab vs the Templates button inside Generate. Four entry points for one concept.
- The "Please verify your email address" amber banner appears on every page that has the top bar (Templates, Settings, Feed, etc.) but is **invisible on Generate and Mashup** (which lack the top bar entirely). Email-verification nag is inconsistently shown.

## Journey 8: Mobile (PWA)

`390 x 844` viewport, the iPhone target.

Mobile bottom nav (visible on Generate, Mashup): **Home / Library / Inspire / Generate / Templates**. Five tabs, not the three "Browse / Generate / Edit" promised by PRODUCT.md. Edit is not even in the mobile nav; Mashup is buried.

`Home` is in both the desktop sidebar (top) AND mobile bottom nav. After login the user is on `/library`, not `/`. So "Home" is a route most authed users never use, sitting in the most prominent navigation slot on both surfaces.

Mobile Library: same "Failed to load library" hard-error. The mobile-PWA first-run experience on an empty account is broken-looking on the home tab.

Mobile Generate: form is dense but functional. Bottom nav stays anchored. Hamburger top-left opens what is presumably the full sidebar (not opened in this audit).

Mobile Mashup: identical paywall as desktop, just narrower.

## Cross-cutting findings

### 1. Shell is inconsistent

Two app shells coexist:

- **Shell A** (Library, History, Playlists, Generate, Mashup): Sidebar only, no top bar, no email-verify banner.
- **Shell B** (Templates, Personas, Settings, Profile, Feed, Discover, Stats): Sidebar + top bar with global search, credit pill, FREE pill, monitor toggle, bell, Sign out. Email-verify banner sits below the top bar.

Same app, two visual shells, no rule for which page gets which. Likely a half-finished migration. Pick one and apply everywhere.

### 2. Visual system is the current globals.css

Every screen confirms what the static scan already said:
- Light theme is the default. The user never sees the dark-mode brand the new PRODUCT.md describes.
- Purple (`#7c3aed` family) is the primary action color everywhere: SunoFlow wordmark, primary CTAs (Sign in, Generate, New, Try Again, Discover creators, Create your first playlist, Use template, Upgrade to Starter), active sidebar items, tab indicators, ghost-button text.
- Pure white surfaces dominate. Cards on `#f9fafb` panels on `#ffffff` is the default layout.
- Decorative gradients appear in the hero and on the Free-during-beta panel.

The visual migration scope is the whole app. The new DESIGN.md is the destination, the current screens are the starting line.

### 3. Operator-friction map

The fresh-user gauntlet from login to making the first song:

1. Login → redirect to `/library` → **error state**, not empty state. (Bug)
2. User clicks `Go Home` → lands on `/` → sees the unauthenticated landing page (because `/` for authed users is unclear). Or clicks `Generate` in the sidebar.
3. `/generate` → form loads. **No first-time guidance**, no "your first song" hint, no preset suggestion.
4. User fills the form → clicks Generate → (not exercised in this audit; would burn Suno credits).
5. After generating → back to `/library`? Or stays on `/generate`? Unknown.

The single highest-friction step is step 1. Fix the empty-state and the first-minute experience improves dramatically with no other changes.

The second highest-friction step is the **four overlapping names for the same concept** (Template, Preset, Style Template, Saved Style) which makes the Generate form harder to learn than the actual music decisions it captures.

### 4. Mode-claim vs route-count

The "three modes" model fits a five-route app. The product is a twenty-route app. Either:
- PRODUCT.md's mode model is the future-target and many existing routes need to be removed or merged (Discover/Explore/Feed/Radio collapsed, auto-playlists removed, Mashup unlocked, Inspire merged into Generate), OR
- PRODUCT.md needs to be honest that the product has Browse, Generate, Edit, Discover, Social, and Meta as six modes, and the design system has to handle six.

Pretending it's three when it's twenty produces design choices that don't match the surface.

## What to do next

In priority order, smallest-blast-radius first:

1. **Fix the Library empty state.** Replace the error UI on zero-data with an instructive empty state ("No songs yet. Generate one →"). This is a one-component fix and removes the worst first-minute friction.
2. **Hide the Sentry/GlitchTip "Issues" overlay in production.** It is currently visible to logged-in users.
3. **Decide Mashup's tier.** Either unlock it on the free tier (to keep PRODUCT.md's three-modes claim true) or rewrite PRODUCT.md to say Edit is paid.
4. **Pick one shell.** Either add the top bar to Generate and Mashup, or remove it from Templates / Settings / Feed. The hybrid state is the worst of both.
5. **Pick one Template/Preset name.** Four names for one thing is the form's biggest comprehension cost.
6. **Decide the Discovery cluster's future.** Discover / Explore / Feed / Radio / Inspire / auto-playlists either go, or PRODUCT.md changes. Half-shipping a feed product against an "anti-feed" strategy is the worst outcome.
7. **Plan the visual migration.** The whole app is currently the old light-purple system; the new dark-magenta DESIGN.md applies to nothing yet. Either migrate-on-touch (slow, mixed-state forever) or schedule a global token swap (fast, large diff).

Items 1, 2, 4, 5 are pure-UX fixes that need no strategic alignment. Items 3, 6, 7 are strategic and should go through the same process that produced PRODUCT.md, not be decided by the next person who touches the code.

## Methodology, caveats

- One user, empty database. Did not test populated-library, mid-generation, queue-full, error-recovery, or expired-credits states.
- Desktop viewport `1440x900`, mobile viewport `390x844`. No tablet, no fold.
- Did not trigger any real Suno generation (would burn credits and not change the visual record).
- Did not test the admin surface (`/admin`, `/dashboard`, `/users`, `/analytics`) since the journey user has no admin grant.
- Did not test the share-page surfaces (`/s/[slug]`, `/p/[slug]`, `/u/[handle]`) which a real fresh user would not see.
- Localization not tested; default `en-US` only.

Re-run the audit with `node /tmp/sunoflow-journey/journey.mjs` against a populated database to capture the with-songs journeys (populated Library, History, Playlists, Generation History, Favorites).
