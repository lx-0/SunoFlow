---
milestone: M001
slice: S03
task: T04
artifact: MIGRATION-STRATEGY
created: 2026-05-18T10:50:00Z
sources:
  - .ytstack/M001-FOLLOWUP-ROADMAP.md (M002-M007 sequence)
  - .ytstack/M001-IA-MAP.md §8 (Migration-Risiko-Skizze, vorlaeufige Empfehlung)
  - .ytstack/DECISIONS.md D2-D14 (was migriert wird)
---

# M001 Migration Strategy (M002+ Implementation)

Konkrete Strategie fuer User-facing Migration der M001-IA-Decisions. Drei Aspekte: **Feature-Flags** (Code-Migration), **301-Redirects** (URL-Migration), **Bookmark-Risk-Window** (wie lang Legacy-URLs leben).

---

## §1. Feature-Flag Strategy

### §1.1 Per-Milestone Flags

| Flag | Milestone | Decisions covered | Default | Cutover |
|---|---|---|---|---|
| `generate_v2` | M002 | D3, D10, D11(gen), D12, D15 | OFF | 2 Wochen soak → ON for all |
| `discover_tabs` | M003 | D4-D5 | OFF | 1 Woche soak → ON |
| `library_unified` | M003 | D6 (/songs killen) | OFF | Immediate (no rollback needed since /songs is feature-flagged out) |
| `analytics_unified` | M003 | D9 | OFF | 1 Woche soak → ON |
| `authoring_hub` | M004 | D11(full) | OFF | Hard cutover (new route, no opt-in needed) |
| `profile_renamed` | M004 | D8 | -- (URL only) | Immediate via redirect |
| `library_collections_url` | M004 | D7 | -- (URL only) | Immediate via redirect |

**Flag-Provider:** GrowthBook (siehe `lib/feature-gates.ts`). Bestehende `FeatureGate` Component-Pattern.

### §1.2 Rollback-Strategy

Jede Code-Milestone (M002, M003, M004) muss:

1. **Flag-Default = OFF** beim Deploy.
2. **Internal soak** 1-3 Tage (Operator + Power-User).
3. **5% rollout** -- check GlitchTip + PostHog metrics 1-3 Tage.
4. **50% rollout** -- check metrics another 1-3 Tage.
5. **100% rollout** -- ueber Wochenende, vollstaendig.
6. **Cleanup-PR** -- flag entfernen, dead-code Pfad loeschen (separater Cleanup-Milestone-Task).

### §1.3 Out-of-Flag Refactors

M005 Dead-Code Cleanup, M006/M007 Engineering-Pass -- **kein Feature-Flag**. M005 ist delete-only. M006/M007 sind Behavior-equivalent Refactors die durch Test-Coverage gehen, nicht durch Gradual-Rollout.

---

## §2. 301-Redirect Table

### §2.1 M003 Phase 1 Redirects (6 routes)

| Old route | New route | Method | Permanent? |
|---|---|---|---|
| `/[locale]/explore` | `/[locale]/discover?tab=explore` | 301 | yes |
| `/[locale]/radio` | `/[locale]/discover?tab=radio` | 301 | yes |
| `/[locale]/feed` | `/[locale]/discover?tab=feed` | 301 | yes |
| `/[locale]/songs` | `/[locale]/library?viewMode=gallery` | 301 | yes |
| `/[locale]/stats` | `/[locale]/analytics?tab=stats` | 301 | yes |
| `/[locale]/insights` | `/[locale]/analytics?tab=insights` | 301 | yes |
| `/[locale]/dashboard/analytics` | `/[locale]/analytics?tab=overview` | 301 | yes |

### §2.2 M004 Phase 2 Redirects (3 routes)

| Old route | New route | Method | Permanent? |
|---|---|---|---|
| `/[locale]/discover/collections/[id]` | `/[locale]/library/collections/[id]` | 301 | yes |
| `/[locale]/users/[id]` | `/[locale]/profile/[id]` | 301 | yes |
| `/[locale]/personas`, `/templates`, `/style-templates` | `/[locale]/authoring?tab=...` | 301 | yes |

