---
milestone: M001
slice: S02
task: T04
artifact: IA-MAP
created: 2026-05-18T09:20:00Z
sources:
  - .ytstack/USER-JOURNEY.md §1 (Persona + Primary Loop)
  - .ytstack/USER-JOURNEY.md §9.5 (12 Multi-Home-Decisions)
  - .ytstack/M001-ROUTE-CATALOG.md (25 top-level + 56 pages)
  - .ytstack/M001-COMPONENT-MAP.md (god-objects)
  - .ytstack/M001-MOBILE-AUDIT.md (17 nav items on mobile)
  - src/components/AppShell.tsx:56-72 (NAV_ITEMS constant)
totals:
  before_nav_items: 17
  before_top_level_routes: 25
  after_nav_items: 8
  after_top_level_routes: 12
---

# M001 IA Consolidation Map

Von 17 AppShell-Nav-Items + 25 erreichbaren Top-Level-Routen heute zu **8 Primary-Nav-Items + 12 Top-Level-Routen** ohne Feature-Verlust. Alle 12 Multi-Home-Decisions aus USER-JOURNEY §9.5 sind hier als Mapping-Tabelle aufgeloest und in DECISIONS.md formalisiert.

---

## §1. Vorher (heute)

`src/components/AppShell.tsx:56-72` -- 17 Items in `NAV_ITEMS`:

```
AppShell sidebar / drawer (today)
┌─────────────────────────────────┐
│ 1.  Home          /             │
│ 2.  Library       /library      │
│ 3.  Inspire       /inspire      │
│ 4.  Generate      /generate     │
│ 5.  Templates     /templates    │
│ 6.  Personas      /personas     │
│ 7.  Mashup        /mashup       │
│ 8.  Feed          /feed         │
│ 9.  Radio         /radio        │
│ 10. Explore       /explore      │
│ 11. Discover      /discover     │
│ 12. Playlists     /playlists    │
│ 13. Favorites     /favorites    │
│ 14. History       /history      │
│ 15. Generations   /generations  │
│ 16. Analytics     /analytics    │
│ 17. Stats         /stats        │
└─────────────────────────────────┘

Plus header / dropdown:
  /pricing /settings /settings/billing /admin /profile

Plus reachable but not in nav:
  /songs /insights /dashboard/analytics /compare /style-templates
  /discover/collections/[id] /users/[id]

Plus public surfaces (no internal nav):
  /s/[slug] /p/[slug] /u/[username] /embed/[songId] /embed/playlist/[slug]
```

**Top-level user-facing routes reachable from logged-in state: 25** (17 nav + 8 secondary).

---

## §2. Nachher (Vorschlag)

```
AppShell primary nav (proposed) -- 8 items
┌─────────────────────────────────────────────────────┐
│ 1. Home          /                                  │
│ 2. Generate      /generate  (+ tabs +/inspire link) │
│ 3. Library       /library   (+ playlists, fav, hist)│
│ 4. Discover      /discover  (+ tabs incl /radio)    │
│ 5. Authoring     /authoring (+ tabs Personas/Tmpl)  │
│ 6. Analytics     /analytics (+ tabs Stats/Insights) │
│ 7. Notifications /notifications                     │
│ 8. Profile       /profile   (+ dropdown for /settings, /pricing) │
└─────────────────────────────────────────────────────┘

Header / Profile-dropdown (unchanged or reduced):
  /pricing /settings /settings/billing /admin /api-docs (dev-only)

Sub-routes (still reachable, but not top-level):
  /generate?tab=simple|advanced|mashup|compare
  /generations (history of generations -- sub-route of /generate)
  /library/[id]  (Refine surface)
  /library/collections/[id]  (URL-fixed from /discover/collections)
  /playlists  /playlists/[id]  /playlists/invite/[token]
  /favorites  (sub-route of /library, optional)
  /history    (sub-route of /library, optional)
  /discover?tab=top|explore|radio|feed   (4 inner tabs replace 4 nav items)
  /inspire    (separate -- prompt-seed feed, dual-citizen)
  /authoring?tab=personas|templates|styles
  /analytics?tab=stats|insights|songs    (4 inner tabs replace 4 nav items)
  /profile/[id]  (in-app profile, renamed from /users/[id])

Public surfaces (unchanged -- permalinks, not internal nav):
  /s/[slug] /p/[slug] /u/[username] /embed/*

Admin (unchanged -- separate sub-app):
  /admin/*  (12 pages, AdminShell layout)
```

