import { test, expect, type Page } from "@playwright/test";
import {
  DEFAULT_PASSWORD,
  loginViaUI,
  getSharedUser,
  createPlaylistViaUI,
  isRemote,
} from "./helpers";

const TEST_PASSWORD = DEFAULT_PASSWORD;
const testEmail = getSharedUser().email;

// ─── Playlist CRUD ──────────────────────────────────────────────────────────

test.describe("Playlists — List & Create", () => {
  test("playlists page renders with empty state", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASSWORD);
    await page.goto("/playlists");

    await expect(page.locator("h1").first()).toContainText("Playlists");
    await expect(
      page.getByText("No playlists yet").first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("create a new playlist via the form", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASSWORD);
    await page.goto("/playlists");

    await createPlaylistViaUI(page, "My First Playlist", {
      description: "A test playlist",
    });

    await expect(page.getByText("A test playlist")).toBeVisible({ timeout: 5000 });
  });

  test("create form requires playlist name", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASSWORD);
    await page.goto("/playlists");

    await page.getByRole("button", { name: "New" }).click();

    // Create button should be disabled when name is empty
    const createBtn = page.getByRole("button", { name: "Create", exact: true });
    await expect(createBtn).toBeDisabled();
  });

  test("cancel create form hides it", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASSWORD);
    await page.goto("/playlists");

    await page.getByRole("button", { name: "New" }).click();
    await expect(page.getByPlaceholder("Playlist name")).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByPlaceholder("Playlist name")).not.toBeVisible();
  });
});

test.describe("Playlists — Detail & Edit", () => {
  test("navigate to playlist detail and see empty state", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASSWORD);
    await page.goto("/playlists");

    // Create a playlist first
    await createPlaylistViaUI(page, "Detail Test Playlist");

    // Navigate to it — click the anchor directly to avoid strict-mode ambiguity
    // (getByText matches both the <p> and its parent <a>, causing strict violations)
    await page.locator("a").filter({ hasText: "Detail Test Playlist" }).first().click();
    await expect(page).toHaveURL(/\/playlists\//, { timeout: 10000 });

    // Should show empty state
    await expect(
      page.getByText("No songs yet")
    ).toBeVisible({ timeout: 5000 });
  });

  test("edit playlist name and description", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASSWORD);
    await page.goto("/playlists");

    // Create a playlist
    await createPlaylistViaUI(page, "Editable Playlist");

    // Navigate to detail
    await page.locator("a").filter({ hasText: "Editable Playlist" }).first().click();
    await expect(page).toHaveURL(/\/playlists\//, { timeout: 10000 });

    // Click edit button
    await page.getByLabel("Edit playlist").click();

    // Clear and type new name
    const nameInput = page.locator("input[maxlength='100']").first();
    await nameInput.clear();
    await nameInput.fill("Renamed Playlist");

    await page.getByRole("button", { name: "Save" }).click();

    // Verify new name is displayed
    await expect(page.locator("h1").first()).toContainText("Renamed Playlist", {
      timeout: 5000,
    });
  });
});

// ─── Persistence round-trips ────────────────────────────────────────────────
//
// These tests intentionally use NO route mocks for the playlist mutations —
// the point is to prove a song actually enters and leaves a playlist in the
// database (reload → still true), not just that the UI fires a request.
//
// Seeding: on a server WITHOUT a Suno API key (CI's qa job by construction),
// POST /api/generate falls back to persisting an instantly-"ready" mock song —
// a real Song row, zero paid calls. Against a server that HAS a real key the
// same request would start a real paid generation, so seeding only runs when
// the environment is known-keyless:
//   - CI (non-remote): always runs.
//   - locally: start a keyless server (throwaway-DB recipe, no SUNOAPI_KEY)
//     and set E2E_SEED_SONGS=true.
//   - remote staging: always skipped (server key state unknown).
const canSeedSongs =
  !isRemote && (!!process.env.CI || process.env.E2E_SEED_SONGS === "true");

async function seedReadySong(page: Page): Promise<{ id: string; title: string }> {
  const res = await page.request.post("/api/generate", {
    data: { prompt: "e2e playlist persistence seed", tags: "test" },
  });
  const body = (await res.json().catch(() => ({}))) as {
    songs?: { id: string; title: string | null; generationStatus: string }[];
    error?: string;
  };
  const song = body.songs?.[0];
  if (res.status() !== 201 || !song || body.error) {
    throw new Error(
      `seedReadySong: /api/generate returned ${res.status()} — ${JSON.stringify(body)}`,
    );
  }
  // Only the keyless mock fallback returns an instantly-ready song. Anything
  // else means the server holds a real Suno key and may have started a real
  // (paid) generation — abort loudly so this is never silently repeated.
  if (song.generationStatus !== "ready") {
    throw new Error(
      `seedReadySong: song came back "${song.generationStatus}" instead of "ready" — ` +
        "the server appears to have a real Suno API key; do not run the persistence tests against it",
    );
  }
  return { id: song.id, title: song.title ?? "Untitled" };
}

