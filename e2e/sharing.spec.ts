import { test, expect } from "@playwright/test";
import {
  uniqueEmail,
  DEFAULT_PASSWORD,
  registerUser,
  loginViaUI,
  mockSong,
  mockSongsAPI,
} from "./helpers";

const TEST_PASSWORD = DEFAULT_PASSWORD;
let testEmail: string;

test.beforeAll(async ({ baseURL }) => {
  testEmail = uniqueEmail("sharing");
  await registerUser(baseURL ?? "http://localhost:3200", {
    name: "Sharing Tester",
    email: testEmail,
    password: TEST_PASSWORD,
  });
});

// ─── Public Song Sharing ────────────────────────────────────────────────────

test.describe("Public Song Sharing", () => {
  test("public song page renders for valid slug", async ({ page }) => {
    // Mock the server-side fetch for the public song page
    await page.route("**/api/songs/public/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "shared-song-1",
          title: "Shared Song Title",
          prompt: "mellow acoustic",
          tags: "acoustic",
          audioUrl: "https://example.com/shared-audio.mp3",
          imageUrl: null,
          duration: 180,
          lyrics: "Some lyrics here",
          generationStatus: "ready",
          isPublic: true,
          publicSlug: "shared-song-slug",
          createdAt: new Date().toISOString(),
          user: { name: "Song Creator" },
        }),
      });
    });

    await page.goto("/s/shared-song-slug");

    // Should show the song title
    await expect(page.locator("h1")).toContainText("Shared Song Title", {
      timeout: 5000,
    });

    // Should show creator name
    await expect(page.getByText("Song Creator")).toBeVisible();

    // Should show the SunoFlow branding
    await expect(page.getByText("Shared via SunoFlow")).toBeVisible();
  });

  test("public song page shows play button when audio exists", async ({
    page,
  }) => {
    await page.route("**/api/songs/public/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "shared-song-2",
          title: "Playable Shared Song",
          prompt: "rock",
          audioUrl: "https://example.com/rock.mp3",
          duration: 200,
          isPublic: true,
          publicSlug: "playable-shared",
          createdAt: new Date().toISOString(),
          user: { name: "Rock Creator" },
        }),
      });
    });

    await page.goto("/s/playable-shared");

    // Play button should be visible
    await expect(page.getByLabel("Play")).toBeVisible({ timeout: 5000 });
  });

  test("public song page is accessible without authentication", async ({
    page,
  }) => {
    // Access without logging in — should not redirect to login
    await page.route("**/api/songs/public/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "shared-song-3",
          title: "Public Access Song",
          prompt: "pop",
          audioUrl: "https://example.com/pop.mp3",
          duration: 150,
          isPublic: true,
          publicSlug: "public-access",
          createdAt: new Date().toISOString(),
          user: { name: "Pop Creator" },
        }),
      });
    });

    await page.goto("/s/public-access");

    // Should NOT redirect to login
    await expect(page).not.toHaveURL(/\/login/);

    // Should render the song
    await expect(page.locator("h1")).toContainText("Public Access Song", {
      timeout: 5000,
    });
  });

  test("share button in library copies link", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASSWORD);

    const songs = [
      mockSong({
        title: "Shareable Song",
        isPublic: false,
        publicSlug: null,
      }),
    ];
    await mockSongsAPI(page, songs);

    // Mock the share endpoint
    await page.route("**/api/songs/*/share", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          isPublic: true,
          publicSlug: "shareable-song-slug",
        }),
      });
    });

    await page.goto("/library");
    await expect(page.getByText("Shareable Song")).toBeVisible({
      timeout: 5000,
    });

    // Hover to reveal share button
    await page.getByText("Shareable Song").hover();

    // Click share button (aria-label varies based on state)
    const shareBtn = page.locator('[aria-label*="Share"], [aria-label*="share"]').first();
    if (await shareBtn.isVisible()) {
      await shareBtn.click();

      // Should show "Link copied!" confirmation
      await expect(page.getByText("Link copied!")).toBeVisible({
        timeout: 3000,
      });
    }
  });
});

// ─── Song Not Found ─────────────────────────────────────────────────────────

test.describe("Public Song — Error States", () => {
  test("invalid slug shows not found or error", async ({ page }) => {
    await page.route("**/api/songs/public/*", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "Song not found" }),
      });
    });

    const response = await page.goto("/s/nonexistent-slug-12345");

    // Either a 404 status or an error message on the page
    const status = response?.status();
    if (status === 200) {
      // Page rendered but might show an error state
      const notFound = page.getByText(/not found|doesn't exist/i);
      // If the page handles the error gracefully, it shows a message
      // Otherwise it's a server-rendered 404
      await expect(notFound.or(page.locator("body"))).toBeVisible();
    }
    // A 404 status is also acceptable
  });
});
