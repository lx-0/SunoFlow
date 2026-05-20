---
milestone: M001
slice: S03
task: T02
artifact: GENERATE-REDESIGN
created: 2026-05-18T10:10:00Z
sources:
  - .ytstack/M001-GENERATE-INVENTORY.md (8 Domain-Params, 5-3-3 Klassifikation)
  - .ytstack/USER-JOURNEY.md §1 (Persona) + §3 (Generate steps)
  - .ytstack/M001-IA-MAP.md §3 row 13 (D10 Generate-Tabs), §7.5 + §7.6 Constraints
  - .ytstack/M001-FRICTION-AUDIT.md §1 (Status quo)
  - .ytstack/DECISIONS.md D10, D11, D12
constraints_respected:
  - §7.5 Mobile-Power-User persona (mobile-default-stack)
  - §7.6 god-object warning (GenerateForm refactor, nicht ersetzt)
  - D10 Tabs in /generate
  - D11 Preset/Template-CRUD wandert nach /authoring
  - D12 Persona-Auswahl bleibt inline
---

# M001 Generate Redesign Sketch

ASCII-Mockup + Behavior-Notes fuer entlastete Generate-Surface. Plan-only, kein Code. Implementierung in **M002 Generate-Refactor** (per Folge-Milestones, T03).

---

## §1. Goals

Der Redesign muss diese Ziele gleichzeitig erfuellen:

| # | Goal | Erfolgskriterium |
|---|---|---|
| 1 | Mental-model overload reduzieren | 30 useState (FRICTION §1) → ~12 |
| 2 | Persona-First Workflow als Default | Neuer User klickt Persona → Felder auto-gefuellt → Submit |
| 3 | Mobile-First Layout | sm:-Default ist vertical-stack, keine horizontal-density |
| 4 | 0 Feature-Verlust | Alle Sub-Flows (Lyrics-Gen, Auto-Mode, Style-Boost, Preset, Template) erreichbar |
| 5 | god-object respektieren | `GenerateForm.tsx` refactored, nicht ersetzt -- §7.6 Constraint |
| 6 | D10/D11/D12 kompatibel | Tabs in /generate, CRUD nach /authoring, Persona inline |
| 7 | Naming-Drift fix (M002-Decision) | stylePrompt/tags/style vereinheitlichen, lyrics/prompt vereinheitlichen |

---

## §2. Disclosure Levels

4 Levels von "minimal sichtbar" zu "alles offen":

### Level 0 -- Default Simple Mode

Sichtbar OHNE Toggle / Tab-Wechsel. Was ein **brand-new User** sieht.

| Feld | Klassifikation (Inventory §2) | Note |
|---|---|---|
| Persona-Picker | Primary | dropdown, mit "Choose persona" placeholder |
| Style / Genre | Primary | text input, auto-fillable |
| Lyrics / Prompt | Primary | textarea, auto-fillable |
| Instrumental | Primary | switch toggle |
| Title (optional) | Primary | text input |
| Submit-Button | Primary | "Generate Song →" |
| Credits inline | UI-State | "credits: X / Y" below submit |

**6 cells visible.** Mental-model-Last: was waehle ich, was schreibe ich, was wird's. Kein Mode-Toggle, keine Sub-Flow-Buttons.

### Level 1 -- Advanced Disclosure (innerhalb simple-Tab)

Sichtbar wenn User "Advanced ▼" expandiert. **Power-User-Toggles**.

| Feld / Action | Klassifikation | Note |
|---|---|---|
| Custom-Mode Toggle | Secondary | "I write my own lyrics" -- disables persona auto-fill for lyrics |
| Style-Boost Button | Secondary | inline neben Style-Feld, einer-Klick LLM-improve |
| Preset Load (read-only) | Sub-app reference | Dropdown "Apply preset..." → fills 5 fields. **Editieren in /authoring** (D11) |
| Template Load (read-only) | Sub-app reference | Dropdown "Apply template..." → fills 3 fields. **Editieren in /authoring** (D11) |
| Lyrics-Generator Link | Sub-flow trigger | "Need lyrics? Generate them →" link below lyrics-textarea. Oeffnet BottomSheet on mobile / Modal on desktop. |

**Pattern:** Sub-Flow-Buttons sind Trigger zu Sub-Surfaces (BottomSheet / Tab-Wechsel / Modal), NICHT inline-Sub-Forms wie heute.

### Level 2 -- Separate Tabs (D10)

Sichtbar als Top-of-Page-Tabs (URL `?tab=`). **Power-User-Modi**.

| Tab | Was passiert |
|---|---|
| `simple` (default) | Level 0 + Level 1 |
| `advanced` | Wie simple, aber Advanced-Disclosure ist permanent expanded |
| `mashup` | `/mashup`-Workflow inline (MashupStudio Component) |
| `compare` | `/compare`-Workflow inline (SongCompareView) |