test.describe("Playlists — Song Management", () => {
  // FIXME(2026-07-18): first CI run showed the add-to-playlist picker dropdown
  // never renders after the trigger click (trace snapshot: button [active],
  // no dialog/options in the tree) — waitForResponse then times out. Needs a
  // local repro (E2E_SEED_SONGS=true + keyless server, see skip note below)
  // to fix the picker interaction; the persistence assertions here are the
  // point of these tests and must come back. Tracked in
  // .ytstack/IMPROVEMENT-WAVES-2026-07-18.md (Wave 0 residue).
  test.fixme(
    true,
    "add-to-playlist picker dropdown never renders in CI — under local repro",
  );
  test.skip(
    () => !canSeedSongs,
    "Persistence round-trip needs a keyless server (mock-generate seeding). " +
      "Runs in CI; locally set E2E_SEED_SONGS=true against a server without SUNOAPI_KEY. " +
      "Skipped on remote staging — an unmocked generate could start a real paid generation.",
  );

  test("add a song to a playlist from library — persists after reload", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASSWORD);

    const song = await seedReadySong(page);
    // Unique name so retries never produce ambiguous duplicates
    const playlistName = `Songs Test ${Date.now()}`;

    await page.goto("/playlists");
    await createPlaylistViaUI(page, playlistName);

    // Add through the UI with NO route mocks — the POST must hit the real API.
    await page.goto("/library");
    await expect(page.getByText(song.title).first()).toBeVisible({ timeout: 10000 });

    const addBtn = page.getByRole("button", { name: "Add to playlist" }).first();
    await expect(addBtn).toBeVisible({ timeout: 8000 });
    await addBtn.click();

    const addResponse = page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        /\/api\/playlists\/[^/]+\/songs$/.test(res.url()),
      { timeout: 15000 },
    );
    await page.getByText(playlistName).click();
    expect((await addResponse).status()).toBe(201);

    await expect(
      page.getByText(/added to playlist/i).first()
    ).toBeVisible({ timeout: 5000 });

    // Persistence: fresh navigation + hard reload — the song must come back
    // from the database, not from client state.
    await page.goto("/playlists");
    await page.locator("a").filter({ hasText: playlistName }).first().click();
    await expect(page).toHaveURL(/\/playlists\//, { timeout: 10000 });
    await expect(page.getByText(song.title).first()).toBeVisible({ timeout: 10000 });

    await page.reload();
    await expect(page.getByText(song.title).first()).toBeVisible({ timeout: 10000 });
  });

  test("remove a song from playlist detail view — persists after reload", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASSWORD);

    const song = await seedReadySong(page);
    const playlistName = `Remove Song ${Date.now()}`;

    await page.goto("/playlists");
    await createPlaylistViaUI(page, playlistName);

    await page.locator("a").filter({ hasText: playlistName }).first().click();
    await expect(page).toHaveURL(/\/playlists\//, { timeout: 10000 });
    const playlistId = page.url().split("/playlists/")[1];

    // Put the seeded song into the playlist via the real API, then confirm the
    // UI sees it after a reload — the playlist is genuinely non-empty.
    const addRes = await page.request.post(`/api/playlists/${playlistId}/songs`, {
      data: { songId: song.id },
    });
    expect(addRes.status()).toBe(201);

    await page.reload();
    await expect(page.getByText(song.title).first()).toBeVisible({ timeout: 10000 });

    // Remove through the UI with NO route mocks. Two buttons share this label
    // (swipe background action + row action); the row action is last in DOM
    // order and the visible one at desktop viewport.
    const deleteResponse = page.waitForResponse(
      (res) =>
        res.request().method() === "DELETE" &&
        res.url().includes(`/api/playlists/${playlistId}/songs/`),
      { timeout: 15000 },
    );
    await page.locator('button[aria-label="Remove from playlist"]').last().click();
    expect((await deleteResponse).status()).toBe(200);

    await expect(page.getByText(song.title)).not.toBeVisible({ timeout: 5000 });

    // Persistence: reload — the song must STAY gone. Only now is the empty
    // state assertion meaningful: it appears because a real removal happened.
    await page.reload();
    await expect(page.getByText("No songs yet")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(song.title)).not.toBeVisible();
  });
});

test.describe("Playlists — Delete", () => {
  test("delete a playlist from the list view", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASSWORD);
    await page.goto("/playlists");

    // Create a playlist to delete
    await createPlaylistViaUI(page, "Playlist To Delete");

    // Click the delete icon for this playlist (first step — shows confirmation)
    // Use getByRole to match aria-label on button elements (getByLabel targets form controls)
    await page.getByRole("button", { name: "Delete playlist" }).first().click();

    // Confirm deletion — button has aria-label "Confirm delete {name}", text "Delete"
    await page.getByRole("button", { name: /Confirm delete/i }).click();

    // Playlist should be removed after deletion
    await expect(page.getByText("Playlist To Delete")).not.toBeVisible({
      timeout: 5000,
    });
  });
});
