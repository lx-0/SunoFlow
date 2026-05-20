---
milestone: M001
slice: S03
task: T01
artifact: GENERATE-INVENTORY
created: 2026-05-18T09:55:00Z
sources:
  - src/components/GenerateForm.tsx (1421 LOC, 30 useState catalogued)
  - src/components/generate-form/types.ts (TS shapes)
  - src/components/generate-form/api.ts (backend-call helpers)
  - src/components/generate-form/useGenerateFormData.ts (data hook)
  - src/lib/generation/params.ts (Zod constants + sanitization)
  - src/lib/generation/request.ts (API request schema)
  - .ytstack/M001-FRICTION-AUDIT.md §1 (cross-ref)
totals:
  useState_total: 30
  ui_state_cells: 22
  domain_params_in_form: 8
  api_request_fields: 6
  subflows_in_form: 3
---

# M001 Generate Surface Parameter Inventory

Bestaetigt eine ueberraschende Wahrheit: das Generate-API hat **nur 6 Request-Felder**, aber das Formular hat **30 useState** -- die Diskrepanz erklaert das "ueberladen"-Gefuehl. **22 von 30 useState sind UI-State + Sub-Flow-State, nicht Generate-Domain-Params.** Das Formular ist drei verschiedene Sub-Flows + Persona/Preset/Template-Management in einem Modul.

---

## §1. Parameter Catalog

### §1.1 Domain Params (form-state that maps to API)

8 cells -- alles was beim Submit ans Backend wandert:

| # | Form state | API field | Type | Default | Required | Persona-fillable | Source |
|---|---|---|---|---|---|---|---|
| 1 | `title` | `title` | string | URL param `?title=` or `""` | ❌ optional | ✓ via preset/persona | `GenerateForm:52` |
| 2 | `stylePrompt` | `tags` | string | URL param `?tags=` or `""` | ❌ optional | ✓ via persona.style + preset.stylePrompt | `GenerateForm:53`. Stored as `tags` in API, called "style" everywhere else. **Naming drift.** |
| 3 | `customMode` | `(mode toggle)` | bool | `Boolean(prompt && !tags)` | -- | -- | `GenerateForm:54`. Controls whether lyrics are user-supplied or persona-generated. |
| 4 | `lyrics` | `prompt` (when customMode) | string | URL param `?prompt=` or `""` | ✓ if customMode | -- (user types lyrics) | `GenerateForm:55`. **Confusing:** `lyrics` in form, `prompt` in API. |
| 5 | `instrumental` | `makeInstrumental` | bool | URL param `?instrumental=1` | ❌ optional | ✓ via preset.isInstrumental | `GenerateForm:56` |
| 6 | `selectedPersonaId` | `personaId` | string | `""` | ❌ optional | -- (this IS the persona-pick) | `GenerateForm:75` |
| 7 | (`parentSongId`) | `parentSongId` | string | not in form | ❌ optional | -- | Only set when extending existing song; not user-facing param. |
| 8 | `autoPrompt` | (separate sub-flow) | string | URL param `?autoprompt=` | ✓ for auto-mode | -- | `GenerateForm:106`. Goes to `/api/generate/auto`, not `/api/generate`. |

**API-Request-Schema** (`src/lib/generation/request.ts`):

```ts
generateSongRequestSchema = z.object({
  prompt: string (1-3000),
  title?: string (≤200),
  tags?: string (≤500),
  makeInstrumental?: boolean,
  personaId?: string,
  parentSongId?: string,
})
```

**Nur 6 API-Felder. Plus 1 separater Sub-Flow (`auto-generate`).**

### §1.2 UI State (not params, just form-machinery)

22 cells -- alles was im Formular passiert OHNE in den Generate-Request zu fliessen:

#### Submit / error state (4)

| Cell | Purpose |
|---|---|
| `isSubmitting` | disable button during request |
| `promptError` | client-side validation message |
| `submitError` | server-side error message |
| `showUpgradeModal` | gate when no credits |

#### Template management (6 -- sub-app for prompt-templates)

| Cell | Purpose |
|---|---|
| `selectedCategory` | filter for template picker |
| `showTemplatePicker` | modal-state |
| `showSaveDialog` | save-template modal |
| `templateName` | dialog input |
| `templateCategory` | dialog input |
| `isSavingTemplate` | dialog loading |

#### Preset management (4 -- sub-app for generation-presets)

| Cell | Purpose |
|---|---|
| `showPresetPicker` | modal-state |
| `showPresetSaveDialog` | save-preset modal |
| `presetName` | dialog input |
| `isSavingPreset` | dialog loading |

#### Style boost (1 -- mini-sub-flow)

| Cell | Purpose |
|---|---|
| `isBoosting` | loading for `/api/style-boost` |

#### Lyrics generator (4 -- separate sub-flow)

