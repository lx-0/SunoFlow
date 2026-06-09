# Product

## Register

product

## Users

Solo operator (the maintainer) plus a small closed-beta circle of invited friends. Music hobbyists who already use Suno regularly and want a denser, more direct workspace around it than suno.com offers.

Context: late-night home sessions on desktop, occasional mobile-PWA use for quick playback and triage. Heavy-user volume from day one (hundreds of songs in the library, not a handful). They know what generation feels like, they don't need handholding, they need throughput.

Job to be done: shift between modes inside a single session, fluidly. Three are the core craft loop:
- **Browse**: scan a growing library, play, favorite, organize into playlists, find that one track from last month.
- **Generate**: draft lyrics + style + persona, push to Suno, watch the queue, hear the result.
- **Edit**: extend an existing track, mash two together, pull stems, render a video.

The product must make all three core modes first-class on the same surface. No mode is "primary"; the session decides.

A fourth, supporting surface sits alongside them:
- **Discover**: a feed, recommendations, public profiles, follows, and comments inside the closed-beta circle. This is the operator's own network, a way to hear what the people they invited are making, not an algorithmic timeline engineered to maximize time-on-app.

## Product Purpose

A power-user front-end to Suno that treats AI music generation as a craft tool, not as a content feed. The user is the operator, the surface is the workbench, the songs are the work.

What success looks like: the user opens SunoFlow at 11pm, generates four ideas, archives two, plays the third on a loop while drafting lyrics for variant five, drags three keepers into a playlist, all without leaving the page or thinking about the UI. The tool disappears into the act of making music.

What this is not: an ad-driven, engagement-farming feed, or a clone of Suno's chrome. SunoFlow does carry discovery and a light social layer (feed, profiles, follows, recommendations), but they serve the operator's own closed-beta circle and library, never an attention-maximizing stream. Suno owns generation. SunoFlow owns the operator's loop around it.

## Brand Personality

Three words: **Playful. Vibrant. Disciplined.**

Energy without noise. The color and motion come from the music itself: a cover-art swatch pulled forward as an accent, a status hue that signals "generating" or "ready", a waveform breathing while it plays. The chrome stays out of the way so the work can be loud.

Voice in copy: direct, present-tense, terse. Closer to a Linear command-palette than a SaaS onboarding tooltip. Never cute, never apologetic, never overexplaining. Errors say what broke and what to do; empty states tell you what to make.

The brand is the discipline of a power-user tool wearing the energy of a creative sandbox. Dark surface, restrained palette, one or two accent colors that earn their place, and cover art as the loudest thing on screen.

## Anti-references

- **Generic SaaS look.** No hero-metric cards, no indigo-purple gradients, no identical 3-up card grids, no Stripe/Vercel/Linear-clone marketing pages. The Linear-Vercel aesthetic without Linear-Vercel's substance is exactly the trap.
- **Suno.com's execution.** Glassmorphism, neon glow, promo sidebars, overlay bloat, animated mesh backgrounds, "explore" feeds pushed at the user. SunoFlow takes Suno's creative energy and refuses Suno's chrome.
- **Trendy AI-tool look.** Animated gradient meshes, dark glassy cards with purple-cyan glow, "Built with AI" sparkle iconography, hero-image-of-shifting-orbs hero sections. If a 2025 AI startup landing page would do it, SunoFlow does not.
- **Engagement-farming patterns.** No marketing banners inside the player, no hero album-art cards, no infinite autoplay rails or notification bait tuned to maximize time-on-app. Discovery and recommendations exist, but they stay a tool the operator opens deliberately, not a stream pushed at them.

## Design Principles

1. **Tool first.** Every screen should feel like a workspace the operator drives, not a stream the system pushes. Discovery, a feed, and social exist, but they are surfaces the operator opens deliberately, never an algorithmic timeline that farms attention or buries the user's own work under suggestions.

2. **Power before polish.** The audience is repeat users, not first-time visitors. Optimize for the tenth session, not the first. Keyboard paths, dense layouts, inline actions, and skipped confirmations beat tutorials, modals, and progressive disclosure. Onboarding exists, it just isn't the design center of gravity.

3. **Energy from the work, not the chrome.** Color, motion, and personality come from the songs themselves: cover art, waveforms, status states, generation progress. The surface stays tinted-near-black and quiet. When the surface tries to be vibrant, it competes with the work; let the work win.

4. **One mode at a time, three modes equal.** Browse, Generate, and Edit each deserve full focus when active. No persistent generate-panel cluttering the library; no library sidebar squeezing the mashup studio. Switching modes is cheap; co-rendering them is forbidden.

5. **Anti-Suno discipline.** This is about execution, not which surfaces exist. When in doubt about chrome, motion, or visual noise, look at what suno.com is doing and do the opposite. Suno is the inspiration for the energy and the cautionary tale for the execution. SunoFlow can carry the same kinds of surfaces (a feed, discovery), but if a design choice's *look* could appear on suno.com unchanged, it is the wrong choice.

## Accessibility & Inclusion

WCAG AA as the working baseline; AAA where it costs nothing. Closed-beta scope means no formal compliance audit yet, but no excuses for sloppy contrast or unreachable interactive elements either.

Required:
- Honor `prefers-reduced-motion`. Waveform animations, generation pulses, mode transitions all collapse to instant state changes when the user opts out.
- Keyboard parity. Every action reachable in two paths or fewer from anywhere; focus rings visible, not removed.
- Contrast: 4.5:1 minimum for body text on the dark surface, 3:1 for large text and UI controls. Cover-art-derived accents validated against the surface before use.
- Mobile-PWA reality: touch targets ≥44px, swipe gestures supplemented (never replaced) by visible controls.

Deferred:
- Full screen-reader audit, ARIA-live for queue updates, locale-aware right-to-left layouts. Tracked, not blocking.
