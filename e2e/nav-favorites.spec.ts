import { test, expect } from "@playwright/test";
import { DEFAULT_PASSWORD, loginViaUI, getSharedUser } from "./helpers";

const TEST_PASSWORD = DEFAULT_PASSWORD;
const testEmail = getSharedUser().email;

/**
 * Regression guard for the 2026-07-25 report: the sidebar "Favorites" item
 * pointed at /library?smartFilter=favorites. A query-only href is a same-route
 * soft navigation, so clicking it while already on /library never remounted
 * LibraryView — useLibraryFilterState seeds its reducer from useSearchParams
 * exactly once and its url-sync effect then replaced the query straight back
 * out. The click was a visible no-op, and the nav highlight stayed on Library
 * because usePathname() carries no query string.
 *
 * Favorites must stay a real route (/favorites), not a Library query preset.
 */
test.describe("Nav — Favorites is its own destination", () => {
  test("clicking Favorites while already on /library navigates away from Library", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASSWORD);

    await page.goto("/library");
    await expect(page.locator("h1").first()).toContainText("Library");

    const sidebar = page.getByRole("navigation", { name: "Primary" }).first();
    await sidebar.getByRole("link", { name: "Favorites", exact: true }).click();

    // The pathname must actually change — the old query-href left it on /library.
    await expect(page).toHaveURL(/\/favorites$/);
    // ...and the Library view must actually be gone. (/favorites renders either
    // the LibraryView with title="Favorites" or the empty state, never "Library".)
    await expect(page.getByRole("heading", { name: "Library", exact: true })).toHaveCount(0);
  });

  test("the Favorites nav item renders as the active destination on /favorites", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASSWORD);

    await page.goto("/favorites");

    const sidebar = page.getByRole("navigation", { name: "Primary" }).first();
    await expect(sidebar.getByRole("link", { name: "Favorites", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // Library must NOT steal the highlight, which is what a query-href caused.
    await expect(sidebar.getByRole("link", { name: "Library", exact: true })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
