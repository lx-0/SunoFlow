---
milestone: M001
slice: S03
task: T03
artifact: FOLLOWUP-ROADMAP
created: 2026-05-18T10:30:00Z
sources:
  - .ytstack/DECISIONS.md D1-D14 (IA-Decisions)
  - .ytstack/M001-IA-MAP.md §3 + §7 (Mapping + Constraints)
  - .ytstack/M001-GENERATE-REDESIGN.md §7 (M002 Implementation hints)
  - .ytstack/M001-COMPONENT-MAP.md §D (4 dead-code candidates)
totals:
  followup_milestones: 7
  decisions_consumed: 13
  decisions_added_in_T03: 2
---

# M001 Follow-up Roadmap (M002 - M008)

Geordnete Sequenz der Implementations-Milestones nach M001 (Plan-only). Jede Decision D2-D14 hat genau einen Home-Milestone. Sequenz-Order ist Dependency-driven, nicht User-Priority-driven.

---

## Sequence Overview

```
M001 (this) -- Plan-only UX overhaul (USER-JOURNEY, IA-MAP, DECISIONS)
       │
       ▼
M002 Generate-Refactor (high priority, fully planned)
   ├─ absorbs D3, D10, D11(generate-side), D12, D15
   ├─ Goal: GenerateForm 30→13 useState, 4 disclosure levels, Sub-Component-Split
   └─ Risk: Med (god-object touch, but no DB/Auth)
       │
       ▼
M003 IA-Konsolidierung Phase 1 (frontend-only)
   ├─ absorbs D4-D5 (Discover-merge), D6 (/songs-kill), D9 (Analytics-cluster)
   ├─ Goal: 4 Routes verschwinden, 4 Tabs erscheinen, no breaking changes
   └─ Risk: Low (Route-changes with 301-Redirects, no schema)
       │
       ▼
M004 IA-Konsolidierung Phase 2 (URL-changes + new Hub)
   ├─ absorbs D7 (URL-Fix), D8 (Profile-rename), D11(authoring-hub-full)
   ├─ Goal: /authoring Hub mit Tabs, URL-Fixes mit Redirects
   └─ Risk: Med (URL-Bookmarks brechen ohne sauberen Redirect)
       │
       ▼
M005 Dead-Code Cleanup + Inventory Refresh
   ├─ absorbs: M001 §9.4 Orphans (DashboardView, HistoryView, WaveformPlayer, SunoImportModal)
   ├─ Goal: 4 Components deleten, docs/feature-inventory.md refresh
   └─ Risk: Low (delete-only + doc-update)
       │
       ▼
M006 SongDetailView Sibling-Refactor (engineering pass)
   ├─ Sibling-Case zu M002 -- gleiche Progressive-Disclosure-Pattern auf 35 onClicks + 7 modals
   ├─ Goal: SongDetailView 39 useState → ~15, 6 modals → 6 BottomSheets-on-mobile
   └─ Risk: High (god-object Hot-File mit 57 commits)
       │
       ▼
M007 QueueContext-Split (engineering-only)
   ├─ 36-value Context aufteilen (state/ops/radio/audio-element refs)
   ├─ Goal: Consumer importieren nur was sie brauchen
   └─ Risk: High (Player race-path + cross-cut surface)
       │
       ▼
M008+ Optional (eval after M002-M007 retrospective):
   ├─ Bottom-Nav (D14 re-eval)
   ├─ FormField Design-System Component
   └─ etc.
```

---

## Milestone Detail

### M002 -- Generate-Refactor

**Goal:** GenerateForm von 30 useState auf ~13 reduzieren, 4-Tab-Structure (simple/advanced/mashup/compare) implementieren, 5 Sub-Components extrahieren, Naming-Drift fixen.

**Scope (Decisions absorbed):**
- **D3** -- `/compare` → `/generate?tab=compare`
- **D10** -- Generate-Cluster Tabs (simple/advanced/mashup/compare) + /generations Sub-View + /inspire bleibt separat
- **D11** (partial -- generate-side) -- Preset/Template-Picker im Form wird read-only (CRUD wandert nach `/authoring` in M004)
- **D12** -- Persona-Auswahl bleibt inline in GenerateForm
- **D15 (NEW)** -- Naming-Drift Resolution (Pre-Refactor-Decision)

