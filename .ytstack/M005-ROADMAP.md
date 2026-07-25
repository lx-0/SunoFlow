---
milestone: M005
project: SunoFlow
size: M
created: 2026-07-22T11:45:00Z
status: done
total_slices: 4
completed_slices: 4
---

# M005 Roadmap

**Goal:** A STUDIO host can open a jam session that guests in the room join via
QR without accounts, push prompts that appear instantly as pending cards in the
shared session playlist, and hear the generated songs auto-append to the host's
running party queue.

**Exit criteria:**
- Host creates a session; QR / share URL grants tokened guest access, zero login.
- Guest prompt POST → pending song card visible to host + guests within one poll interval (<5s).
- Completion → song in session playlist AND auto-appended to the host's play queue.
- Session budget + per-guest rate limit enforced server-side (tested); host veto (delete pending card).
- E2E: host-create → guest-push → completion-enqueue with Suno mocked; CI green.

## Slices

Slice detail lives in per-slice `M005-S##-PLAN.md` files, created by `ytstack:slice-milestone`.

- [x] S01 -- Backend: session lifecycle, tokened guest access, prompt→generation with budget/rate-limit/veto guardrails (route+unit tested, Suno mocked)
- [x] S02 -- Host experience: start session + QR overlay, live queue with pending cards, veto, auto-append to play queue (e2e)
- [x] S03 -- Guest experience: tokened mobile-web page, prompt composer with visible limits, nickname, reactions (full-path e2e)
- [x] S04 -- Native host surface (operator request 2026-07-22): jam list/create screen + host console (poll, QR, share sheet, veto, close) in the RN app; sidebar entry. Server 403s non-studio (the app does not know the tier). Runtime verification = next device pass.

## Post-milestone extensions (operator requests after closure)

M005 stays `status: done` — these shipped as BAU on top of it and are recorded
here so the roadmap does not read as the complete picture of Party Mode.

- 2026-07-25, `1f20cdc7` — **Host can queue their own prompts** (web + native).
  The milestone shipped a guest-only prompt path; running a party meant scanning
  your own QR code. New authenticated `POST /api/jam-sessions/[id]/entries`;
  skips the per-guest cap, keeps the budget reservation.
- 2026-07-25, `60363f4a` — **Optimize** button on both prompt inputs. Tokened
  route on the host's Suno key, no song-budget consumption, own IP bucket, Undo.
- 2026-07-25, `fa6bb705` — **Optimize learns within the session** from playback
  and host vetoes; falls back to Suno's stateless boost with no signal.

Still open against the original exit criteria:
- **The real party test.** Everything is verified against a local production
  build and unit/e2e mocks; no session has been run end to end on sunoflow.app
  with a live Suno key.
- **Native runtime unverified.** The RN jam changes are JS-only, but a release
  build embeds its bundle — the device pass needs `pnpm release`.
- **Cross-session learning** (host's own accept/edit/undo history) is the
  natural next layer and needs its own storage decision. Not started.

## Run order

Slices execute sequentially. After each slice, `ytstack:reassess-roadmap` checks if the plan still fits reality.

## How to update this file

- Flip slice checkbox `[ ]` → `[x]` when its tasks are all `summarize-task`-confirmed
- Update `completed_slices` count
- On milestone completion, flip `status: done` → `status: done` and update global ROADMAP.md
