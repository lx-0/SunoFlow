---
milestone: M005
project: SunoFlow
size: M
created: 2026-07-22T11:45:00Z
status: planned
total_slices: 3
completed_slices: 0
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

- [ ] S01 -- Backend: session lifecycle, tokened guest access, prompt→generation with budget/rate-limit/veto guardrails (route+unit tested, Suno mocked)
- [ ] S02 -- Host experience: start session + QR overlay, live queue with pending cards, veto, auto-append to play queue (e2e)
- [ ] S03 -- Guest experience: tokened mobile-web page, prompt composer with visible limits, nickname, reactions (full-path e2e)

## Run order

Slices execute sequentially. After each slice, `ytstack:reassess-roadmap` checks if the plan still fits reality.

## How to update this file

- Flip slice checkbox `[ ]` → `[x]` when its tasks are all `summarize-task`-confirmed
- Update `completed_slices` count
- On milestone completion, flip `status: planned` → `status: done` and update global ROADMAP.md