**Top-level routes: 12 (was 25)**. **Nav items: 8 (was 17)**. All features preserved as sub-routes, tabs, or moved to context-appropriate parents.

---

## §3. Mapping table -- alte Route(n) → neue Heimat

Eine Zeile pro Konsolidierung. Alle 12 Multi-Home-Decisions aus USER-JOURNEY §9.5 + zusaetzliche Konsolidierungen.

| # | Alte Route(n) | Neue Heimat | Decision-ID | Begruendung |
|---|---|---|---|---|
| 1 | `/inspire` | `/inspire` bleibt + Link aus `/generate` (sub-Tab oder side-panel) | D2 | Dual-citizen, Primary=Generate-Loop-Feeder, Secondary=Discover. Bleibt eigene Page weil prompt-seed-feed eigene UX hat. |
| 2 | `/compare` | `/generate?tab=compare` | D3 | A/B-Compare ist Generate-Subform. Eigene Route entfaellt. |
| 3 | `/discover` + `/explore` | `/discover?tab=top` + `/discover?tab=explore` (gleicher Component, jetzt explizit Tabs) | D4 | DiscoverView wird heute schon von beiden Routes geteilt mit verschiedenen Filter-Args -- niedrigst-haengende Frucht. |
| 4 | `/radio` | `/discover?tab=radio` | D5 | Radio ist Discover-by-Mood. radioState lebt sowieso in QueueContext (cross-cut zu §4 Listen). |
| 5 | `/feed` | `/discover?tab=feed` | D5 | Activity feed ist eine Discover-View. |
| 6 | `/songs` | gone (kill route, merge in `/library`) | D6 | `SongsGalleryView` wird `LibraryView` view-mode (`viewMode=gallery`). Zwei Library-Surfaces ohne Trennung waren Drift. |
| 7 | `/discover/collections/[id]` | `/library/collections/[id]` | D7 | Collections sind Library-Domain (FEATURE-MAP §2). URL-Fix, kein Feature-Loss. |
| 8 | `/users/[id]` | `/profile/[id]` | D8 | Renamed fuer Klarheit. `/u/[username]` bleibt public-permalink, getrennte Heimat. |
| 9 | `/analytics` | `/analytics?tab=overview` | D9 | Primary Analytics-Page, andere kollabieren rein. |
| 10 | `/stats` | `/analytics?tab=stats` | D9 | Stats-Subview. |
| 11 | `/insights` | `/analytics?tab=insights` | D9 | Insights-Subview. |
| 12 | `/dashboard/analytics` | `/analytics?tab=overview` (merge mit /analytics) | D9 | Doppel-Tracking aufloesen. `/dashboard/analytics/[songId]` bleibt als per-song-Drilldown. |
| 13 | `/generate` | `/generate?tab=simple` (default) | D10 | Hauptsurface, Tab-Hub. |
| 14 | `/mashup` | `/generate?tab=mashup` | D10 | Generate-Subform. |
| 15 | `/generations` | `/generate?view=history` ODER `/generate/history` (sub-route) | D10 | History-Liste ist eng gekoppelt -- als Sub-View oder Sub-Route, nicht Top-Level. |
| 16 | `/personas` | `/authoring?tab=personas` | D11 | Eines von drei Authoring-Werkzeugen. |
| 17 | `/templates` | `/authoring?tab=prompts` | D11 | Prompt-Templates. |
| 18 | `/style-templates` | `/authoring?tab=styles` | D11 | Style-Templates. |
| 19 | Persona-Auswahl inline in `GenerateForm` | bleibt inline | D12 | Management ist `/authoring`, Auswahl ist Generate-Schritt. Trennung lockt zwei Konzepte ein. |
| 20 | `/library/[id]` | `/library/[id]` bleibt | D13 | Page Primary=§6 Refine. Cross-Cut zu Listen via in-page Waveform; Cross-Cut zu Organize via Back-Nav. Multi-Home akzeptiert; URL unveraendert. |
| 21 | `/favorites` | `/library?filter=favorites` (Filter-Variant) ODER `/favorites` bleibt | D6-extension | Optional: keep `/favorites` als Convenience-URL, aber raus aus Top-Nav. Sub-link unter Library. |
| 22 | `/history` | `/library?filter=history` ODER `/history` bleibt | D6-extension | Same: bleibt als URL, raus aus Top-Nav. |
| 23 | `/playlists` `/playlists/[id]` | bleiben als Top-Level-Sub-Routen unter Library-Nav | -- | Playlists sind echte Sub-Domain mit eigener UX. Keine URL-Aenderung, aber kein eigener Nav-Slot mehr. |
| 24 | `/api-docs` | rein in Profile-Dropdown (dev-section) | D14 | Power-User-Tool, kein Loop-Heimat. |
| 25 | `/pricing` `/settings` `/settings/billing` `/admin` `/profile` | Header / Profile-Dropdown (unveraendert) | -- | Cross-cut + Admin -- separate Verticals. |

