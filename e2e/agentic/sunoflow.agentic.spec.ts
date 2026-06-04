/**
 * Agentic (LLM-driven) UX smoke test for SunoFlow.
 *
 * Unlike the scripted specs in e2e/, no step here is hardcoded. An LLM persona
 * observes the live page (accessibility tree) and decides each action itself,
 * then records UX friction it hits. The value is *flow-defect discovery*, not
 * taste judgement — see persona.ts for the research caveats.
 *
 * Safety: Suno generation and credits are mocked, so a bot run NEVER triggers
 * a real paid generation. Auth uses the existing PLAYWRIGHT_TEST bypass.
 *
 * Run:
 *   pnpm dev                       # terminal 1 (PLAYWRIGHT_TEST server)
 *   # terminal 2 — point at any OpenAI-compatible LLM:
 *   LLM_BASE_URL=http://192.168.2.42:11434/v1 LLM_MODEL=phi4:14b \
 *     pnpm exec playwright test e2e/agentic --headed
 */
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import {
  getSharedUser,
  loginViaUI,
  mockCreditsAPI,
  mockSongsAPI,
  mockSong,
} from "../helpers";
import { PERSONAS } from "./persona";
import { llmConfigFromEnv } from "./llm";
import { runAgent, reportToMarkdown } from "./harness";

const cfg = llmConfigFromEnv();

const GOALS: Record<string, string> = {
  "casual-listener":
    "Starting from the library, open one of your songs and start playing it, " +
    "then add that song to a NEW playlist called 'Chill'. If you genuinely " +
    "cannot find how to do a step, record the friction and give up.",
  "power-user":
    "Search your library for a song, open it, and add it to a new playlist " +
    "'Focus' — as fast as possible. Note any step that costs an avoidable click.",
};

// A small, deterministic library so the agent always has something to act on.
const LIBRARY = [
  mockSong({ title: "Neon Drift", tags: "synthwave", generationStatus: "ready" }),
  mockSong({ title: "Summer Rain", tags: "lofi", generationStatus: "ready" }),
  mockSong({ title: "Hyperspeed", tags: "drum and bass", generationStatus: "ready" }),
];

test.beforeAll(async () => {
  // Preflight: skip cleanly (not fail) if no LLM endpoint is reachable.
  try {
    const ping = await fetch(`${cfg.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
    });
    if (!ping.ok && ping.status !== 404) throw new Error(`status ${ping.status}`);
  } catch (err) {
    test.skip(
      true,
      `No LLM endpoint at ${cfg.baseUrl} (${(err as Error).message}). ` +
        `Set LLM_BASE_URL / LLM_MODEL (e.g. local Ollama or llm.yester.cloud).`,
    );
  }
});

for (const persona of PERSONAS) {
  test(`agentic UX — ${persona.label}`, async ({ page }) => {
    test.setTimeout(180_000); // LLM round-trips + browser actions

    // ── No-paid-call guardrails ──────────────────────────────────────────────
    await mockCreditsAPI(page, 50);
    await mockSongsAPI(page, LIBRARY);
    await page.route("**/api/generate", async (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ songs: [mockSong({ title: "Mock Gen" })] }),
      }),
    );

    // ── Auth via the existing PLAYWRIGHT_TEST bypass ─────────────────────────
    const user = getSharedUser();
    await loginViaUI(page, user.email, user.password);
    await page.goto("/library");

    // ── Hand the wheel to the persona ────────────────────────────────────────
    const report = await runAgent(page, cfg, persona, GOALS[persona.id]);

    // ── Persist + attach the report ──────────────────────────────────────────
    const md = reportToMarkdown(report);
    const outDir = path.join(process.cwd(), "test-results", "agentic");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, `${persona.id}.md`), md, "utf-8");
    await test.info().attach(`agentic-report-${persona.id}`, {
      body: md,
      contentType: "text/markdown",
    });
    // eslint-disable-next-line no-console
    console.log(`\n${md}\n`);

    // ── Assertions: the *harness* must work; UX outcome is reported, not gated.
    expect(report.steps.length, "agent took at least one step").toBeGreaterThan(0);
    expect(report.endedReason, "no LLM/infra failure mid-run").not.toMatch(/^LLM error/);
    // High-severity friction is surfaced loudly but does not fail the build —
    // it is a hypothesis for a human, per the research caveats.
    const high = report.friction.filter((f) => f.severity === "high");
    if (high.length) {
      console.warn(`⚠️  ${persona.label} hit ${high.length} HIGH-severity friction point(s)`);
    }
  });
}
