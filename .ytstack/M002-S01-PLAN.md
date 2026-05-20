---
milestone: M002
slice: S01
project: SunoFlow
created: 2026-05-18T11:25:00Z
status: planned
task_count: 1
completed_tasks: 1
status: done
closed: 2026-05-18T12:00:00Z
note: T02+T03 collapsed into T01 (D15-Lite scope) -- types.ts mirrors DB, no rename needed; baseline-verify ran as part of T01 commit gate
---

# M002-S01 -- Slice Plan

**Goal:** Baseline-Setup verifizieren + Naming-Drift Refactor (D15) durchziehen. Pure Rename ohne Struktur-Change. Nach S01: Tests gruen, GenerateForm.tsx hat API-Vocab (style/prompt statt stylePrompt/lyrics).

## Tasks

- [x] T01 -- Naming-Drift Form-State (D15 Lite): rename useState vars in `GenerateForm.tsx` (`stylePrompt`→`style`, `lyrics`→`prompt`). Keep UI-Labels + HTML IDs + DB-shaped property accesses preserved. Tests + typecheck + build green. → `M002-S01-T01-SUMMARY.md` (commit 3622822)
- [SKIP] T02 -- Helpers + Types alignment: not needed for D15-Lite (types.ts mirrors DB shape, requires full schema migration -> out of M002 scope). Documented in T01-SUMMARY.
- [SKIP] T03 -- Verify baseline: ran as part of T01 commit gate (typecheck + tests + build all green pre-commit).

## Done when

All 3 tasks `[x]`, tests green, typecheck clean, commit pushed.

## Notes

(Add observations during slice execution.)
