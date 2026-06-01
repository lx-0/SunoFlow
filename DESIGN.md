---
name: SunoFlow
description: A power-user workbench around Suno AI music generation.
colors:
  magenta: "oklch(62% 0.27 350)"
  magenta-hover: "oklch(68% 0.24 350)"
  magenta-deep: "oklch(50% 0.22 350)"
  surface-deep: "oklch(15% 0.01 350)"
  surface: "oklch(18% 0.01 350)"
  surface-raised: "oklch(22% 0.015 350)"
  surface-hover: "oklch(26% 0.015 350)"
  border: "oklch(28% 0.015 350)"
  border-strong: "oklch(40% 0.02 350)"
  text-primary: "oklch(96% 0.005 350)"
  text-secondary: "oklch(72% 0.01 350)"
  text-muted: "oklch(50% 0.01 350)"
  status-ready: "oklch(72% 0.18 145)"
  status-generating: "oklch(78% 0.18 85)"
  status-error: "oklch(65% 0.22 25)"
  status-info: "oklch(72% 0.15 235)"
  light-surface: "oklch(98% 0.003 350)"
  light-surface-raised: "oklch(99% 0.003 350)"
  light-text-primary: "oklch(18% 0.01 350)"
  light-border: "oklch(90% 0.005 350)"
typography:
  display:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.04em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  "2xl": "20px"
  full: "9999px"
spacing:
  "2xs": "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  "2xl": "48px"
components:
  button-primary:
    backgroundColor: "{colors.magenta}"
    textColor: "{colors.surface-deep}"
    rounded: "{rounded.lg}"
    padding: "10px 18px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.magenta-hover}"
    textColor: "{colors.surface-deep}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "10px 18px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.text-primary}"
  input-text:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "10px 14px"
    typography: "{typography.body}"
  card:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: "20px"
  chip:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
    typography: "{typography.label}"
  chip-active:
    backgroundColor: "{colors.magenta}"
    textColor: "{colors.surface-deep}"
  status-pill-generating:
    backgroundColor: "{colors.status-generating}"
    textColor: "{colors.surface-deep}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
    typography: "{typography.label}"
  status-pill-ready:
    backgroundColor: "{colors.status-ready}"
    textColor: "{colors.surface-deep}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
    typography: "{typography.label}"
  status-pill-error:
    backgroundColor: "{colors.status-error}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
    typography: "{typography.label}"
---

# Design System: SunoFlow

## 1. Overview

**Creative North Star: "The Late-Night Studio Console."**

SunoFlow is the dim console at the side of a home studio at 11pm. The surface is tinted-near-black so the work, cover art, waveforms, generation progress, can do the talking. One accent burns hot through that dark like a status LED on a piece of audio hardware: electric magenta, used surgically, never as decoration. Everything else stays out of the way of the music.

Density is high but never anxious. This is a tool for someone making their tenth playlist of the night, not their first, so layouts favor information over wayfinding and inline action over progressive disclosure. Three modes (Browse, Generate, Edit) share the same chrome, and each one earns full focus when active. Nothing co-renders, nothing competes.

This system explicitly rejects: the 2025 AI-tool look (mesh gradients, glassy violet cards, glowing orbs), the generic SaaS template (hero-metric cards, indigo-purple gradients, identical 3-up grids), the consumer-music-app feed (algorithmic recommendation rails, "Made for you", in-player banners), and Suno.com's own visual chrome (glassmorphism, neon, promo sidebars). SunoFlow takes Suno's creative energy and refuses Suno's surface.

**Key Characteristics:**
- Dark-first surface tinted toward the brand magenta (chroma 0.01)
- One hot accent, used on roughly 5 to 10 percent of any given screen
- Cover art is the loudest visual element by design
- Geist Sans for everything, Geist Mono for lyrics, IDs, and timing data
- Generous radii (12 to 20 px), flat surfaces, no shadow drama
- High information density; modes do not co-render
- Status as color language: ready, generating, error, info each own a hue

## 2. Colors: The Console Palette

A tinted-black workbench with one accent that means "the system is alive."

### Primary
- **Electric Magenta** (oklch(62% 0.27 350)): the single saturated color in the system. Used on active states (selected tab, focus ring, primary button), brand marks (logo, splash, install prompt), and the few moments per session that demand attention (the "Generate" CTA at rest, the cursor in the lyrics editor). Never as a gradient stop, never as a glow, never as a background fill on a non-interactive surface.

