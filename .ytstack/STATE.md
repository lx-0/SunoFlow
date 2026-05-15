---
project: SunoFlow
slug: SunoFlow
last_updated: 2026-05-15T17:55:00Z
current_milestone: none
active_slice: none
active_task: none
status: brownfield-imported
---

# State

**Status:** brownfield import complete. No active milestone yet — execution is happening on Paperclip (SUNAA) via per-routine sub-issues, not via ytstack milestones.

## Next action

The user decides:

- If a discrete *initiative* needs structured planning (e.g. "rewrite the player", "add stem separation"), run `ytstack:plan-milestone` for that scope.
- For continuous BAU work (bug triage, routine features), keep using Paperclip SUNAA routines + sub-issues. Don't double-track.

## Open decisions

- Whether to migrate ongoing Paperclip-tracked work into ytstack milestones, or keep them as parallel layers. Currently parallel: ytstack for big-picture decisions/knowledge, Paperclip for issue-level execution.

## Recent summaries

(Empty — no T##-SUMMARY.md yet. Will populate once `ytstack:plan-milestone` + `summarize-task` start running.)

## Recent commits (2026-05-15 evening)

- `23116cc` fix(test): use BigInt() instead of literal suffix in active-users tests
- `d31671c` test(active-users): cover count, list, and daily helpers
- `ab1fa19` fix(observability): correct active-user signal, streak triggers, failed-song archival
- `5579658` fix(deploy): wire NEXT_PUBLIC_BUILD_ID through CI → Railway → Docker build
- `0d1fbfd` chore: initialise ytstack (brownfield import)
- `7ef992f` fix(auth): honor ADMIN_EMAILS in requireAdmin server-route guard
- `b78deb7` feat(sw): per-deploy cache busting + safer auto-reload UX

## Active background tasks

- `b3ckyynwu` — `gh run watch 25927179799` (CI for `23116cc`). On success, ~5min Railway build, then verify `/api/admin/metrics` returns Activity-based `activeUsers7d/30d` and confirm streak advances on next play.