### Level 3 -- Auto-Mode

Eigener Sub-Flow, kein Tab im Tab-Strip aber Link "Try Auto-Generate" oben. Zielt auf Lazy-Power-Users.

| Feld | Note |
|---|---|
| Auto-Prompt | Single textarea: "describe what you want, AI fills the rest" |
| Submit | "→ Auto-Generate" |

Hits `/api/generate/auto`. Eigenes Subform, Page-Surface oder Modal.

---

## §3. ASCII Mockup -- Mobile Default-Mode (Level 0)

```
┌──────────────────────────────┐
│ ☰  Generate              ▼   │  <- AppShell-Header + Persona-Quickpick optional
├──────────────────────────────┤
│ ┌─Simple─Advanced─Mashup─⋯─┐ │  <- tab strip, horizontal-scroll on mobile
│ └──────────────────────────┘ │
├──────────────────────────────┤
│                              │
│  Persona                     │
│ ╔══════════════════════════╗ │
│ ║ ▼ Synth Pop Composer      ║│  <- persona picker (filled)
│ ╚══════════════════════════╝ │
│                              │
│  Style                       │
│ ╔══════════════════════════╗ │
│ ║ retro synthwave, neon, ...║│  <- text, auto-filled from persona
│ ╚══════════════════════════╝ │
│  ╔ Boost style ✨ ╗  ← inline action (Advanced; nur sichtbar bei Level 1)
│                              │
│  Lyrics                      │
│ ╔══════════════════════════╗ │
│ ║ Auto-filled by persona... ║│
│ ║ (or type your own)        ║│
│ ║                           ║│
│ ╚══════════════════════════╝ │
│  → Generate lyrics with AI   │  <- Sub-flow trigger (BottomSheet)
│                              │
│  [✓] Instrumental            │  <- toggle switch
│                              │
│  Title (optional)            │
│ ╔══════════════════════════╗ │
│ ║                           ║│
│ ╚══════════════════════════╝ │
│                              │
│ ─────── Advanced ▼ ────────  │  <- disclosure toggle
│                              │
│ ╔════════════════════════════╗│
│ ║   Generate Song    →       ║│  <- primary CTA, large
│ ╚════════════════════════════╝│
│                              │
│  87 / 100 credits remaining  │  <- inline info
│                              │
└──────────────────────────────┘
   [GlobalPlayer slot below]
```

---

## §4. ASCII Mockup -- Mobile Advanced-Disclosure Expanded (Level 1)

```
┌──────────────────────────────┐
│ ☰  Generate              ▼   │
├──────────────────────────────┤
│ ┌─Simple─Advanced─Mashup─⋯─┐ │
├──────────────────────────────┤
│  ... (Level 0 stays same) ...│
│                              │
│ ─────── Advanced ▲ ────────  │  <- expanded
│                              │
│  [ ] Custom-Mode             │  <- "I write my own lyrics"
│      (disables persona-fill  │
│       for lyrics field)      │
│                              │
│  Load preset                 │
│ ╔══════════════════════════╗ │
│ ║ ▼ Choose preset...        ║│  <- read-only load
│ ╚══════════════════════════╝ │
│   Manage presets in          │
│   /authoring →               │  <- link to D11 home
│                              │
│  Load template               │
│ ╔══════════════════════════╗ │
│ ║ ▼ Choose template...      ║│
│ ╚══════════════════════════╝ │
│                              │
│ ─────── Advanced ▲ ────────  │
│                              │
│ ╔════════════════════════════╗│
│ ║   Generate Song    →       ║│
│ ╚════════════════════════════╝│
└──────────────────────────────┘
```

---

## §5. ASCII Mockup -- Desktop Two-Column-Layout (md: 768px+)

```
┌─────────────────────────────────────────────────────────────────┐
│ ☰  Generate                                          [Account]   │  <- AppShell
├─────────────────────────────────────────────────────────────────┤
│  ┌─Simple──Advanced──Mashup──Compare─┐                          │
│  └───────────────────────────────────┘                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Persona                              Lyrics                     │
│  ╔══════════════════════════╗        ╔═══════════════════════╗  │
│  ║ ▼ Synth Pop Composer      ║       ║ Auto-filled by persona║   │
│  ╚══════════════════════════╝         ║ (or type your own)    ║  │
│                                      ║                       ║  │
│  Style                               ║                       ║  │
│  ╔══════════════════════════╗        ║                       ║  │
│  ║ retro synthwave, neon...  ║       ╚═══════════════════════╝  │
│  ╚══════════════════════════╝        → Generate lyrics with AI  │
│  ╔ Boost ✨ ╗                                                    │
│                                      Title (optional)            │
│  [✓] Instrumental                    ╔═══════════════════════╗  │
│                                      ║                       ║  │
│  ─── Advanced ▼ ───                  ╚═══════════════════════╝  │
│                                                                  │
│  ╔══════════════════════════════════════════════════════════╗   │
│  ║              Generate Song    →                           ║   │
│  ╚══════════════════════════════════════════════════════════╝   │
│                                                                  │
│  87 / 100 credits remaining                                      │
└─────────────────────────────────────────────────────────────────┘
[GlobalPlayer slot at bottom -- persistent]
```