**Files:**
- Modify: `src/components/GenerateForm.tsx` (44 commits, hot-file -- M002 ist groesste Single-File-Aenderung in der Sequenz)
- Modify: `src/components/generate-form/{api,helpers,types,useGenerateFormData}.ts`
- Create: `src/components/generate-form/{PersonaPicker,StyleBoostButton,LyricsGeneratorSheet,AdvancedDisclosure}.tsx` (4 new sub-components)
- Modify: `src/app/[locale]/generate/page.tsx` (tabs-rendering)
- Modify: `src/lib/generation/{params,request}.ts` (Naming-Drift D15)
- Add: 301-Redirects fuer `/mashup` → `/generate?tab=mashup`, `/compare` → `/generate?tab=compare`

**Dependencies:**
- M001 done (this).
- D15 Decision entered in DECISIONS.md before code work.

**Risk:** **Med** -- Hot-File-Touch (GenerateForm 44 commits, godd-object §7.6 Constraint). BUT: no DB migration, no Auth touch, no Player-race-path. Feature-Flag empfohlen.

**Rough Size:** **L** -- 7-10 tasks (1 Naming-Drift fix, 4 Sub-Component-Extraktionen, 1 Tabs-Wrapper, 1 Redirect-Setup, 1-2 Integration-Tests).

**Migration:** Feature-Flag `generate_v2` per GrowthBook/PostHog. New users get v2, legacy users opt-in. After 2 weeks soak: switch default. Old `/mashup` + `/compare` redirects bleiben dauerhaft fuer Bookmarks.

---

### M003 -- IA-Konsolidierung Phase 1

**Goal:** 4 Top-Nav-Routes verschwinden (/discover, /explore, /radio, /feed werden Tabs in /discover; /songs killed; /stats /insights /dashboard/analytics werden Tabs in /analytics). Phase 1 weil keine URL-renamings, nur Tab-Migration.

**Scope:**
- **D4-D5** -- /discover + /explore + /radio + /feed merge zu /discover mit Tabs
- **D6** -- /songs killen, SongsGalleryView wird LibraryView-Render-Mode
- **D9** -- Analytics-5-Cluster → /analytics mit Sub-Tabs + /admin/analytics

**Files:**
- Modify: `src/components/AppShell.tsx` (NAV_ITEMS reduzieren von 17 auf ~12 -- Phase 1 baseline)
- Modify: `src/app/[locale]/discover/page.tsx` (Tab-Hub mit DiscoverView/MoodRadioView/Feed components)
- Modify: `src/app/[locale]/analytics/page.tsx` (Tab-Hub mit 4 Analytics-Sub-Views)
- Modify: `src/components/LibraryView.tsx` (viewMode=gallery support, absorbs SongsGalleryView)
- Delete: `src/app/[locale]/{explore,radio,feed,songs,stats,insights,dashboard/analytics}/page.tsx`
- Add: 301-Redirects fuer 6 alten URLs auf neue Heimaten

**Dependencies:** M002 done (AppShell-Touch + Generate-Stabilitaet zuerst).

**Risk:** **Low** -- Frontend-only, kein DB-Schema, keine Auth. 301-Redirects sind etablierte Praxis.

**Rough Size:** **M** -- 5-7 tasks (3 Tab-Hub-Implementierungen + 1 LibraryView-Extension + 1 AppShell-Reduktion + 1 Redirect-Setup + 1 Test-Integration).

---

### M004 -- IA-Konsolidierung Phase 2

**Goal:** URL-Renamings (D7, D8) und `/authoring` Hub (D11 full). Phase 2 weil URL-changes mit Bookmark-Risk.

**Scope:**
- **D7** -- `/discover/collections/[id]` → `/library/collections/[id]`
- **D8** -- `/users/[id]` → `/profile/[id]` (`/u/[username]` bleibt public)
- **D11 (full)** -- `/authoring` Hub mit Tabs Personas/Templates/Style-Templates; delete `/personas`, `/templates`, `/style-templates` Top-Level-Routes; CRUD-Sub-Apps wandern aus GenerateForm hierher

**Files:**
- Create: `src/app/[locale]/authoring/page.tsx`
- Modify: `src/components/{PersonaManager,TemplateBrowser,StyleTemplateManager}.tsx` (Tab-Integration, CRUD-Components)
- Delete: `src/app/[locale]/{personas,templates,style-templates}/page.tsx`
- Create: `src/app/[locale]/library/collections/[id]/page.tsx` (URL-Verschiebung)
- Modify: `src/app/[locale]/discover/collections/[id]/page.tsx` (301-Redirect)
- Modify: `src/app/[locale]/users/[id]/page.tsx` → `src/app/[locale]/profile/[id]/page.tsx` (rename+redirect)
- Modify: `src/components/AppShell.tsx` (final NAV_ITEMS = 8)

