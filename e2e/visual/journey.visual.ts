import { test, expect, type Page, type TestInfo } from "@playwright/test";
import fs from "fs";
import path from "path";
import {
  registerUser,
  loginViaUI,
  uniqueEmail,
  DEFAULT_PASSWORD,
} from "../helpers";

/**
 * Visual journey — screenshots every major surface into
 * visual-artifacts/<VISUAL_LABEL>/<project>/<NN-surface>.png.
 *
 * NOT collected by the normal E2E run (filename is *.visual.ts, default config
 * matches *.spec.ts only). Run via `bash scripts/visual-journey.sh`, which
 * provides the throwaway DB + keyless port-80 prod server this spec assumes.
 * See e2e/visual/README.md for the baseline/diff loop.
 *
 * Seeding: on a KEYLESS server with PLAYWRIGHT_TEST=true, POST /api/generate
 * persists an instantly-"ready" Song row with a self-contained SVG data-URL
 * cover — real rows, zero paid calls (src/lib/generation/execute.ts keyless
 * branch). CAVEAT: the stored title/tags always come from mockSongs[0]
 * ("Neon Drift" / synthwave) because core.ts prefers input.mock.title over the
 * request title — but the COVER art is generated from the request's
 * title/tags, so covers still vary per seed call. For genuinely varied
 * titles/lyrics run the wrapper with SEED_MODE=rich
 * (scripts/seed-visual-library.ts), which seeds via Prisma and makes this
 * spec skip its own API seeding.
 */

test.describe.configure({ mode: "serial" });

const label = process.env.VISUAL_LABEL ?? "current";
const richSeed = process.env.SEED_MODE === "rich";
// In rich mode the DB seed script owns the user; both projects share it.
// In default mode each project worker registers its own user + library.
// `||` not `??`: the wrapper exports VISUAL_EMAIL="" in default mode.
const email =
  process.env.VISUAL_EMAIL ||
  (richSeed ? "visual-journey@test.local" : uniqueEmail("visual"));
const password = DEFAULT_PASSWORD;

const SEED_COUNT = 15;
// Varied per-seed request metadata: only the generated cover art reflects it
// (see header caveat), but that is enough for a visually diverse grid.
const SEED_VARIETY: Array<{ title: string; tags: string; prompt: string }> = [
  { title: "Neon Drift", tags: "synthwave, electronic", prompt: "Neon-lit midnight drive" },
  { title: "Summer Rain", tags: "indie, folk, acoustic", prompt: "Rainy afternoon nostalgia" },
  { title: "Hyperspeed", tags: "drum and bass, cyberpunk", prompt: "High-energy chase scene" },
  { title: "Mountain Echo", tags: "orchestral, cinematic", prompt: "Sweeping adventure theme" },
  { title: "Late Night Jazz", tags: "jazz, lounge, piano", prompt: "Smoky lounge session" },
  { title: "Digital Heart", tags: "synth-pop, ballad", prompt: "Falling in love online" },
  { title: "Desert Mirage", tags: "ambient, downtempo", prompt: "Heat shimmer over dunes" },
  { title: "Iron Groove", tags: "funk, disco", prompt: "Basement funk jam" },
  { title: "Polar Lights", tags: "post-rock, atmospheric", prompt: "Aurora over the fjord" },
  { title: "Street Poet", tags: "hip hop, boom bap", prompt: "Late-night cypher" },
  { title: "Tidal Pull", tags: "trip hop, moody", prompt: "Waves against the pier" },
  { title: "Clockwork Waltz", tags: "classical, waltz", prompt: "Mechanical ballroom" },
  { title: "Ember Days", tags: "country, americana", prompt: "Campfire storytelling" },
  { title: "Static Bloom", tags: "shoegaze, dream pop", prompt: "Feedback in slow motion" },
  { title: "Final Transit", tags: "techno, industrial", prompt: "Last train through the city" },
];

/** CSS injected before each shot to freeze animations/transitions/carets. */
const FREEZE_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
  }
