import { test, expect } from "@playwright/test";
import {
  getSharedUser,
  loginViaUI,
  mockSong,
  mockSongsAPI,
  mockCreditsAPI,
  gotoLibraryWithMock,
} from "./helpers";

/**
 * Regression test for the mini-player options menu (⋮) — its close handler
 * used to call itself recursively instead of onClose(), so every menu item
 * click threw "Maximum call stack size exceeded" and the menu never closed
 * (ErrorReport entries from 2026-07-22, /library?smartFilter=favorites).
 *
 * The options menu only renders below the lg breakpoint (lg:hidden), so
 * these tests run in a tablet-sized viewport.
 */

test.use({ viewport: { width: 900, height: 900 } });

const LYRICS = "[Verse 1]\nI wanted to know the machine\nNot just the glow on the screen";

test.describe("mini-player options menu", () => {
  const pageErrors: Error[] = [];

  test.beforeEach(async ({ page }) => {
    pageErrors.length = 0;
    page.on("pageerror", (err) => pageErrors.push(err));

    const user = getSharedUser();
    await loginViaUI(page, user.email, user.password);
    await mockCreditsAPI(page);
    await mockSongsAPI(page, [
      mockSong({ title: "Options Menu Song", lyrics: LYRICS }),
    ]);
    await gotoLibraryWithMock(page);

    // Start playback so the global player (and its options menu) mounts.
    await page.getByRole("button", { name: "Play", exact: true }).first().click();
    await expect(
      page.getByRole("region", { name: "Audio player" }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("clicking Lyrics opens the panel, closes the menu, and throws no error", async ({
    page,
  }) => {
    const player = page.getByRole("region", { name: "Audio player" });

    await player.getByRole("button", { name: "More options" }).click();
    await expect(player.getByRole("menu")).toBeVisible();

    await player.getByRole("menuitem", { name: "Lyrics" }).click();

    await expect(
      page.getByRole("dialog", { name: "Song lyrics panel" }),
    ).toBeVisible();
    await expect(player.getByRole("menu")).not.toBeVisible();

    expect(
      pageErrors.map((e) => e.message),
      "no uncaught errors (recursion regression)",
    ).toEqual([]);
  });

  test("clicking outside closes the menu without errors", async ({ page }) => {
    const player = page.getByRole("region", { name: "Audio player" });

    await player.getByRole("button", { name: "More options" }).click();
    await expect(player.getByRole("menu")).toBeVisible();

    // Click far away from the menu (page heading area).
    await page.mouse.click(200, 100);
    await expect(player.getByRole("menu")).not.toBeVisible();

    expect(
      pageErrors.map((e) => e.message),
      "no uncaught errors (recursion regression)",
    ).toEqual([]);
  });
});