### Neutral (the surface stack)
- **Surface Deep** (oklch(15% 0.01 350)): the app background. Tinted-near-black with a faint warm pull toward the brand hue. Never pure black.
- **Surface** (oklch(18% 0.01 350)): the default panel background. Sits one notch above Surface Deep.
- **Surface Raised** (oklch(22% 0.015 350)): cards, inputs, sheets, modals. Where focused content lives.
- **Surface Hover** (oklch(26% 0.015 350)): hover and pressed states on raised surfaces.
- **Border** (oklch(28% 0.015 350)): default divider. Whisper-thin against Surface Raised, visible against Surface.
- **Border Strong** (oklch(40% 0.02 350)): emphasis dividers, focus outlines.

### Text
- **Text Primary** (oklch(96% 0.005 350)): body text, titles, headlines. Warm-tinted white, never pure white.
- **Text Secondary** (oklch(72% 0.01 350)): meta, captions, secondary labels.
- **Text Muted** (oklch(50% 0.01 350)): placeholders, timestamps, low-emphasis hints. Used sparingly; muted text on a dark surface fails contrast fast.

### Status (the color language)
- **Status Ready** (oklch(72% 0.18 145)): generation complete, save succeeded, song available. A clear analog green.
- **Status Generating** (oklch(78% 0.18 85)): in-flight work, processing, queued. Sodium amber, the broadcast-warmth color.
- **Status Error** (oklch(65% 0.22 25)): failed generation, validation error, destructive action. Warm red, not blood red.
- **Status Info** (oklch(72% 0.15 235)): neutral notifications, soft hints, informational tooltips. Cool steel-blue.

### Light theme (deferred, declared)
A light-mode parity exists as a comfort fallback. Same tokens, inverted lightness, same magenta accent (clarity reduced to oklch(55% 0.24 350) to stay legible on light backgrounds). Light surface uses oklch(98% 0.003 350), never pure white. Treat dark as primary in every design decision; light follows mechanically.

### Named Rules
**The One Spark Rule.** Electric Magenta lives on no more than 10% of any rendered screen. Its rarity is what makes it read as "the system is alive." If you find yourself reaching for it twice in the same component, it is wrong both times; pick the more important one.

**The Tinted Neutrals Rule.** No pure `#000` or `#fff` anywhere, ever. Every neutral carries a faint chroma toward the magenta hue (chroma 0.005 to 0.015). Pure white on dark mode reads as a CSS reset; tinted off-white reads as a designed choice.

**The Status-as-Sentence Rule.** Status colors are the only place outside the primary accent where saturation goes above 0.15. Use them as verbs (generating, ready, error), not as decoration. A green pill means "ready"; a green border on a card means nothing and should not exist.

## 3. Typography

**Display Font:** Geist Sans (with system-ui, sans-serif fallback)
**Body Font:** Geist Sans (same family across the entire scale)
**Mono Font:** Geist Mono (for lyrics editor, persona IDs, timestamps, song slugs)

**Character:** Geist Sans does the entire range of the UI from display to label by leaning on its variable weight axis. The pairing with Geist Mono is structural: anything that is content-the-user-types-or-generates (lyrics, prompt body, slug, ID, timing offset) lives in mono. Everything that is chrome lives in sans. This pulls the user's own work visually out of the surrounding interface.

### Hierarchy
- **Display** (700, clamp(2.25rem, 5vw, 3.5rem), line-height 1.05, tracking -0.02em): page-defining headlines. Landing hero, empty-state encouragement, large numeric totals.
- **Headline** (600, 1.75rem, line-height 1.15, tracking -0.015em): section openers inside a page, expanded-player track title.
- **Title** (600, 1.125rem, line-height 1.3, tracking -0.005em): card titles, sheet headers, song titles in the library row.
- **Body** (400, 0.9375rem / 15px, line-height 1.55): the workhorse. Form labels, descriptions, helper copy, secondary content.
- **Label** (500, 0.75rem / 12px, tracking 0.04em, uppercase or sentence case as fits): chips, button text, status pills, metadata captions.
- **Mono** (400, 0.875rem / 14px, line-height 1.5): lyrics editor body, persona ID, timestamp, song slug, anything content-typed.

Body line length caps at 70ch. Long-form copy (lyrics, descriptions) gets the cap; chips and inline meta do not need it.

### Named Rules
**The Single-Family Rule.** Geist Sans + Geist Mono. No third typeface, no display script, no editorial serif. The brand voice is "studio console," not "magazine."

