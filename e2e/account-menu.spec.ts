import { test, expect } from "@playwright/test";
import { getSharedUser, loginViaUI } from "./helpers";

/**
 * The sidebar bottom block was consolidated from six standalone items
 * (Admin / Profile / Settings / language / Feedback / Sign out) into a
 * single account menu; the language switcher moved to Settings → Preferences.
 * Runs in the default desktop viewport (the sidebar is md+ only).
 */

test.describe("sidebar account menu", () => {
  const pageErrors: Error[] = [];

  test.beforeEach(async ({ page }) => {
    pageErrors.length = 0;
    page.on("pageerror", (err) => pageErrors.push(err));

    const user = getSharedUser();
    await loginViaUI(page, user.email, user.password);
    await page.goto("/");
  });

  test("opens with the core items and closes on outside click", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Account menu" });
    await trigger.waitFor({ state: "visible", timeout: 20000 });
    await trigger.click();

    const menu = page.getByRole("menu", { name: "Account menu" });
    await expect(menu).toBeVisible();
    for (const item of ["Profile", "Settings", "Feedback", "Sign out"]) {
      await expect(menu.getByRole("menuitem", { name: item })).toBeVisible();
    }

    // The old standalone sidebar entries are gone: the desktop sidebar has no
    // direct Profile/Settings LINKS anymore (menu entries carry role=menuitem).
    const sidebar = page.getByRole("complementary", { name: "Main navigation" });
    await expect(sidebar.getByRole("link", { name: "Profile" })).toHaveCount(0);
    await expect(sidebar.getByRole("link", { name: "Settings" })).toHaveCount(0);

    await page.mouse.click(600, 300);
    await expect(menu).not.toBeVisible();

    expect(pageErrors.map((e) => e.message), "no uncaught errors").toEqual([]);
  });

  test("signs out via the menu", async ({ page }) => {
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menu", { name: "Account menu" }).getByRole("menuitem", { name: "Sign out" }).click();

    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    expect(pageErrors.map((e) => e.message), "no uncaught errors").toEqual([]);
  });
});