**Konsolidierungs-Effekt:**
- **17 Nav-Items → 8** (52% Reduktion)
- **25 Top-Level-Routen → 12** (52% Reduktion)
- **0 Features verloren** -- jedes Feature hat neue Heimat (Tab, Sub-Route, Filter-Variant, Dropdown)

---

## §4. Begruendung pro Konsolidierungs-Block

### §4.1 Discover-Block (5 → 1 Nav-Item, 4 Routes → 4 Tabs)

**Konsolidiert:** `/discover` `/explore` `/radio` `/feed` (4 Top-Nav-Items).
**Wird:** `/discover` mit Tabs: Top / Explore / Radio / Feed.

**Begruendung:**
- `/discover` und `/explore` teilen heute schon den Component `DiscoverView` (USER-JOURNEY §9.5 #3) -- nur Filter-Arg unterscheidet.
- `/radio` ist functional Mood-Radio = "Discover-by-Mood".
- `/feed` ist Activity-Feed = "Discover-by-Social-Graph".
- Persona-Check (USER-JOURNEY §1): "Suno Power-User" sucht prompt-inspiration und neue Stuecke, nicht 4 separate Surfaces.
- Mobile-Check (MOBILE-AUDIT): 4 von 17 Nav-Slots fuer Discovery-Cluster ist 24% der mobilen Nav -- zu viel fuer Sekundaer-Loop.

**Risk:** Tab-Component fuer 4 Modes ist mehr State in `/discover` Page. Aber: alle 4 sind heute schon Card-Grids; Tab-Switch ist UI-Pattern + URL-Param, kein React-State-Mega-Refactor.

### §4.2 Analytics-Block (4 → 1 Nav-Item)

**Konsolidiert:** `/analytics` `/stats` `/insights` `/dashboard/analytics` (3 in Nav + 1 secondary).
**Wird:** `/analytics` mit Tabs: Overview / Stats / Insights / Songs.

**Begruendung:**
- COMPONENT-MAP zeigt 5 chart-files in `analytics/*` (AdminAnalyticsCharts + InsightsCharts + PlayAnalyticsCharts + StatsCharts + UserAnalyticsCharts) -- mirror 1:1 die 5 Routes. Eine Page mit 4 Tabs + 1 admin-only kollabiert das.
- Persona-Check: User will EIN Mental-Modell "see my data", nicht 4 Pages mit verschiedenen Views auf dasselbe Domain-Modell.
- `/admin/analytics` bleibt separat (Admin-Sub-App, out-of-IA-scope).
- `/dashboard/analytics/[songId]` bleibt als Per-Song-Drilldown (URL unveraendert).

**Risk:** Bei vielen Charts pro Tab koennten Pages langsam laden. Mitigation: lazy-load chart-modules per Tab.

### §4.3 Generate-Cluster (5 → 1 Nav-Item)

**Konsolidiert:** `/generate` `/mashup` `/compare` `/generations` `/inspire` (4 in Nav + `/generate` selbst).
**Wird:** `/generate` mit Tabs (Simple/Advanced/Mashup/Compare) + History als Sub-View + `/inspire` bleibt separate Page.

**Begruendung:**
- `/mashup`, `/compare` sind Generate-Mode-Varianten -- eigene Tabs sinnvoll, eigene Top-Level-Route uebertrieben.
- `/generations` ist History-View -- als Sub-View in `/generate` (oder `/generate/history`) konsolidiert.
- `/inspire` ist dual-citizen Discover+Generate (USER-JOURNEY §9.5 #1) -- bleibt eigene Page mit Link aus `/generate` UND Tab in `/discover` (User-Decision-Point).
- Persona-Check: Generate ist Step 1 des Primary-Loops -- ein Mental-Modell, mehrere Modi (Tabs).
- FRICTION-AUDIT: GenerateForm hat schon 30 useState -- 4 Tabs eroeffnen Disclosure-Pattern statt mehr State im selben Modul.

**Risk:** Tabs in `/generate` koennen verwirren wenn URLs nicht stabil sind. Mitigation: `?tab=` Query-Param mit history-push.

### §4.4 Authoring-Cluster (3 → 1 Nav-Item)

**Konsolidiert:** `/personas` `/templates` `/style-templates` (alle in Nav heute).
**Wird:** `/authoring` mit Tabs: Personas / Prompt-Templates / Style-Templates.

**Begruendung:**
- Alle drei sind FEATURE-MAP §6 "Authoring helpers" -- gleicher Bounded Context.
- COMPONENT-MAP zeigt 3 parallele Manager-Components (`PersonaManager` 5 commits, `StyleTemplateManager` 2, `TemplateBrowser` 4) -- identische CRUD-Patterns.
- Persona-Check: User crafted Prompts / Personas / Styles als zusammenhaengenden Workflow, nicht als 3 separate Werkzeuge.
- Persona-Auswahl im GenerateForm bleibt inline (Decision D12) -- nur Management wandert nach `/authoring`.

**Risk:** User die nur Personas nutzen muessen 1-Klick mehr (Tab waehlen). Mitigation: `/authoring` default-Tab = Personas (most-used).

### §4.5 Library-Cluster (4-9 → 1 Nav-Item)

**Konsolidiert:** `/library` `/songs` `/favorites` `/history` `/playlists` `/playlists/*` `/discover/collections/[id]`
**Wird:** `/library` als Hub mit Sub-Routes + Filter-Varianten.

**Begruendung:**
- `/songs` hat keine klare Trennung zu `/library` (USER-JOURNEY §9.5 #5) -- `SongsGalleryView` wird `LibraryView`-View-Mode.
- `/favorites` ist `LibraryView` mit `filter=favorites` -- kann eigene URL behalten oder Filter-Param werden. **Entscheidung:** Convenience-URL bleibt, aber raus aus Top-Nav.
- `/history` ist `PlayHistoryView` -- eigene Page, aber Sub-Link unter Library statt Top-Nav.
- `/playlists` bleiben eigene Sub-Pages -- echte Sub-Domain, aber unter Library-Hub.
- `/discover/collections/[id]` wird zu `/library/collections/[id]` (D7, URL-Fix).

**Risk:** Wechsel zu mehr-tier-Nav koennte mobile-friction erzeugen. Mitigation: Library-Hub-Page hat alle Sub-Sections als grosse Cards/Sections sichtbar -- 1-Tap-Drilldown.

---

## §5. Mobile-Nav-Decision

**Frage:** Soll Mobile-Drawer dieselben 8 Top-Items zeigen wie Desktop, oder reduzierte Bottom-Nav?

**Option A: Einheitlicher Drawer (Status quo, reduziert)**

```
Mobile drawer:
  Home | Generate | Library | Discover | Authoring | Analytics | Notifications | Profile
                                                                                   (8 items)
```

Begruendung: AppShell-Code hat heute schon Drawer-Pattern mit `useFocusTrap` + `useSwipeToDismiss`. 8 Items + 5-7 Header/Footer-Items = 13-15 Drawer-Items -- handlich.

**Option B: Bottom-Nav mit 5 Items**

```
Mobile bottom-nav:
  [Home] [Generate] [Library] [Discover] [Profile/More]
```

Begruendung: Standard-Mobile-Pattern. Top-5-Loops sichtbar, Rest hinter Hamburger/More.

Risk: Bottom-Nav ist net-new component, AppShell aendern (61 commits Hot-File), `min-h-[44px]` Touch-Targets pruefen, GlobalPlayer-Slot kollidiert mit Bottom-Nav (Player ist auch bottom-positioned).

**Empfehlung:** **Option A** (einheitlicher Drawer) fuer M002-M003 Umbau. Option B als M004+ optional, wenn die ersten Konsolidierungen messbar UX verbessern und Bottom-Nav-Risiko gerechtfertigt ist.

**Begruendung:** MOBILE-AUDIT zeigt 17-Item-Drawer geht heute schon -- 8-Item-Drawer ist klare Verbesserung ohne neues Risiko. Bottom-Nav ist Architektur-Aenderung mit GlobalPlayer-Konflikt; lohnt erst wenn Drawer-Variante nicht reicht.

---

## §6. Out-of-Scope (bleibt unveraendert)

| Item | Heimat | Begruendung |
|---|---|---|
| `/admin/*` (12 pages) | AdminShell sub-app | Operator-only, eigene Nav (`AdminShell`), nicht user-facing |
| `/s/[slug]` `/p/[slug]` `/u/[username]` `/embed/*` (5 public) | Permalinks | Public-share-URLs, no internal nav |
| `/pricing` | Header (logged-out) + UpgradeModal trigger | Cross-cut, nicht Loop-Heimat |
| `/settings` `/settings/billing` `/profile` | Profile-Dropdown | Account-Management |
| `/api-docs` | Profile-Dropdown → Dev-Tools | Power-User dev-tool, kein Loop |
| `/api/test/login` `/api/agent-skill` | Out-of-Journey | Dev/Integration-Surface |

---

## §7. Locked-in Constraints (final, T05)

Was Redesign / Konsolidierung in M002+ **nicht** brechen darf. Jede Aenderung muss diese Liste konsultieren BEVOR Code geaendert wird. Quellen: alle S01-Outputs + USER-JOURNEY §1 + Code-Paths.

### §7.1 Architecture Constraints (5)

1. **GlobalPlayer-Slot ist persistent + bottom.** AppShell rendert es als persistente Bottom-Komponente (commit `7511d20` race-guards basieren darauf). **Darf nicht durch Bottom-Nav verdraengt werden.** Tab-IDs / Page-Wechsel duerfen Player nicht remounten.
   *Source:* `src/components/AppShell.tsx` (dynamic-imports GlobalPlayer), `M001-MOBILE-AUDIT.md` §B.4.

2. **Race-Guards in GlobalPlayer (7 useRef) bleiben unangetastet.** Load-generation token (commit `7511d20`), peaks-worker boundary (commit `45023a6`), singleton generation tracker (commit `868765f`). Audio-Flow ist post-incident hardened.
   *Source:* `M001-FRICTION-AUDIT.md` §5, `src/components/GlobalPlayer.tsx`.

3. **AUDIO_CACHE survives deploys.** SW konfiguriert `sunoflow-audio-v2` stable across builds (user-saved offline songs). Andere caches sind deploy-coupled.
   *Source:* `public/sw.js:AUDIO_CACHE`, `M001-MOBILE-AUDIT.md` §C.2.

4. **Per-deploy cache-busting (BUILD_ID).** ServiceWorkerRegistrar registriert `/sw.js?v=<BUILD_ID>`. Deploy-Constraint: BUILD_ID muss via CI → Railway → Docker ARG fliessen.
   *Source:* `src/components/ServiceWorkerRegistrar.tsx`, `M001-MOBILE-AUDIT.md` §C.3, project memory.

5. **Generation pipeline integrity (4 canonical files).** `/api/generate/route.ts` (42 commits) → `lib/sunoapi/*` (circuit-breaker + retries) → `lib/songs/lifecycle.ts` (0.2.0 seam) → `/api/webhooks/suno/route.ts`. IA-Aenderungen duerfen dieses 4-Datei-Glied nicht durchschneiden.
   *Source:* `FEATURE-MAP.md` §3, `M001-FEATURE-GAPS.md` §B.2, `DECISIONS.md` 2026-05-16 song-lifecycle seam.

### §7.2 URL / Routing Constraints (4)

6. **Public-URLs sind Permalinks, unveraendert.** `/s/[slug]`, `/p/[slug]`, `/u/[username]`, `/embed/[songId]`, `/embed/playlist/[slug]`. Externe Konsumenten (geteilte Bookmarks, Embeds in fremden Seiten, RSS-Subscribers). **Keine URL-Aenderung in M002+.**
   *Source:* `M001-ROUTE-CATALOG.md` §B.

7. **`/admin/*` Sub-App ausgeklammert.** 12 admin pages + 22 admin-API routes haben separate IA (`AdminShell` layout). M002+ Konsolidierung beruehrt NICHT `/admin/*`.
   *Source:* `M001-ROUTE-CATALOG.md` §A.G, `M001-IA-MAP.md` §6.

8. **`/api/v1/*` programmatic-only.** API-Key-auth, externe Konsumenten via OpenAPI-Schema. Nicht Teil interner Nav, keine Konsolidierung.
   *Source:* `M001-ROUTE-CATALOG.md` §C.

9. **Auth-Flows bleiben separate Routes.** `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`. NICHT in Tab-Hubs verstecken -- diese URLs sind in Email-Templates und External-Redirects gehardcoded.
   *Source:* USER-JOURNEY §2 Onboarding, `lib/auth/*`.

### §7.3 Responsiveness Constraints (4)

10. **`md:` (768px) ist DER Desktop-Pivot.** 38% aller responsive switches feuern hier. **Kein neuer Breakpoint** -- ein neuer mid-tier-breakpoint wuerde ~50 files toucher.
    *Source:* `M001-MOBILE-AUDIT.md` §A.1 (296 breakpoint usages catalogued).

11. **Mobile-First Default bleibt.** 51% sm: + 38% md: vs. 11% lg+ -- die App entscheidet mobile-defaults, Desktop ist additive Layer. IA-Aenderungen muessen thumb-reach-friendly bleiben.
    *Source:* `M001-MOBILE-AUDIT.md` §A.1.

12. **44px Touch-Target Minimum.** AppShell-nav-items haben `min-h-[44px]` (AppShell:294). Apple HIG-grade. Neue Nav-Items muessen das respektieren.
    *Source:* `M001-MOBILE-AUDIT.md` §B.4, `src/components/AppShell.tsx:294`.

13. **`pointer: coarse` runtime check** statt viewport-only. 2 surfaces (LibraryView:335, library/swipable-song-row:52) entscheiden Touch-vs-Click anhand pointer-capability, nicht width. Pattern erhalten.
    *Source:* `M001-MOBILE-AUDIT.md` §A.3.

### §7.4 PWA Constraints (2)

14. **Standalone PWA-Display.** `public/manifest.json` `"display": "standalone"`. Aenderung wuerde "Add to Home Screen"-Verhalten brechen.
    *Source:* `public/manifest.json`, `M001-MOBILE-AUDIT.md` §C.1.

15. **Audio-Aware Auto-Reload.** ServiceWorkerRegistrar's reload-prompt wartet wenn `isAudioPlaying()` (mediaSession-state oder `<audio>`-element). Mobile-PWA-Constraint, **darf nicht durch IA-Aenderungen umgangen werden** wenn neue Pages eigenes Audio-Element bringen.
    *Source:* `src/components/ServiceWorkerRegistrar.tsx`, `M001-MOBILE-AUDIT.md` §C.3.

### §7.5 Persona Constraints (2)

16. **Single-tenant Model.** Pro User eigene Suno+OpenAI-Keys, eigene Credits, eigene Library. **Kein Multi-User-Catalog**, kein Shared-Library-Pattern. Onboarding (§2 Journey) bleibt 1:1.
    *Source:* USER-JOURNEY §1 Persona.

17. **Mobile-Power-User Persona.** Generation-Loop-zentral, thumb-reach-priorisiert, on-the-go-Workflow. **Kein Desktop-First-Redesign-Bias**, kein Power-User-Power-Bench-Pattern (max. info-density auf Desktop-Kosten von mobile-Klarheit).
    *Source:* USER-JOURNEY §1 Persona + Primary Loop.

### §7.6 god-object Blast-Radius Warnings (1)

18. **6 god-objects respektieren.** LibraryView (71 commits), AppShell (61), SongDetailView (57), GenerateForm (44), GlobalPlayer (40), QueueContext (31). **Splits oder Restructure sind eigene Engineering-Milestones, nicht "Nav-Konsolidierungs-Side-Effekte"**. IA-MAP §3 Mapping-Tabelle vermeidet bewusst diese Files anzufassen -- alle 25 Konsolidierungs-Rows sind Page-File-Aenderungen oder Route-Configs, nicht god-object-Refactors.
    *Source:* `M001-FRICTION-AUDIT.md` §0 + §7.4, `FEATURE-MAP.md` §3.

### §7.7 Out-of-Scope Reminder (4)

19. **Admin Sub-App** (12 pages, 22 admin-API-routes) -- separate Vertical, kein Touch in M001/M002/M003.
20. **`/api/v1/*`** -- programmatic API, eigener Konsumenten-Layer.
21. **Public surfaces** (`/s/`, `/p/`, `/u/`, `/embed/*`) -- Permalinks, keine internal-IA.
22. **Cross-Cuts** (`/pricing`, `/settings`, `/settings/billing`, `/profile`, `/api-docs`) -- Header/Dropdown items, keine primary loop home.

### §7.8 Constraint Verification

Vor jedem M002+ IA-Refactor-PR muss durch diese Liste durchgegangen werden. Empfohlene Form: PR-Description hat Checkbox-Liste:

```
- [ ] §7.1 Architecture: GlobalPlayer not remounted, race-guards intact, AUDIO_CACHE preserved, BUILD_ID still flows, generation pipeline intact
- [ ] §7.2 URL/Routing: no public-URL change, /admin untouched, /api/v1 untouched, auth-routes unchanged
- [ ] §7.3 Responsiveness: no new breakpoint, mobile-first preserved, 44px touch-targets, pointer:coarse pattern preserved
- [ ] §7.4 PWA: manifest standalone, audio-aware auto-reload preserved
- [ ] §7.5 Persona: single-tenant, mobile-power-user lens
- [ ] §7.6 god-objects: refactor scope justified or hot-files untouched
- [ ] §7.7 Out-of-Scope: admin / api/v1 / public / cross-cuts untouched
```

22 Constraints total. Verfeinerung post-M001 wenn Lerneffekte aus M002 kommen.

---

---

## §8. Migration-Risiko-Skizze (Details in S03-T04)

Drei mögliche Migrations-Strategien:

| Strategie | Pros | Cons |
|---|---|---|
| **A. Feature-Flags pro neuer Route** | Granulare Rollouts, Tests via GrowthBook/PostHog-Feature-Flag | Mehr Flags-Komplexitaet, doppeltes Code-Maintenance |
| **B. Parallel-Routes mit Redirect-Tabelle** | Alte URLs funktionieren weiter (301), keine Broken-Links | Zwei Routen-Sets, Bookmarks user-friendly |
| **C. Hard-Cutover mit Hidden-Legacy-Pfade** | Sauberer Code-Base, einfacher zu reasonen | Bookmarks brechen, SEO-Risk fuer indexed-URLs |

**Empfehlung (vorlaeufig, S03 final):** **B (Parallel-Routes mit Redirect)** fuer User-facing Routen, **A (Feature-Flag)** fuer den Generate-Redesign in S03+ (weil das eine grosse interne Aenderung ist).

S03-T04 entscheidet final + erstellt Migration-Strategie-Detail-File.

---

End of IA Map.
