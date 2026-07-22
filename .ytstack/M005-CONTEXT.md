---
milestone: M005
project: SunoFlow
created: 2026-07-22T11:45:00Z
size: M
---

# M005 -- Context

## Goal

A STUDIO host can open a jam session that guests in the room join via QR
without accounts, push prompts that appear instantly as pending cards in the
shared session playlist, and hear the generated songs auto-append to the
host's running party queue.

## Exit criteria

- Host creates a session from the web app; the QR / share URL grants tokened
  guest access with zero login.
- A guest prompt POST creates a pending song card that is visible to the host
  and all guests within one poll interval (<5s).
- On generation completion the song is (a) in the session playlist and (b)
  automatically appended to the host's play queue.
- Session budget and per-guest rate limit are enforced server-side (unit +
  route tests); the host can delete a pending prompt (veto).
- An E2E spec covers host-create → guest-push → completion-enqueue with the
  Suno API mocked; CI green.

## Size

M -- see `M005-ROADMAP.md` for slice breakdown.

## Decisions locked in discuss phase

- 2026-07-22: Direct push, no approval gate — the visible prompt-as-pending-card
  IS the party mechanic (operator decision, supersedes the agent's initial
  host-approval proposal). Guardrails are invisible: session budget set at
  open time (visible as countdown), per-guest rate limit, host veto (delete
  pending card) instead of approval.
- 2026-07-22: No synced playback — the host device is the speaker; guests are
  remotes (queue view, prompt push, reactions). Audio sync is out of scope.
- 2026-07-22: Guests join via QR + session token on mobile web, no account.
  Registration mid-party kills the flow; sessions may mint invite codes as a
  funnel (v2).
- 2026-07-22: STUDIO-gated (costs real host credits; premium party moment).
- 2026-07-22: Accepted risk — Suno compliance rejects for offensive guest
  prompts land on the host's account; budget + veto bound the blast radius.
- 2026-07-22: Built on existing primitives: pending-generation song cards,
  generation queue/completion pipeline, public share slugs, single-use-token
  mechanic (invite codes), reactions, polling (no websockets in v1).

## Open questions

- Guest identity within a session (nickname? emoji avatar?) for "who requested
  this" labels on cards — decide during slicing.
- Where the party queue lives when the host closes the tab mid-session
  (PlaybackState.queue persistence exists — check fit during slicing).
- Exact budget/rate-limit defaults (e.g. 30 generations / 2 open prompts per
  guest) — pick during slicing, keep configurable at session creation.

Pitch: `.ytstack/OFFICE-HOURS-party-mode.md` (operator-validated 2026-07-22).