**Dependencies:** M003 done (AppShell + Discover/Analytics-Tabs stabil).

**Risk:** **Med** -- URL-Renamings + neue Hub-Page. Bookmarks-Risk. Auth-flow vermeintlich nicht beruehrt (gleiche Auth-Gates).

**Rough Size:** **M** -- 5-7 tasks (1 /authoring page, 3 Tab-Sub-Components extraction/cleanup, 2 URL-renames + 301-Redirects, 1 AppShell final-update).

---

### M005 -- Dead-Code Cleanup + Inventory Refresh

**Goal:** 4 dead components deleten, `docs/feature-inventory.md` von 19% drift auf <5% reduzieren.

**Scope:** Out-of-DECISIONS (cleanup-Pass, kein Architektur-Decision).

**Files:**
- Delete: `src/components/DashboardView.tsx` (11 commits, 0 consumers per T02)
- Delete: `src/components/HistoryView.tsx` (11 commits, replaced by `PlayHistoryView`)
- Delete: `src/components/WaveformPlayer.tsx` (replaced by `PlayerWaveform`)
- Delete OR re-wire: `src/components/SunoImportModal.tsx` (never wired -- decide M005)
- Modify: `docs/feature-inventory.md` (Refresh: 11 lib-files now in subdirs, /api/checkout actual path, 4 dead-components removed from "Built" claims, 50+ undocumented features added)
- Modify: `.ytstack/FEATURE-MAP.md` §5 (`lib/api-key-auth.ts` stale ref entfernen)

**Dependencies:** M002-M004 done (touchen LibraryView, GenerateForm, AppShell -- M005 sollte nicht parallel laufen).

**Risk:** **Low** -- Delete-only + Doc-Refresh.

**Rough Size:** **S** -- 2-3 tasks (1 delete-pass + 1 inventory-refresh + 1 FEATURE-MAP-fix).

---

### M006 -- SongDetailView Sibling-Refactor

**Goal:** SongDetailView (1527 LOC, 39 useState, 35 onClicks, 7 modals) auf gleiche Progressive-Disclosure-Pattern wie M002 Generate.

**Scope:** Out-of-DECISIONS (Engineering-Pass parallel zu Generate-Lerneffekt).

**Files:**
- Modify: `src/components/SongDetailView.tsx` (god-object, 57 commits, hot-file)
- Create: `src/components/song-detail/{ActionsMenu,CoverArtSection,LyricsSection,RelatedSection,VariationsTree}.tsx` (sub-components)
- 6 Modals → 6 BottomSheet-on-mobile / Modal-on-desktop sub-components

**Dependencies:** M002 done (Pattern bewahrt + Lerneffekt aus Generate).

**Risk:** **High** -- SongDetailView ist 1527 LOC, hot-file, primary Refine-Surface. Risk-vs-Benefit-Decision pre-M006: ist das wirklich noetig oder ist es nur Kosmetik?

**Rough Size:** **L** -- 7-10 tasks.

**Decision-Punkt M005 Ende:** vor M006 Start: ist die UX-Verbesserung durch M006 messbar/needed, oder ist M005 "good enough"? GO/NO-GO-Gate.

---

### M007 -- QueueContext-Split

**Goal:** 36-value QueueContext auf 3-4 kleinere Contexts splitten (PlaybackStateContext, QueueOpsContext, RadioContext, AudioElementContext).

**Scope:** Out-of-DECISIONS (Engineering-Pass, kein UX-Item).

**Files:**
- Modify: `src/components/QueueContext.tsx` (847 LOC, 31 commits)
- Modify: `src/components/queue/*.ts` (8 helpers)
- Modify: ALL consumers (LibraryView, SongDetailView, ExpandedPlayer, etc.) -- 17 reverse-imports von `useQueue()`

**Dependencies:** M002-M006 done (M002 hat `useQueue()` 8x destructured -- nicht stress-testen vor Refactor).

**Risk:** **High** -- Player-Race-Path (§7.1 Constraint), 17 Consumer-Files, breaking-change-by-design.

**Rough Size:** **L** -- 7-10 tasks.

**Decision-Punkt M006 Ende:** GO/NO-GO. M007 ist Engineering-Pass, nicht User-Facing-UX. Vielleicht skippen.

---

### M008+ -- Optional (post M007 retrospective)