`;

function artifactDir(testInfo: TestInfo): string {
  return path.resolve(__dirname, "../../visual-artifacts", label, testInfo.project.name);
}

/** Pin the dark theme before any document load (layout.tsx inline script reads this key). */
async function pinTheme(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("sunoflow_theme", "dark");
    } catch {}
  });
}

async function capture(
  page: Page,
  testInfo: TestInfo,
  name: string,
  urlPath?: string,
) {
  if (urlPath) {
    await page.goto(urlPath);
  }
  // networkidle can hang forever on surfaces with polling — best-effort only.
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.addStyleTag({ content: FREEZE_CSS }).catch(() => {});
  await page.waitForTimeout(300);
  const dir = artifactDir(testInfo);
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
}

/** Seed a single instantly-ready mock song and fail loudly on a real key. */
async function seedReadySong(
  page: Page,
  meta: { title: string; tags: string; prompt: string },
): Promise<{ id: string }> {
  const res = await page.request.post("/api/generate", { data: meta });
  const body = (await res.json().catch(() => ({}))) as {
    songs?: { id: string; generationStatus: string }[];
    error?: string;
  };
  const song = body.songs?.[0];
  if (res.status() !== 201 || !song || body.error) {
    throw new Error(
      `visual seed: /api/generate returned ${res.status()} — ${JSON.stringify(body)}`,
    );
  }
  // Only the keyless mock fallback returns an instantly-ready song. Anything
  // else means the server holds a real Suno key and may have started a real
  // (paid) generation — abort loudly so this is never silently repeated.
  if (song.generationStatus !== "ready") {
    throw new Error(
      `visual seed: song came back "${song.generationStatus}" instead of "ready" — ` +
        "the server appears to have a real Suno API key; do not run the visual journey against it",
    );
  }
  return { id: song.id };
}

test.describe("Visual journey", () => {
  test("unauthenticated surfaces", async ({ page }, testInfo) => {
    await pinTheme(page);
    await capture(page, testInfo, "01-login", "/login");
    await capture(page, testInfo, "02-register", "/register");
  });

  test("authenticated journey", async ({ page }, testInfo) => {
    await pinTheme(page);

    // Register the journey user. In rich mode (or on a second project run
    // against a shared VISUAL_EMAIL) the user already exists — tolerate that;
    // the login below fails loudly if the user truly does not exist.
    await registerUser(testInfo.project.use.baseURL ?? "http://127.0.0.1", {
      name: "Visual Journey",
      email,
      password,
    }).catch(() => {});

    await loginViaUI(page, email, password);

    // ── Seed the library (skipped in rich mode — the DB seed script owns it) ──
    if (!richSeed) {
      const listRes = await page.request.get("/api/songs");
      const list = (await listRes.json().catch(() => ({}))) as {
        songs?: { id: string }[];
      };
      const existing = list.songs?.length ?? 0;
      for (let i = existing; i < SEED_COUNT; i++) {
        await seedReadySong(page, SEED_VARIETY[i % SEED_VARIETY.length]);
      }
    }

    // Collect ids for the detail surfaces.
    const songsRes = await page.request.get("/api/songs");
    const songsBody = (await songsRes.json().catch(() => ({}))) as {
      songs?: { id: string; generationStatus: string }[];
    };
    const readySongs = (songsBody.songs ?? []).filter(
      (s) => s.generationStatus === "ready",
    );
    expect(readySongs.length).toBeGreaterThan(0);
    const songId = readySongs[0].id;

    // ── Playlists + favorites so those surfaces are non-empty ──
    let playlistsRes = await page.request.get("/api/playlists");
    let playlists = (await playlistsRes.json().catch(() => [])) as
      | { id: string; name: string }[]
      | { playlists?: { id: string; name: string }[] };
    let playlistList = Array.isArray(playlists) ? playlists : playlists.playlists ?? [];
    if (playlistList.length < 2) {
      for (const name of ["Night Drive", "Chill Study"]) {
        const createRes = await page.request.post("/api/playlists", {
          data: { name },
        });
        if (!createRes.ok()) {
          throw new Error(`visual seed: create playlist failed (${createRes.status()})`);
        }
        const created = (await createRes.json()) as { id: string };
        // Put a few songs in so the detail page has rows.
        for (const song of readySongs.slice(0, 3)) {
          await page.request
            .post(`/api/playlists/${created.id}/songs`, { data: { songId: song.id } })
            .catch(() => {});
        }
      }
      playlistsRes = await page.request.get("/api/playlists");
      playlists = (await playlistsRes.json().catch(() => [])) as
        | { id: string; name: string }[]
        | { playlists?: { id: string; name: string }[] };
      playlistList = Array.isArray(playlists) ? playlists : playlists.playlists ?? [];
    }
    expect(playlistList.length).toBeGreaterThan(0);
    const playlistId = playlistList[0].id;

    for (const song of readySongs.slice(0, 2)) {
      await page.request.post(`/api/songs/${song.id}/favorite`).catch(() => {});
    }

    // ── Walk the surfaces ──
    const surfaces: Array<[string, string]> = [
      ["03-home", "/"],
      ["04-library", "/library"],
      ["05-song-detail", `/library/${songId}`],
      ["06-generate", "/generate"],
      // Paywalled at free tier — deliberately captures the lock state.
      ["07-mashup", "/mashup"],
      ["08-inspire", "/inspire"],
      ["09-templates", "/templates"],
      ["10-style-templates", "/style-templates"],
      ["11-personas", "/personas"],
      ["12-playlists", "/playlists"],
      ["13-playlist-detail", `/playlists/${playlistId}`],
      ["14-favorites", "/favorites"],
      ["15-history", "/history"],
      ["16-discover", "/discover"],
      ["17-settings", "/settings"],
      ["18-settings-billing", "/settings/billing"],
      ["19-profile", "/profile"],
      ["20-pricing", "/pricing"],
    ];
    for (const [name, urlPath] of surfaces) {
      await capture(page, testInfo, name, urlPath);
    }

    // ── Player chrome: trigger playback so the mini-player mounts. Mock songs
    // have an empty audioUrl, so nothing actually plays — the bar renders its
    // idle state, which is enough for brand diffing. Best-effort: if the play
    // control is not found, the shot is just the library again.
    await page.goto("/library");
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    const playButton = page.getByRole("button", { name: /play/i }).first();
    if (await playButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await playButton.click().catch(() => {});
      await page.waitForTimeout(1000);
    }
    await capture(page, testInfo, "21-player");
  });
});