### §2.3 M002 Redirects (2 routes)

| Old route | New route | Method | Permanent? |
|---|---|---|---|
| `/[locale]/mashup` | `/[locale]/generate?tab=mashup` | 301 | yes |
| `/[locale]/compare` | `/[locale]/generate?tab=compare` | 301 | yes |

### §2.4 Implementation Pattern

Next.js Middleware (`src/middleware.ts`) hat schon Locale-Routing -- Redirects als zusaetzlicher Handler in `middleware.ts`:

```ts
const REDIRECT_MAP: Record<string, string> = {
  '/explore': '/discover?tab=explore',
  '/radio': '/discover?tab=radio',
  // ... etc
};
```

Locale-preserving: `/de/explore` → `/de/discover?tab=explore`. Test-Cases per Locale + per Auth-State.

---

## §3. Bookmark-Risk Window

### §3.1 Wie lang bleiben Redirects?

**Default: permanent.** Alle 12 Redirects bleiben dauerhaft im Code (low maintenance cost vs. Bookmark-Schmerz).

**Begruendung:**
- SunoFlow hat geteilte Bookmarks (Mobile-PWA "Add to Home Screen" Shortcuts ggf. auf alte URLs).
- 301-Redirects sind 1-2 LOC pro Eintrag in middleware -- vernachlaessigbarer Maintenance-Aufwand.
- Suchmaschinen-SEO indexiert Redirects sauber (301 = permanent move).
- Externe Embeds (Embed-Widgets, geteilte URLs in Social-Media) sind nicht unter unserer Kontrolle.

**Ausnahme:** Wenn nach 12 Monaten ein Redirect 0 hits hat, dann Cleanup-Kandidat. Aber das ist M00X+ Sache.

### §3.2 Cleanup-Tracking

Tracking via PostHog: `redirect.from`, `redirect.to`, `redirect.user_authed`, Timestamp. Dashboard fuer "welche Legacy-Routes haben noch Traffic?". Nach 6 Monaten Review.

---

## §4. Migration Sequence Timeline

Indikativer Zeitplan (kein Hard-Commitment):

| Week | Milestone | Action |
|---|---|---|
| W1 | M002 | Naming-Drift fix + Tests stable + Branch live |
| W2 | M002 | Sub-Component-Extraktionen + Flag `generate_v2` deploy OFF |
| W3 | M002 | 5% rollout → 50% → 100% (verify per metrics) |
| W4 | M002 cleanup + M003 start | Flag entfernen, M003 Branch open |
| W5 | M003 | Discover/Analytics-Tab-Hubs, 5%→100% rollout |
| W6 | M003 cleanup + M004 start | Flag cleanup, /authoring branch |
| W7 | M004 | Phase 2 Tabs + Redirects |
| W8 | M004 cleanup + M005 | Cleanup + Dead-Code-Delete |
| W9+ | retrospective + M006 GO/NO-GO | Decide M006+M007 based on M002-M005 lessons |

**Realistisch:** 8-10 Wochen fuer M002-M005, sequential. Parallel-Arbeit nur innerhalb eines Milestones (separater Author pro Sub-Component).

---

## §5. Risk Mitigation per Milestone

| Milestone | Specific Risk | Mitigation |
|---|---|---|
| M002 | Hot-File-Touch (GenerateForm) | Feature-Flag + 5% rollout + GlitchTip dashboard pre-M003-start |
| M003 | AppShell NAV_ITEMS-Reduktion -- breaking nav patterns? | Mobile-test on real device (PWA install) before 100% rollout |
| M004 | URL-Renamings -- Bookmark-breakage | Redirects deployed BEFORE old routes removed |
| M005 | Delete-only -- usually safe | tsc + build before delete (catch any stale imports) |
| M006 | god-object SongDetailView | GO/NO-GO gate after M005 -- skip if M002-M005 retro shows enough win |
| M007 | Player race-paths | High-Risk-Engineering, prob skip in 2026 |

---

End of Migration Strategy.