| Candidate | Trigger |
|---|---|
| **Bottom-Nav** (re-eval D14) | Wenn Mobile-Drawer-UX nach M003+M004 immer noch friction-prone |
| **FormField Design-System Component** | Wenn M002 + M006 zeigen dass shared form-widget Mehrwert haette |
| **Inventory-Refresh als Paperclip-Sub-Issue** | BAU, nicht ytstack-Milestone |
| **SongCompareView Heimat-Aenderung** | Wenn /generate?tab=compare nicht greift |

---

## Decision Cross-Reference

| Decision | Goes into | Status |
|---|---|---|
| D1 FEATURE-MAP als Source-of-Truth | -- (meta-decision, M001-internal) | done |
| D2 /inspire bleibt eigene Page | Touched in M003 (Discover-Tabs erwaehnen, aber /inspire bleibt separat) | M003 referenziert |
| D3 /compare → /generate?tab=compare | M002 | sequenced |
| D4-D5 /discover-Cluster merge | M003 | sequenced |
| D6 /songs killen | M003 | sequenced |
| D7 /discover/collections URL-Fix | M004 | sequenced |
| D8 /users/[id] → /profile/[id] | M004 | sequenced |
| D9 Analytics-Cluster collapse | M003 | sequenced |
| D10 Generate-Tabs | M002 | sequenced |
| D11 Authoring-Hub | M002 (generate-side) + M004 (full hub) | split across two milestones |
| D12 Persona-Auswahl inline | M002 (preserved) | sequenced |
| D13 /library/[id] Primary=§6 Refine | M006 (formal acknowledged) | sequenced |
| D14 Mobile-Nav-Decision (Drawer, not Bottom-Nav) | M002+ (preserves AppShell Drawer; M008 re-eval) | sequenced |
| **D15 Naming-Drift (NEW)** | M002 Pre-Refactor | sequenced |
| **D16 Sequenz-Order (NEW)** | -- (meta) | this T03 |

**Coverage check: alle D2-D14 haben einen M002-M007 Home. Plus D15+D16 hier eingefuehrt.** ✓

---

## Sequence Rationale

Warum diese Reihenfolge?

1. **M002 zuerst** weil:
   - Plan ist fertig (S03-T01 Inventory + T02 Redesign).
   - Generate-Refactor freistehend -- keine Dependencies zu IA-Konsolidierung.
   - Lerneffekt fuer M006 (Sibling-Refactor SongDetailView).
   - Hot-File-Risk muss bewaeltigt werden bevor weitere Hot-Files (AppShell in M003) angefasst werden.

2. **M003 + M004 Phase 1/2 trennen** weil:
   - M003 ist Tab-Migration ohne URL-Renamings -- "safe" Refactor mit klaren Patterns.
   - M004 hat URL-Renamings (Bookmarks-Risk) + neuen /authoring Hub (echte neue Code-Surface).
   - Wenn M003 Probleme zeigt, M004 koennen wir verschieben/skippen ohne M002 oder M005 zu blockieren.

3. **M005 vor M006** weil:
   - M005 cleanup ist trivial (delete + doc-refresh). Schnelle Win zwischen den groesseren Milestones.
   - M005 reduziert kognitive Last fuer M006-Worker (4 weniger Components in `src/components`).

4. **M006 + M007 als GO/NO-GO** weil:
   - M006 SongDetailView ist High-Risk-Hot-File-Touch. Begruendung muss nach M002+M003 nochmal validiert werden.
   - M007 QueueContext-Split ist Engineering-Only, nicht User-Facing. Vielleicht skip.

5. **M008+ optional** -- echte Eval-Gate. Bottom-Nav (D14) ist explizit als M008 markiert um es nicht in M001 in eine Default-Entscheidung zu drueecken.

---

## Total Effort Estimate

| Milestone | Risk | Size | Approx Tasks |
|---|---|---|---|
| M002 Generate-Refactor | Med | L | 7-10 |
| M003 IA Phase 1 | Low | M | 5-7 |
| M004 IA Phase 2 | Med | M | 5-7 |
| M005 Cleanup | Low | S | 2-3 |
| M006 SongDetailView (GO/NO-GO) | High | L | 7-10 |
| M007 QueueContext-Split (GO/NO-GO) | High | L | 7-10 |
| **Sum if all GO** | -- | -- | **33-47 tasks** |
| **Sum if M006+M007 skipped** | -- | -- | **19-27 tasks** |

Realistischer Default (M002-M005 + retrospective): ~20-27 Tasks zu M008-Eval.

---

End of Follow-up Roadmap.
