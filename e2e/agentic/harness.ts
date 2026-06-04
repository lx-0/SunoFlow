/**
 * The agentic loop: OBSERVE → DECIDE → ACT, repeat until done or out of steps.
 *
 * OBSERVE  uses Playwright's `ariaSnapshot()` — the same accessibility-tree
 *          representation that Playwright-MCP feeds to an LLM. No screenshots,
 *          no brittle CSS: the agent sees roles + accessible names, exactly the
 *          stable hooks SunoFlow already exposes (it has no data-testid).
 * DECIDE   delegates to the LLM persona (llm.ts).
 * ACT      maps the structured action back onto getByRole(...) locators.
 *
 * Every step is recorded so the run is fully replayable/auditable.
 */
import type { Page } from "@playwright/test";
import {
  type AgentAction,
  type LlmConfig,
  decideNextAction,
} from "./llm";
import type { Persona } from "./persona";

export interface FrictionNote {
  step: number;
  url: string;
  severity: "low" | "med" | "high";
  friction: string;
}

export interface StepRecord {
  step: number;
  url: string;
  action: AgentAction;
  outcome: "ok" | "error";
  detail?: string;
}

export interface AgentReport {
  persona: string;
  goal: string;
  success: boolean;
  endedReason: string;
  steps: StepRecord[];
  friction: FrictionNote[];
}

const SNAPSHOT_CAP = 6000; // chars; keeps the prompt cheap on large pages

/** OBSERVE: compact accessibility view of the current page. */
async function observe(page: Page): Promise<string> {
  const snapshot = await page.locator("body").ariaSnapshot();
  const trimmed =
    snapshot.length > SNAPSHOT_CAP
      ? `${snapshot.slice(0, SNAPSHOT_CAP)}\n…(truncated)`
      : snapshot;
  return `URL: ${page.url()}\n\nAccessibility tree:\n${trimmed}`;
}

/** ACT: execute one structured action. Returns a result string fed back to the LLM. */
async function act(page: Page, action: AgentAction): Promise<{ outcome: "ok" | "error"; detail?: string }> {
  const TIMEOUT = 8000;
  try {
    switch (action.kind) {
      case "click": {
        await page
          .getByRole(action.role as Parameters<Page["getByRole"]>[0], { name: action.name })
          .first()
          .click({ timeout: TIMEOUT });
        return { outcome: "ok" };
      }
      case "fill": {
        await page
          .getByRole(action.role as Parameters<Page["getByRole"]>[0], { name: action.name })
          .first()
          .fill(action.text, { timeout: TIMEOUT });
        return { outcome: "ok" };
      }
      case "goto": {
        await page.goto(action.path);
        return { outcome: "ok" };
      }
      case "note":
      case "done":
        return { outcome: "ok" }; // bookkeeping-only actions
    }
  } catch (err) {
    // Feed the failure back to the agent so it can recover (real agentic behaviour).
    return { outcome: "error", detail: (err as Error).message.split("\n")[0] };
  }
}

const SYSTEM_PROMPT = (persona: Persona, goal: string) =>
  [
    persona.bio,
    "",
    `Your goal: ${goal}`,
    "",
    "You are driving a real web app. Each turn you receive the current page as an",
    "accessibility tree (roles + accessible names). Choose exactly ONE next action.",
    "Refer to elements by their role and accessible name as shown in the tree.",
    "",
    "Reply with ONLY a JSON object, one of:",
    '  {"kind":"click","role":"button","name":"New","reason":"..."}',
    '  {"kind":"fill","role":"textbox","name":"Search songs","text":"chill","reason":"..."}',
    '  {"kind":"goto","path":"/library","reason":"..."}',
    '  {"kind":"note","severity":"low|med|high","friction":"what confused/blocked you"}',
    '  {"kind":"done","success":true|false,"reason":"..."}',
    "",
    "Rules: prefer clicking what is actually in the tree. If you are stuck or an",
    "action keeps failing, emit a `note` describing the friction, then try an",
    "alternative or `done` with success:false. Stay in character.",
  ].join("\n");

/** Run one persona toward one goal and return a structured UX report. */
export async function runAgent(
  page: Page,
  cfg: LlmConfig,
  persona: Persona,
  goal: string,
): Promise<AgentReport> {
  const steps: StepRecord[] = [];
  const friction: FrictionNote[] = [];
  const history: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT(persona, goal) },
  ];

  let success = false;
  let endedReason = "step budget exhausted";

  for (let step = 1; step <= persona.maxSteps; step++) {
    const observation = await observe(page);
    history.push({ role: "user", content: observation });

    let action: AgentAction;
    try {
      action = await decideNextAction(cfg, history);
    } catch (err) {
      endedReason = `LLM error: ${(err as Error).message}`;
      break;
    }
    history.push({ role: "assistant", content: JSON.stringify(action) });

    const url = page.url();

    if (action.kind === "note") {
      friction.push({ step, url, severity: action.severity, friction: action.friction });
      steps.push({ step, url, action, outcome: "ok" });
      continue;
    }
    if (action.kind === "done") {
      success = action.success;
      endedReason = action.reason;
      steps.push({ step, url, action, outcome: "ok" });
      break;
    }

    const { outcome, detail } = await act(page, action);
    steps.push({ step, url, action, outcome, detail });
    if (outcome === "error") {
      history.push({ role: "user", content: `Action failed: ${detail}. Try something else.` });
    }
  }

  return { persona: persona.label, goal, success, endedReason, steps, friction };
}

/** Render a human-readable markdown report. */
export function reportToMarkdown(r: AgentReport): string {
  const lines: string[] = [
    `# Agentic UX run — ${r.persona}`,
    "",
    `**Goal:** ${r.goal}`,
    `**Result:** ${r.success ? "✅ goal reached" : "❌ did not reach goal"} — ${r.endedReason}`,
    `**Steps:** ${r.steps.length}   **Friction notes:** ${r.friction.length}`,
    "",
    "## Friction (verify each against a real user — do NOT treat as verdicts)",
  ];
  if (r.friction.length === 0) {
    lines.push("_None recorded._");
  } else {
    for (const f of r.friction) {
      lines.push(`- **[${f.severity}]** (step ${f.step}, ${f.url}) — ${f.friction}`);
    }
  }
  lines.push("", "## Step trace");
  for (const s of r.steps) {
    const a = s.action;
    const desc =
      a.kind === "note"
        ? `note[${a.severity}]: ${a.friction}`
        : a.kind === "done"
          ? `done(success=${a.success}): ${a.reason}`
          : a.kind === "goto"
            ? `goto ${a.path}`
            : `${a.kind} ${a.role}="${a.name}"${a.kind === "fill" ? ` ← "${a.text}"` : ""}`;
    lines.push(`${s.step}. ${s.outcome === "error" ? "⚠️ " : ""}${desc}${s.detail ? ` (${s.detail})` : ""}`);
  }
  return lines.join("\n");
}
