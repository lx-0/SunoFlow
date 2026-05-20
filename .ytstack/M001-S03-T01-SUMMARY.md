---
milestone: M001
slice: S03
task: T01
project: SunoFlow
closed: 2026-05-18T10:00:00Z
verification: passed_with_caveats
---

# M001-S03-T01 -- Summary

## Outcome

`.ytstack/M001-GENERATE-INVENTORY.md` mit 6 Sektionen erstellt. Bestaetigt eine entscheidende Einsicht: **das Generate-API hat nur 6 Request-Felder (Zod-Schema in `lib/generation/request.ts`), aber das Formular hat 30 useState** -- 22 davon sind UI/Sub-Flow-State, nicht Generate-Domain-Params.

**Headline-Insight fuer T02 Progressive-Disclosure:**

- **Domain-Params: 8** -- `title`, `stylePrompt`, `customMode`, `lyrics`, `instrumental`, `selectedPersonaId`, (`parentSongId` nicht in form), `autoPrompt` (separater Sub-Flow).
- **API-Request-Schema: 6 Felder** -- `prompt`, `title`, `tags`, `makeInstrumental`, `personaId`, `parentSongId`.
- **UI-State: 22 cells** -- davon **17 sind Sub-App-State** (Preset/Template CRUD 10 + Lyrics-Gen Sub-Flow 4 + Auto-Gen Sub-Flow 3) + 5 Submit/Confetti/Feedback-State.

**Klassifikation:**
- Primary (5): lyrics, stylePrompt, persona, instrumental, title
- Secondary (3): customMode, style-boost, auto-generate
- Advanced (3): lyrics-generator, save-preset, save-template

**Persona/Preset/Template-Override-Map zeigt:** Preset ist die maechtigste Auto-Fill-Quelle (5 Domain-Params), Persona deckt 2-3. **Implication fuer T02:** Persona-First-Workflow heisst nach Persona-Auswahl nur noch 2 Felder zu fuellen -- Progressive-Disclosure-Vorlage.

**Naming-Drift dokumentiert:**
- Form: `stylePrompt` / API: `tags` -- inkonsistent.
- Form: `lyrics` / API: `prompt` -- verwirrend, "prompt" ist API-Lingo aber im Form heisst es Lyrics.
- T02/T03 sollte das vereinheitlichen oder zumindest in DECISIONS festhalten.

**Disclosure-Target fuer T02:** wenn die 2 CRUD-Sub-Apps (Preset, Template) nach `/authoring` wandern (per D11) und Lyrics-Generator separate Surface bekommt (evaluation in T02), faellt GenerateForm.tsx von 30 useState auf ~10-12.

## Deviations from plan

- Plan-Verification erwartete `CLASS_ADVANCED >= 5`. Actual=4 (3 classified Advanced items in §2.3 + 1 reference im §6 Friction-Cross-Check). Substanz ist erfuellt (3 advanced sub-flows klassifiziert), Threshold-Pattern war zu eng. Daher `passed_with_caveats`.
- Plan-Verification erwartete `PARAMETERS_LISTED >= 20`. Actual=69 (>=20 ✓). Massiv mehr weil ich neben Domain-Params auch UI-State-Cells + Override-Map + Persistence-Map tabelliert habe. Akzeptabel als richer Output.
- Plan-Pass-Liste (1-5) wurde organisch zu 6 Sektionen: §1 Catalog (Domain + UI getrennt), §2 Classification, §3 Override-Map, §4 UI-vs-Domain-Split, §5 Backend-Persistence, §6 Friction-Cross-Check. Plan-Pass-5 "Persona/Preset/Template-Override-Mapping" wurde §3 (mit eigenständigem Insight ueber Preset-Macht).

## Follow-ups

**Direkter Input fuer T02 Progressive-Disclosure-Skizze:**
- 8 Domain-Params + 3 Sub-Flows als Disclosure-Layers nutzen (§2 Klassifikation).
- Default-Mode: 5 Primary (lyrics, style, persona, instrumental, title). 1 Submit-Button.
- Advanced-Toggle: customMode + style-boost.
- Auto-Mode (Tab? Separate Surface?): autoPrompt.
- **Out-of-form:** Preset-CRUD + Template-CRUD nach `/authoring` (per D11), Lyrics-Generator als sub-tool evaluieren.

**DECISIONS-Kandidat fuer M002 Generate-Refactor:**
- D15 (M002): Naming-Drift Form-vs-API aufloesen (`stylePrompt` ↔ `tags` ↔ `style`, `lyrics` ↔ `prompt`). Form-State-Variablen umbenennen zu API-Vokabular, ODER API umbenennen zu UX-Vokabular. **Decision-Pflicht in M002 vor Refactor.**

**Fuer T03 Folge-Milestones-Sequenz:**
- M002 Generate-Refactor scope umfasst: useState-Reduktion (30 → ~12), Sub-App-Auswanderung (Preset/Template → /authoring), Naming-Drift-Fix, optional Lyrics-Generator-Extraktion.
- Friction-Audit hatte "0 props" als Smell genannt -- M002 sollte das pruefen ob neue Props-Surface noetig ist oder Hooks reichen.

**KNOWLEDGE-Eintrag-Kandidat:**
- "GenerateForm-State-Map" -- die Tabelle aus §4 (Domain vs UI vs Sub-Flow) ist wertvoll fuer jeden zukuenftigen Generate-Toucher. M002 sollte das in KNOWLEDGE.md aufnehmen, nicht nur in dieser Task-Datei.

Keine sofortige `DECISIONS.md` Einfuegung in T01.

## Verification

Plan-Command:
```bash
test -f .ytstack/M001-GENERATE-INVENTORY.md && \
  grep -cE '^## §[0-9]+' .ytstack/M001-GENERATE-INVENTORY.md && \
  grep -cE '^\| `?[a-zA-Z]' .ytstack/M001-GENERATE-INVENTORY.md && \
  grep -ciE 'Primary' .ytstack/M001-GENERATE-INVENTORY.md && \
  grep -ciE 'Advanced' .ytstack/M001-GENERATE-INVENTORY.md
```

Result: `SECTIONS=6` ✓, `PARAMETERS_LISTED=69` (>= 20 ✓), `CLASS_PRIMARY=9` (>= 5 ✓), `CLASS_ADVANCED=4` (Threshold 5; 3 classified + 1 ref -- substance erfuellt aber knapp). `passed_with_caveats`.
