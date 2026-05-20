---
milestone: M001
slice: S01
task: T03
project: SunoFlow
closed: 2026-05-18T07:40:00Z
verification: passed
---

# M001-S01-T03 -- Summary

## Outcome

`.ytstack/M001-FEATURE-GAPS.md` existiert. Dreiseitiger Cross-Check zwischen `docs/feature-inventory.md` (manuell, 2026-04-22), `FEATURE-MAP.md §2` (Code-read, 2026-05-15), und T01/T02 Outputs. Quantifizierte Drift:

- **A. Inventory ↔ Code drift: 23 Eintraege** -- 11 lib-files in Subdirs migriert (`lib/auth.ts` → `lib/auth/`, etc.), 7 Files / Routen gone or moved (`lib/admin-auth.ts`, `lib/api-keys.ts`, `lib/api-key-auth.ts`, `lib/audio-cache.ts`, `lib/offline-cache.ts`, `lib/variants-family.ts`, `api/checkout` ist wirklich `api/billing/checkout`), 4 Models in Differenz (47 inventory vs 51 actual), 4 dead-but-"Built" components (`WaveformPlayer`, `SunoImportModal`, `DashboardView`, `HistoryView`), 5 Pfad-Ungenauigkeiten (public surfaces sind ohne `[locale]`).
- **B. Code → Inventory gap: 50+ items.** Top-level Pages (`/songs`, `/history`, `/stats`, `/admin/mirror`), 50+ unsourced API-Routen (39 unter `/api/songs/[id]/*` plus diverse Batch/Trending/Admin/Email), 19 Lib-Module / 0.2.0 Architektur-Seams (`lifecycle.ts`, `stale-pending-recovery.ts`, `realtime/`, `event-bus.ts`, etc.), 20+ Components (`BatchGeneratePanel`, `RemixModal`, `ReactionTimeline`, `StarPicker`, `analytics/*` Charts, `queue/*` Helpers).
- **C. FEATURE-MAP drift: minor.** Alle 10 Bounded Contexts halten. Nur 1-2 Stale-References (`lib/api-key-auth.ts` in §5, "15 files" vs. 17 actual in `lib/generation/`).
- **D. Cross-Map mismatches: 12 features.** Inventory + FEATURE-MAP gruppieren unterschiedlich (Playlists, Collections, Favorites, Smart playlists, Streaks, Cover-art-gen, Mashup, Style-boost, Onboarding etc.). S02 muss eine Heimat-Definition waehlen -- Empfehlung im Output: FEATURE-MAP §2 als Quelle, weil aktueller + code-anchored.

## Deviations from plan

- Plan sah 3 Sektionen (A/B/C) vor; Output hat 5 (A/B/C + D Cross-Map Mismatches + E Summary metrics). D ist organisch entstanden, weil zwei Heimat-Maps mit unterschiedlicher Gruppierung S02 verwirren wuerden ohne explizite Decision-Liste. E ist zaehl-Aggregate zur Vermessung der Drift-Groesse.
- Verification grep zaehlte `MISSING_LISTED=20` (>= 5 Threshold). Top-Sections 5 statt 3 -- passing.
- Plan-Pass 4 (Bounded-Context-Audit) ergab "FEATURE-MAP haelt" -- weniger spektakulaere Findings als bei A/B/D, weil FEATURE-MAP nur 3 Tage alt ist.

## Follow-ups

Bereits in FEATURE-GAPS Section A-D festgehalten, hier kondensiert als Aktion-Kandidaten:

**Fuer S02 (Journey + IA):**
- Heimat-Definition: FEATURE-MAP §2 als Source-of-Truth (10 Contexts), nicht Inventory. **Decision-Entry fuer DECISIONS.md sinnvoll.**
- 12 Cross-Map-Mismatches mit klarer Zuordnung in USER-JOURNEY.md / IA-MAP.md aufloesen.
- 50+ "code-but-undocumented" Features muessen alle eine Journey-Station bekommen (Coverage-Check-Kriterium).
- 4 dead-but-"Built" Components: S02 entscheidet `delete | re-wire | leave-alone`.

**Fuer post-M001 (nicht in S01-S03):**
- `docs/feature-inventory.md` refresh -- 23 Drift-Eintraege addieren, 50+ neue Features inventarisieren. **Sub-Issue auf Paperclip SUNAA empfehlenswert** (BAU, nicht ytstack-Milestone).
- 5 falsche Pfade in Inventory (Locale-prefix bei public surfaces) korrigieren.

**Fuer FEATURE-MAP.md:**
- `lib/api-key-auth.ts` Reference in §5 ist stale -- streichen.
- "15 files" in §3 auf "17 files" updaten.
- Sentry → GlitchTip Switch in §5 erwaehnen.

Keine `DECISIONS.md` oder `KNOWLEDGE.md` Entries faellig in dieser Task -- die kommen alle aus S02 wenn die Heimat-Entscheidungen getroffen sind.

## Verification

Plan-Command:
```bash
test -f .ytstack/M001-FEATURE-GAPS.md && \
  echo "MISSING_LISTED=$(grep -cE '^- ' .ytstack/M001-FEATURE-GAPS.md)" && \
  awk 'BEGIN{c=0} /^## [A-Z]\./ {c++} END {print "TOP_SECTIONS="c}' .ytstack/M001-FEATURE-GAPS.md
```

Result: `MISSING_LISTED=20` (>= 5 ✓), `TOP_SECTIONS=5` (Plan asked for 3, output has 5 -- A/B/C plus added D/E ✓), `SUBSECTIONS=9`.
