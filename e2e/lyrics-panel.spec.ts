import { test, expect, type Page } from "@playwright/test";
import {
  getSharedUser,
  loginViaUI,
  mockSong,
  mockSongsAPI,
  mockCreditsAPI,
  gotoLibraryWithMock,
} from "./helpers";

/**
 * The mini-player lyrics panel has two modes:
 *  - synced (karaoke) view when /lyrics/timestamps/sync returns line
 *    timestamps (auto-derived from Suno's word-aligned lyrics),
 *  - static text fallback when timestamps are unavailable.
 *
 * The options menu that opens the panel is lg:hidden, so these tests run
 * in a tablet-sized viewport.
 */

test.use({ viewport: { width: 900, height: 900 } });

const LINE_ONE = "I wanted to know the machine";
const LINE_TWO = "Not just the glow on the screen";
const LYRICS = `${LINE_ONE}\n${LINE_TWO}`;

async function openLyricsPanel(page: Page) {
  const user = getSharedUser();
  await loginViaUI(page, user.email, user.password);
  await mockCreditsAPI(page);
  await mockSongsAPI(page, [mockSong({ title: "Lyrics Song", lyrics: LYRICS })]);
  await gotoLibraryWithMock(page);

  await page.getByRole("button", { name: "Play", exact: true }).first().click();
  const player = page.getByRole("region", { name: "Audio player" });
  await expect(player).toBeVisible({ timeout: 10000 });

  await player.getByRole("button", { name: "More options" }).click();
  await player.getByRole("menuitem", { name: "Lyrics" }).click();

  const dialog = page.getByRole("dialog", { name: "Song lyrics panel" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test("shows the synced view with the current line highlighted", async ({
  page,
}) => {
  await page.route("**/api/songs/*/lyrics/timestamps/sync", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        timestamps: [
          { lineIndex: 0, startTime: 0 },
          { lineIndex: 1, startTime: 5 },
        ],
        source: "synced",
      }),
    }),
  );

  const dialog = await openLyricsPanel(page);

  // Lines render individually (synced view), and the first line is active
  // at currentTime 0 while the second is not.
  await expect(dialog.getByText(LINE_ONE, { exact: true })).toHaveClass(
    /text-violet-300/,
  );
  await expect(dialog.getByText(LINE_TWO, { exact: true })).not.toHaveClass(
    /text-violet-300/,
  );
});

test("falls back to the static view when timestamps are unavailable", async ({
  page,
}) => {
  // No route mock: the mocked library song does not exist in the DB, so the
  // sync endpoint 404s and the panel keeps the plain-text rendering.
  const dialog = await openLyricsPanel(page);

  const staticText = dialog.locator("p.whitespace-pre-line");
  await expect(staticText).toBeVisible();
  await expect(staticText).toContainText(LINE_ONE);
  await expect(staticText).toContainText(LINE_TWO);
});