Desktop nutzt mehr horizontale Breite -- 2-Spalten-Layout statt Stack. Persona/Style/Instrumental links, Lyrics/Title rechts. Submit + Credits full-width unten.

---

## §6. Behavior Notes

### §6.1 Persona-Pick

User waehlt Persona aus dropdown:
1. `selectedPersonaId` setzen.
2. `stylePrompt` auto-fill aus `persona.style` (wenn vorhanden + Feld leer).
3. `lyrics` auto-fill aus `persona.description` (wenn vorhanden + Feld leer + nicht customMode).
4. `instrumental` auto-fill from `persona.defaultInstrumental` (wenn vorhanden).
5. User kann jedes Feld nach-bearbeiten -- Persona ist Seed, kein Lock.

UX-Detail: Persona-Pick zeigt 1-Sekunden-Pulse-Animation auf den auto-gefuellten Feldern -- visuell signalisieren "etwas hat sich geaendert".

### §6.2 Custom-Mode Toggle

In Advanced-Disclosure:
1. Toggle on → Persona-Auto-Fill fuer `lyrics` deaktivieren.
2. Toggle off → Persona-Auto-Fill wieder aktiv (aber nicht ueberschreiben, nur fuer naechstes Persona-Pick).
3. Lyrics-Feld bleibt sichtbar in beiden Modes.

### §6.3 Style-Boost Button

Inline-Action neben Style-Feld:
1. Disabled wenn Style-Feld leer.
2. Click → POST `/api/style-boost` mit current style → LLM erweitert/verbessert.
3. 1-2s loading state. Result ersetzt current style (mit Undo-Toast moeglich).

### §6.4 Lyrics-Generator Sub-Flow

Trigger-Link "Generate lyrics with AI →" unter Lyrics-Feld:
1. Click → oeffnet BottomSheet auf mobile / Modal auf desktop.
2. Sub-Flow:
   - User schreibt high-level prompt ("about a road trip in 80s synthwave")
   - LLM generiert Lyrics
   - User klickt "Use these lyrics" → wird zurueck in main-form `lyrics`-Feld geschrieben
3. Sub-Flow-State bleibt in der BottomSheet/Modal, nicht in der main `GenerateForm.tsx`.

### §6.5 Preset / Template Load

Read-only-Picker in Advanced-Disclosure:
1. User waehlt Preset → 5 Felder werden auto-gefuellt (Override-Map Inventory §3).
2. Selbe Confirmation-Animation wie bei Persona-Pick.
3. Kein Save-Button hier -- Edit/Create laeuft in `/authoring` (D11). Link drueber: "Manage presets in /authoring →".

### §6.6 Submit

Validation client-side:
- `lyrics` empty AND `stylePrompt` empty AND `selectedPersonaId` empty → button disabled.
- `lyrics` length > 3000 → error "prompt too long" (per `lib/generation/params.ts`).
- `stylePrompt` length > 500 → error.
- Credits remaining < 1 → button laesst UpgradeModal aufpoppen.

Server-Submit: POST `/api/generate` mit den 6 API-Feldern (`prompt`, `title`, `tags`, `makeInstrumental`, `personaId`, optional `parentSongId`).

### §6.7 Tab-Wechsel

User klickt "Mashup" Tab:
- URL aktualisiert auf `/generate?tab=mashup`.
- Page rendert `MashupStudio` statt `GenerateForm`.
- Aktueller Form-State NICHT verloren -- `GenerateForm`-Mount unmount via React, State zurueck via `searchParams`.
- Selbes Pattern fuer `compare`.

Pattern: Tab-Componentes sind sibling-renders, nicht conditional-mounts innerhalb GenerateForm.

### §6.8 Credit-Low Banner

- Bei `creditsRemaining < 10% * budget` → kleiner Banner ueber Submit-Button.
- Bei `creditsRemaining < 1` → Submit-Button trigger UpgradeModal direkt.

---

## §7. Implementation Hints for M002

### §7.1 useState-Reduktion-Target

Inventory §4: 30 useState heute, davon 22 UI/Sub-Flow-State. M002-Refactor-Plan:

