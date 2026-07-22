---
name: Party Mode (Jam Sessions)
one-liner: An AI jukebox for SunoFlow Studio hosts that lets room guests push song prompts straight into a live shared queue — no accounts, no friction.
date: 2026-07-22
mode: builder (operator opinion session — forcing questions explicitly skipped by operator)
status: validated-by-operator
---

# Party Mode / Jam Sessions — Pitch

## Concept (operator's framing, locked)

A STUDIO account opens a **jam session** — under the hood a shared playlist with a
live queue. Guests in the room join via **QR code / share token, no account**.
They push prompts **directly** onto the session: the prompt itself appears
immediately as a visible pending card in the party playlist ("'italo disco über
kalte Pizza' — generating…"). When generation completes, the card becomes the
playable song, is auto-loaded into the playlist, and is appended to the host's
running party queue. **No approval gate** — the prompt-as-visible-queue-item IS
the party mechanic (anticipation is part of the experience).

## Why this fits SunoFlow now

- **Needs zero user base.** The closed beta has a handful of accounts; any
  account-to-account social feature starves. Party mode needs ONE host plus
  friends with phones in the same room. It is the only multi-user surface that
  works at current scale — and doubles as a funnel (guests experience the
  product live; sessions can mint invite codes).
- **Suno's 1–3 min generation latency is masked by playback.** Music is already
  playing; requests trickle into the queue while people talk. Few use cases fit
  the latency this well.
- **It composes from existing primitives** (verified in code 2026-07-22):
  pending-generation songs already render as "generating" cards and are
  completed by the existing pipeline; public share slugs + single-use tokens
  (invite codes) exist; generation queue, credits, rate limits, reactions
  exist; since today, line-synced lyrics (karaoke view candidate for v2).
- **Demand honesty:** strongest evidence is operator self-use — Alex will demo
  this at the next gathering. For a hobby-stage product that is valid demand,
  and the party itself is the first real observation session with real guests.

## Design commitments (make-or-break)

1. **Direct push, invisible guardrails.** No approval step. Instead:
   - **Session budget** set by host at open time (e.g. 30 generations),
     visible as a countdown — party dynamic, not friction.
   - **Per-guest rate limit** (e.g. 2 open prompts; slot frees when your song
     has played — also keeps the queue fair).
   - **Host veto, not host approval:** host can delete/skip any pending card.
     Brake, not gate.
2. **No synced playback.** The host device is the speaker; guests are remotes
   (see queue, push prompts, react). Audio sync is explicitly out of scope.
3. **Guest = QR + session token, mobile web, zero login.** Registration during
   a party kills the flow.

## Accepted risk

Suno compliance rejects for offensive guest prompts land on the HOST's account
(prompts run on the host's credits/API key). Acceptable for a friends-party
feature gated to STUDIO; the budget + veto bound the blast radius.

## v1 wedge

Host: open session from a playlist (or fresh), QR overlay, budget setting,
veto/skip. Guest (mobile web, tokened): see now-playing + queue incl. pending
prompt cards, push a prompt, emoji-react. System: prompt → generation with
session linkage → completion auto-adds to playlist + appends to host queue.
Polling, no websockets.

## Deferred (v2+)

Voting/reordering by guests; karaoke host-screen using the new line-synced
lyrics; "guest takes their song home" invite-code flow; multiple hosts;
persistent post-party recap page (session slug already public-shareable).

## Non-goals

Synced multi-device audio; account-to-account collaborative sessions (the
collaborative-playlist feature already covers shared editing between accounts);
opening generation to anonymous users outside a live session context.