**The Mono-for-Content Rule.** Any text the user authored or that comes back from an external system as identifying data (lyrics, prompt, slug, ID, timestamp) renders in Geist Mono. Any text the interface owns (labels, buttons, navigation, headings) renders in Geist Sans. The visual seam is the signal.

## 4. Elevation

The system is structurally flat. Depth comes from tonal layering, not shadows: Surface Deep at the floor, Surface for panels, Surface Raised for cards, Surface Hover for state. The eye reads these as four stacked planes without a single `box-shadow` declaration on the working canvas.

Shadows appear in three specific places only: the global player bar (a subtle upward-cast shadow so it floats over content), the active drag-state of a draggable song row, and the focus ring of the lyrics editor when active. Everything else is flat.

### Shadow Vocabulary
- **Player Float** (`box-shadow: 0 -8px 24px oklch(0% 0 0 / 0.4)`): the global player bar's upward shadow. Anchors it as a separate plane.
- **Drag Lift** (`box-shadow: 0 12px 32px oklch(0% 0 0 / 0.5)`): a row or card being dragged. Returns to flat on drop.
- **Focus Glow** (`box-shadow: 0 0 0 3px oklch(62% 0.27 350 / 0.35)`): the focus ring on the lyrics editor and primary text inputs. Magenta-tinted, never bright.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows are reserved for floating chrome (player), kinetic state (drag), and accent-focus moments (lyrics editor). A card with a shadow at rest is wrong; rebuild it as a tonal step.

**The No-Glassmorphism Rule.** No `backdrop-filter: blur`, no semitransparent surfaces over content, no frosted-glass headers, no glowing translucent cards. The surface is opaque; depth is tonal. Suno.com does the opposite of this; that is precisely why.

## 5. Components

### Buttons
- **Shape:** generously rounded (12px / `rounded-lg`), no perfect pills except for the icon-only round button (6px squared).
- **Primary:** Electric Magenta background, Surface Deep text, 10x18px padding, label typography (12px / 500 / 0.04em tracking). Used for the single committing action on any screen (Generate, Save, Sign In). Never more than one per visible region.
- **Hover / Focus:** background shifts to Magenta Hover (oklch 68% 0.24 350), no scale, no shadow. Focus adds the Magenta-tinted Focus Glow ring.
- **Ghost (secondary):** transparent background, Text Primary, same shape and padding. Hover fills with Surface Hover. This is the workhorse for inline actions.
- **Destructive:** Status Error background, Text Primary text. Used for destructive confirms only; never as a flat list item.
- **Icon-only round:** 36px circle, transparent at rest, Surface Hover background on hover. Used for player controls, toolbar actions, dismiss buttons.

### Chips
- **Style:** Surface Hover background, Text Secondary text, fully rounded (pill), 4x12px padding, label typography.
- **Active state:** Magenta background, Surface Deep text. Tags as filters, persona selectors, style tag input all use this pattern.
- **Status pills** are a separate token family, never reused as filters: they carry a status color (Ready / Generating / Error / Info) and Surface Deep text.

### Cards
- **Corner Style:** `rounded-xl` (16px) for most cards, `rounded-2xl` (20px) for the largest hero cards (expanded player, song detail header).
- **Background:** Surface Raised. No nested cards under any circumstance.
- **Shadow Strategy:** none at rest. See Elevation.
- **Border:** none on Surface Raised against Surface (tonal step is enough). 1px Border line when sitting on Surface Raised against Surface Raised (rare).
- **Internal Padding:** 20px default, 16px for compact cards (queue items, library rows), 28px for hero cards.

### Inputs (text, search, lyrics editor)
- **Style:** Surface Raised background, no border at rest, `rounded-lg` (12px), 10x14px padding for single-line, full padding for textareas.
- **Focus:** Focus Glow ring (3px magenta-tinted halo). The input itself does not change color.
- **Error:** Status Error border (1px) plus the field's helper text in Status Error.
- **Lyrics textarea:** Geist Mono body, line-height 1.6, 70ch line length cap, line numbers off (this is writing, not coding).

### Bottom navigation (mobile-PWA)
- **Style:** fixed bottom bar, Surface background, Border-top divider, 64px tall.
- **Items:** icon (Lucide, 22px stroke 1.5) above label (10px label-tracking 0.05em). Active item: Text Primary with a thin Magenta underline-line, inactive items: Text Muted.
- **Three slots:** Browse, Generate, Edit. The same three modes referenced in PRODUCT.md. Plus a "more" slot for admin, settings, account.