- **Wandert nach /authoring** (D11): `selectedCategory`, `showTemplatePicker`, `showSaveDialog`, `templateName`, `templateCategory`, `isSavingTemplate`, `showPresetPicker`, `showPresetSaveDialog`, `presetName`, `isSavingPreset` -- **10 useState weg**.
- **Wandert in Sub-Flow-Component** (BottomSheet/Modal): `showLyricsGenerator`, `lyricsPrompt`, `generatedLyrics`, `isGeneratingLyrics` -- **4 useState weg** (in sub-Component verschoben).
- **Bleibt** (8 Domain + 5 Submit/Effect = 13): title, stylePrompt, customMode, lyrics, instrumental, selectedPersonaId, autoPrompt, isSubmitting, promptError, submitError, showUpgradeModal, isBoosting, showConfetti, feedbackWidget.

Result: **~13 useState** in GenerateForm.tsx. From 30 to 13.

### §7.2 Component-Split Vorschlag

```
src/components/generate-form/
├── GenerateForm.tsx        (~13 useState, main form)
├── PersonaPicker.tsx       (NEW: extracted picker, takes onPick prop)
├── StyleBoostButton.tsx    (NEW: inline action component)
├── LyricsGeneratorSheet.tsx (NEW: BottomSheet/Modal for sub-flow)
├── AdvancedDisclosure.tsx  (NEW: collapsible with custom-mode + preset/template-loader)
├── api.ts                  (unchanged)
├── helpers.ts              (unchanged)
├── types.ts                (unchanged)
└── useGenerateFormData.ts  (unchanged)
```

Plus `/authoring`-Pages (new, in M003 or later):
- `src/app/[locale]/authoring/page.tsx` mit `?tab=` Routing
- `src/components/authoring/{PersonaManager, TemplateBrowser, StyleTemplateManager}.tsx` (existieren teilweise, hier konsolidiert)

### §7.3 Naming-Drift Decision (M002 Vorbedingung)

Vor Refactor MUSS entschieden werden:
- `stylePrompt` (form) / `tags` (API) / `style` (helper) → einheitlich (Empfehlung: `style` ueberall, API field-rename via Zod-key umbenennen).
- `lyrics` (form) / `prompt` (API) → einheitlich (Empfehlung: `prompt` ueberall im Code, UI-Label bleibt "Lyrics" -- siehe Inventory §1.1).

DECISIONS-Entry D15 fuer M002.

### §7.4 Mobile-Default Defaults

- 5 Primary-Felder vertical-stack (`flex flex-col gap-4`).
- Submit-Button full-width (`w-full min-h-[44px]`) per §7.3 Touch-Target.
- Disclosure-Toggle als `<details>` HTML-Element ODER React-Disclosure-Component.
- BottomSheet fuer Lyrics-Generator via vorhandenen `BottomSheet.tsx` Component (T02 hat ihn flagged als under-utilised mit 1 consumer).

### §7.5 Sub-Flow Pattern

Lyrics-Generator: war 4 useState inline -- jetzt eigene `LyricsGeneratorSheet.tsx` Component mit eigenem State, kommuniziert via `onAccept(lyrics)` Callback zurueck ins Form.

Pattern: Sub-Flows = separate Components mit Callback-API, nicht inline-state in main Form.

### §7.6 Verification gegen §7 Constraints (IA-MAP)

PR-Checklist (per IA-MAP §7.8):
- [ ] GlobalPlayer-Slot nicht remounted bei Tab-Wechsel
- [ ] Race-Guards in GlobalPlayer unangetastet
- [ ] AUDIO_CACHE preserved
- [ ] BUILD_ID flow intact
- [ ] Generation-Pipeline-4-Datei-Glied (api/generate → lib/sunoapi → lib/songs/lifecycle → webhooks/suno) intact
- [ ] Keine neuen Breakpoints
- [ ] 44px Touch-Targets
- [ ] god-object refactor scope justified (M002 hat explizite Begruendung)
- [ ] /admin /api/v1 Public-URLs untouched

---

## §8. Out-of-Scope (fuer S03 / M001)

- **SongDetailView Progressive-Disclosure** -- T02-Summary §2 hat diese parallel-Frage geflagged. Sibling-Case zu Generate (35 onClicks + 7 modals). **Eigene M004+ Engineering-Pass**, nicht hier.
- **QueueContext-Split** (36 values exposed). M005+ Engineering-Pass, kein UX-Item.
- **`<FormField>` Design-System-Component** (Inventory §6: kein shared FormField across Generate/Library/Settings). M002+ Pass, sinnvoll mit Generate-Refactor.
- **PostHog-Daten** zu welche Felder wie oft genutzt werden -- T01-Plan hatte das als "needs verification" -- nicht in M001-Scope eingebaut.

---

End of Generate Redesign Sketch.
