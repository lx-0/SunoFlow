import { defineConfig, devices } from "@playwright/test";

/**
 * Visual-journey config — NOT part of the normal E2E suite.
 *
 * Run via `bash scripts/visual-journey.sh` (starts a throwaway DB + a keyless
 * port-80 prod server, then invokes this config with PLAYWRIGHT_REMOTE=true
 * and BASE_URL=http://127.0.0.1). See e2e/visual/README.md.
 *
 * Deliberately separate from playwright.config.ts:
 * - testDir is e2e/visual and testMatch is *.visual.ts, so `pnpm test:e2e`
 *   (default config, spec/test glob) never collects these files.
 * - No globalSetup: e2e/global-setup.ts reuses e2e/.shared-user.json, which is
 *   stale against the throwaway DB. The journey spec registers its own user.
 * - No webServer: the wrapper script owns the server lifecycle (the port-80
 *   recipe cannot be expressed as a playwright-managed webServer command).
 * - Output is raw PNGs (page.screenshot), NOT toHaveScreenshot assertions —
 *   Wave A recolors the whole app by design, so a pixel gate would fail
 *   everywhere. The diff step (scripts/visual-diff.mjs) is informational.
 */

const baseURL = process.env.BASE_URL ?? "http://127.0.0.1";

export default defineConfig({
  testDir: "./e2e/visual",
  testMatch: "**/*.visual.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  // Generous per-test timeout: the journey test seeds ~15 songs and walks
  // ~20 surfaces in a single serial test.
  timeout: 15 * 60 * 1000,
  use: {
    baseURL,
    trace: "off",
    // Force English locale so next-intl never redirects to a locale-prefixed URL
    locale: "en-US",
    // Block service workers — same reason as playwright.config.ts: the SW's
    // stale-while-revalidate on /api/songs makes shots non-deterministic.
    serviceWorkers: "block",
    // Stabilize shots: honor prefers-reduced-motion (the spec additionally
    // injects a CSS freeze for non-media-query animations).
    contextOptions: { reducedMotion: "reduce" },
  },
  expect: { timeout: 15000 },
  projects: [
    {
      name: "visual-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "visual-mobile",
      // Pixel 5 (393x851) — exercises the 5-tab mobile bottom nav in AppShell
      use: { ...devices["Pixel 5"] },
    },
  ],
  // Server is externally managed by scripts/visual-journey.sh
  webServer: undefined,
});