### Cover Art
- **Aspect:** 1:1, displayed at the natural size of the surrounding container.
- **Corner Style:** matches the container (`rounded-xl` in cards, `rounded-lg` in library rows, `rounded-2xl` in the expanded player).
- **Treatment:** never tinted, never desaturated, never overlaid with a gradient at rest. The art is the work; the system carries the rest. A 6px Surface Hover backdrop sits behind it as a fallback only when art is missing.
- **Playing state:** a 2px Magenta border ring (outside the corner radius) appears when the song is the currently-playing track. No animation on the art itself; the waveform handles motion.

### Waveform
- **Style:** SVG bars rendered in Text Muted at rest, Magenta where the playhead has passed, with the active bar at Magenta Hover. 1px gap between bars at minimum.
- **Animation:** the active bar breathes (subtle scale-Y from 1 to 1.15 on a 1.2s cubic-bezier loop) while playing. Reduced-motion drops to a static fill.

### Global Player
- **Position:** fixed bottom on desktop, sits above bottom nav on mobile (separated by 1px Border).
- **Surface:** Surface, Player Float shadow.
- **Structure:** cover art on the left, title + artist meta in mono-vs-sans split, waveform in the middle, controls on the right. No expanded artwork at rest; tap to open expanded player.

## 6. Do's and Don'ts

### Do:
- **Do** use Electric Magenta on the one most-important interactive state per screen. Treat its appearance as a budget.
- **Do** keep the surface tonal: Surface Deep, Surface, Surface Raised, Surface Hover. Four planes, no shadows, no borders if a tonal step works.
- **Do** render user-authored content (lyrics, prompts, slugs, IDs, timestamps) in Geist Mono. Render interface chrome in Geist Sans. The font is the signal.
- **Do** let cover art be the loudest thing on screen. Never apply gradient overlays, tints, or "AI" filter effects to it.
- **Do** use status colors as verbs: Ready, Generating, Error, Info. Each owns a pill and means one thing.
- **Do** validate contrast on every magenta-on-surface combination at WCAG AA before shipping.
- **Do** honor `prefers-reduced-motion` everywhere. Waveform breathing, slide-in transitions, queue pulses all collapse to instant state.

### Don't:
- **Don't** use violet, indigo, or purple as accent colors anywhere in the UI. The 1049 inline `text-violet-*` and `bg-violet-*` utility usages in current components are a migration backlog, not a pattern to extend. New components must use `magenta` tokens; old components migrate on touch.
- **Don't** use `#000`, `#fff`, `#f9fafb`, or any pure or barely-tinted gray. Every neutral references the magenta-tinted scale. The `font-family: Arial` declaration in `globals.css` is a stale bug to remove; Geist Sans is the only sans-serif in this system.
- **Don't** ever render gradient text (`background-clip: text` over a gradient). Single solid color, weight or size for emphasis.
- **Don't** use glassmorphism, `backdrop-filter: blur`, frosted overlays, or semitransparent surfaces over content. SunoFlow is opaque. Suno.com's chrome is the cautionary tale, not the template.
- **Don't** build hero-metric cards (big number, small label, supporting stats, gradient accent). The admin dashboard tells the truth with dense tables and small numbers, not SaaS-pitch tiles.
- **Don't** nest cards. A card inside a card means the outer card should have been a section header.
- **Don't** add a side-stripe border (`border-left: 4px solid <color>`) as a callout or alert treatment. Use a full thin border, a tonal background tint, or nothing.
- **Don't** use modal dialogs as the first thought. Drawers (bottom sheet on mobile, right-side panel on desktop) and inline expansion handle most cases. Modal is only for genuinely interrupting confirmations.
- **Don't** co-render Browse, Generate, and Edit. One mode owns the surface at a time. A persistent "generate panel" in the library sidebar is a violation.
- **Don't** add "Made for you" sections, recommendation rails, marketing banners inside the player, or any algorithmic feed surface. SunoFlow is a workbench, not a discovery product.
- **Don't** animate CSS layout properties (`width`, `height`, `top`, `left`, `padding`, `margin`). Animate `transform` and `opacity`. Use ease-out-quart or ease-out-expo curves; never bounce, never elastic.
- **Don't** use em dashes in UI copy. Commas, colons, semicolons, periods, parentheses cover every case.