| Cell | Purpose |
|---|---|
| `showLyricsGenerator` | sub-form visibility |
| `lyricsPrompt` | input to LLM ("write lyrics about X") |
| `generatedLyrics` | LLM output, can be transferred to `lyrics` |
| `isGeneratingLyrics` | loading |

#### Auto-generate (3 -- different API endpoint)

| Cell | Purpose |
|---|---|
| `showAutoGenerate` | sub-form visibility |
| `autoPrompt` | THE param (counted in §1.1) |
| `isAutoGenerating` | loading |

#### Misc effects (2)

| Cell | Purpose |
|---|---|
| `showConfetti` | first-generation success burst |
| `feedbackWidget` | `{songId}` for InAppFeedbackWidget hook |

---

## §2. Classification: Primary / Secondary / Advanced

Aus den 8 Domain-Params plus den 5 Sub-Flow-Aktivierungen.

### §2.1 Primary (5)

**Anfaenger-Friendly. Jeder neue User stellt das ein. Default-Sichtbar.**

| Param | Begruendung |
|---|---|
| `lyrics` (a.k.a. prompt) | THE input. Eines der zwei Pflicht-Felder. |
| `stylePrompt` (a.k.a. tags/style) | Der "Genre/Stimmung"-Input. Zweite Pflicht-Achse. |
| `selectedPersonaId` | Bei Power-Users der dominante Input (Persona setzt style + Lyrics-Anleitung) -- Primary weil **Persona-Erst-Workflow** ist der schnellere Weg fuer Wiederkehr-User. |
| `instrumental` (toggle) | Binary, klar, oft genutzt. Switch-Style-UI Default-Sichtbar. |
| `title` | Optional, aber jeder User setzt es -- weil generierte Songs ohne Title schlecht sortierbar sind. |

### §2.2 Secondary (3 -- mode-toggle und sub-flows)

**Power-User. Default-Hidden hinter einem Toggle / Tab.**

| Param / Sub-flow | Begruendung |
|---|---|
| `customMode` | Toggle "I bring my own lyrics" vs "Persona generates". Power-User-Distinction, nicht jeder neue User braucht das. |
| `Style boost` (button) | Optional one-click "improve my style prompt" via LLM. Secondary weil nicht jeder Workflow es braucht. |
| `Auto-generate` (sub-flow) | `/api/generate/auto` mit nur einem hohen-Niveau Prompt -- LLM uebernimmt Style+Lyrics. Power-User-Lazy-Mode. |

### §2.3 Advanced (3 -- sub-apps inside the form)

**Selten direkt-editiert. Default-Hidden hinter "Advanced" oder eigener Tab.**

| Sub-flow | Begruendung |
|---|---|
| `Lyrics generator` | Separate LLM-Workflow ("write me lyrics about X"). 4 useState + own loading. Eigenes Mini-Tool. |
| `Save Preset` | Preset-CRUD inside the form. 4 useState + own modal. **Sollte raus** in /authoring (D11). |
| `Save Template` | Template-CRUD inside the form. 6 useState + own modal. **Sollte raus** in /authoring (D11). |

### §2.4 Not classified (UI-only, no user-decision)

`isSubmitting`, error states, `showUpgradeModal`, `showConfetti`, `feedbackWidget` -- automatisch, kein User-Choice. Bleiben wo sie sind.

---

## §3. Persona / Preset / Template Override Map

Wenn User eine Persona / Preset / Template auswaehlt: was wird auto-gefuellt? Aus `autoFillGenerationFields` in `generate-form/api.ts` + Persona/Preset types.

| Form param | Persona | Preset | Template |
|---|---|---|---|
| `title` | -- | `preset.title` | -- |
| `stylePrompt` | `persona.style` | `preset.stylePrompt` | `template.style` |
| `lyrics` | `persona.description` (?) | `preset.lyricsPrompt` | `template.prompt` |
| `customMode` | -- | `preset.customMode` | -- |
| `instrumental` | -- | `preset.isInstrumental` | `template.isInstrumental` |
| `selectedPersonaId` | (this IS persona) | -- | -- |

**Interpretation:**
- **Persona** uebernimmt 2-3 Domain-Params (style + lyrics hint, +/- mode).
- **Preset** uebernimmt 5 Domain-Params (alles ausser personaId).
- **Template** uebernimmt 3 Domain-Params (style + prompt + instrumental).
- **Preset ist die maechtigste Auto-Fill-Quelle** -- ein gut-konfiguriertes Preset = One-Click-Generation.

**S03-T02 Implication:** Wenn der Default-Mode "Persona-First" ist, hat der User nach Persona-Auswahl nur noch 2 Felder zu fuellen (style + optional title + optional lyrics). Das ist Progressive-Disclosure-Pattern.

---

## §4. UI-State vs Domain-State

