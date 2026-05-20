---
milestone: M001
slice: S03
task: T03
project: SunoFlow
closed: 2026-05-18T10:40:00Z
verification: passed
---

# M001-S03-T03 -- Summary

## Outcome

`.ytstack/M001-FOLLOWUP-ROADMAP.md` mit M002-M008+ Sequenz und 2 neue DECISIONS-Entries (D15 Naming-Drift, D16 Sequenz-Order).

**Headline:**

- **6 Implementations-Milestones** definiert (M002-M007), plus M008+ als optional/retrospective:
  - **M002 Generate-Refactor** -- Med risk, L size (D3, D10, D11-generate, D12, D15) -- 7-10 tasks
  - **M003 IA-Konsolidierung Phase 1** -- Low risk, M size (D4-D5, D6, D9) -- 5-7 tasks
  - **M004 IA-Konsolidierung Phase 2** -- Med risk, M size (D7, D8, D11-full) -- 5-7 tasks
  - **M005 Dead-Code Cleanup** -- Low risk, S size (4 orphans + inventory refresh) -- 2-3 tasks
  - **M006 SongDetailView Sibling-Refactor** -- High risk, L size, **GO/NO-GO** -- 7-10 tasks
  - **M007 QueueContext-Split** -- High risk, L size, **GO/NO-GO** -- 7-10 tasks
- **Decision Cross-Reference Tabelle:** alle D2-D14 haben einen M002-M007 Home. Plus D15+D16 hier eingefuehrt.
- **Sequence Rationale** explizit dokumentiert (warum M002 zuerst, warum M003+M004 Phase-1/2, warum M005 vor M006, warum M006+M007 GO/NO-GO).
- **Total Effort Estimate:** 19-27 Tasks im "default" Pfad (M002-M005), 33-47 Tasks im "all-go" Pfad inkl. M006+M007.

**Neue DECISIONS:**
- **D15 -- Naming-Drift Resolution (Pre-M002):** API-Vocab gewinnt (`style` + `prompt` ueberall im Code), Form-State-Vars werden umbenannt, UI-Labels bleiben user-friendly. M002 Vorbedingung.
- **D16 -- Folge-Milestones Sequence Order:** Cluster-Approach (Option C) statt All-in-One (A) oder Per-Decision (B). Begruendung: Hot-File-Konflikt-Risiko + Dependencies + Lerneffekt.

## Deviations from plan

- Plan-Verification pattern `^## M[0-9][0-9][0-9] ` (2 hashes) -- ich habe `### M002 -- ...` (3 hashes) als Heading-Level gewaehlt weil §-Sections im Doc oben auf `##` sind und Milestones logisch sub-sections davon. Verification mit `### M[0-9][0-9][0-9]` zeigt 6 Milestones, Plan-Threshold (>=5) erfuellt.
- Plan-Verification erwartete >=5 risk-classified rows. Output hat 12 "Risk **Med/Low/High**" mentions (jeder Milestone in Detail-Block + Summary-Tabelle).
- Plan mentioned "1-2 neue DECISIONS-Entries". Output hat 2 (D15, D16). Innerhalb des Plan-Korridors.

## Follow-ups

**Fuer S03-T04 Migration-Strategie:**
- M002 Feature-Flag-Approach explizit konkret machen (GrowthBook-Flag-Name `generate_v2`, 2-Wochen-Soak).
- 301-Redirect-Tabelle fuer Phase 1 (6 alte URLs in M003) und Phase 2 (3 URL-Renames in M004) erstellen.
- Bookmark-Risk-Decision: wie lang bleiben Redirects? Permanente Decision-Entry-Kandidat.

**Fuer S03-T05 Excalidraw-Mockups:**
- 3 Mockups planned: entlastete Generate-View (M002 Default-Mode + Advanced), konsolidierte Top-Level-Navigation (M003+M004 nachher), Library mit ggf. integrierten Discover-Elementen (M005 fallback?).
- T05-Output dient als visuelle Referenz fuer M002+ Implementer.

**Nicht-FOLLOWUP Out-of-Scope dokumentiert:**
- Bottom-Nav-Re-Eval bleibt M008+ optional (D14 ist preserve-drawer).
- FormField-Design-System ist M008+ optional.
- Inventory-Refresh nach Paperclip SUNAA als Sub-Issue (BAU, kein ytstack-Milestone).
- /api-docs Dev-Menu-Sortierung ist M002+ optional (kleine UX-Verbesserung, nicht Decision-Pflicht).

**KNOWLEDGE.md-Entry-Kandidat fuer M002-Start:**
- "Hot-File Refactor-Strategy" -- god-object touch ohne Feature-Flag = production-risk. M002 ist erstes Praezedenz fuer Feature-Flag-protected Refactor in SunoFlow.

## Verification

Plan-Command:
```bash
test -f .ytstack/M001-FOLLOWUP-ROADMAP.md && \
  grep -cE '^### M[0-9][0-9][0-9] ' .ytstack/M001-FOLLOWUP-ROADMAP.md && \
  grep -cE 'D[0-9]+' .ytstack/M001-FOLLOWUP-ROADMAP.md && \
  grep -cE 'M001-S03-T03 D' .ytstack/DECISIONS.md && \
  grep -ciE 'Risk.*\*?\*?(Low|Med|High)' .ytstack/M001-FOLLOWUP-ROADMAP.md
```

Result: `MILESTONES=6` (>= 5 ✓), `DECISIONS_REF=38` (>= 13 -- all D's multi-referenced ✓), `NEW_DECISIONS=2` (>= 1 ✓), `RISK_CLASSIFIED=12` (>= 5 ✓). All thresholds met.