| Type | Cells | Note |
|---|---:|---|
| Domain (maps to API) | 8 | Wandert in `/api/generate` body |
| Sub-flow data (maps to other API) | 1 | `autoPrompt` → `/api/generate/auto` |
| Modal / picker visibility | 5 | `showTemplatePicker`, `showPresetPicker`, `showSaveDialog`, `showPresetSaveDialog`, `showLyricsGenerator` |
| Dialog input fields | 4 | `templateName`, `templateCategory`, `presetName`, `lyricsPrompt` |
| Loading flags | 6 | `isSubmitting`, `isSavingTemplate`, `isSavingPreset`, `isBoosting`, `isGeneratingLyrics`, `isAutoGenerating` |
| Error / hint state | 2 | `promptError`, `submitError` |
| Success effects | 2 | `showConfetti`, `feedbackWidget` |
| Filter / selection | 2 | `selectedCategory`, `showAutoGenerate` |

**Insight: 17 von 30 useState sind Sub-App-State** (3 Sub-Flows + Preset/Template-CRUD). Wenn S03-T02 die zwei CRUD-Sub-Apps (Preset / Template) NACH `/authoring` verschiebt (per D11), faellt der useState-Count auf ~20.

---

## §5. Backend Persistence Map

Was wird vom Generate-Request in der DB persistiert?

| Param | Song-Field | Other models |
|---|---|---|
| `prompt` (a.k.a. lyrics) | `Song.prompt` | -- |
| `title` | `Song.title` | -- |
| `tags` (a.k.a. style) | `Song.tags` (or `Song.style`?) | -- |
| `makeInstrumental` | `Song.isInstrumental` | -- |
| `personaId` | `Song.personaId` | `Persona` link |
| `parentSongId` | `Song.parentSongId` | Song-variant tree |

Plus auto-erfasste Felder beim Generate:
- `Song.userId` (session)
- `Song.generationStatus` ("pending")
- `Song.sunoJobId` (after Suno call)
- `GenerationQueueItem` row
- `GenerationAttempt` row
- `CreditUsage` row (debit)
- `Activity` row (audit)

(Quelle: `prisma/schema.prisma` Song model + `lib/generation/index.ts` flow per FEATURE-MAP §3.)

---

## §6. Friction Cross-Check vs FRICTION-AUDIT §1

| FRICTION-AUDIT §1 finding | This inventory confirms / refines |
|---|---|
| "30 useState calls" | ✓ Bestaetigt. Aber: nur 8 sind Domain-Params, 22 sind UI/Sub-Flow-State. |
| "11 native form widgets" | ✓ Match: 5 input + 3 select + 3 textarea = 11. (Manche fuer Sub-Flow-Dialogs, nicht Main-Form.) |
| "0 props on GenerateForm" | ✓ Bestaetigt. Alles aus Hooks + searchParams. |
| "6 sibling components rendered inside the form" | ✓ -- `GenerationProgress`, `GenerationQueue`, `BatchGeneratePanel`, `Confetti`, `UpgradeModal`, `InAppFeedbackWidget`. Plus die 2 Lyrics-Generator + 2 Save-Dialogs internally. |
| "44 references to generationMode/preset/persona" | ✓ Bestaetigt. Die 3 Konzepte sind durch die ganze Komponente gewoben. |
| "5 generation-cluster surfaces" | -- Verlinkt zu IA-MAP. Diese Inventur betrifft nur `/generate`; `/mashup` `/compare` `/inspire` `/generations` haben eigene Components. |

**Insight: FRICTION-AUDIT "30 useState in one tree" ist halb-irrefuehrend.** Davon 22 sind UI-State. Echte mental-model Last ist 8 Domain-Params + die Awareness dass 3 Sub-Apps drin leben. **Das ist die Disclosure-Skizze-Vorlage:**

```
Generate Form (sichtbar, Default-Mode):
  ├─ Persona-Picker (1 cell, primary)
  ├─ Prompt / Lyrics (1 cell, primary)
  ├─ Style (1 cell, primary)
  ├─ Title (1 cell, primary)
  ├─ Instrumental (1 cell, primary)
  └─ Submit (1 cell, primary)

Hidden behind disclosure (Advanced toggle):
  ├─ Style Boost button (action, no own form-state)
  └─ Custom-Mode toggle (1 cell, secondary)

In separate Tab (Auto-Mode):
  └─ Auto-Prompt (1 cell)

Move OUT to /authoring (post-D11):
  ├─ Save Preset (4 useState moved)
  ├─ Save Template (6 useState moved)
  └─ Template Picker / Preset Picker (4 useState moved -- become read-only pickers)

Move OUT to dedicated /lyrics-tool? (eval in T02):
  └─ Lyrics Generator sub-flow (4 useState)
```

If alle Moves akzeptiert: GenerateForm.tsx faellt von 30 useState auf ~10-12. Das ist S03-T02 Disclosure-Target.

---

End of Generate Inventory.
