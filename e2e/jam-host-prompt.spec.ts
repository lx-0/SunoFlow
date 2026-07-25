import { test, expect, type APIRequestContext } from "@playwright/test";
import { DEFAULT_PASSWORD, isRemote, loginViaUI, uniqueEmail } from "./helpers";

test.skip(isRemote, "grant-tier test endpoint does not exist on remote targets");

async function registerStudioHost(request: APIRequestContext, email: string) {
  const reg = await request.post("/api/register", {
    data: { name: "Jam Host Prompt E2E", email, password: DEFAULT_PASSWORD },
  });
  if (reg.status() !== 201) {
    throw new Error(`register failed: ${reg.status()} ${await reg.text()}`);
  }
  const grant = await request.post("/api/test/grant-tier", {
    data: { email, tier: "studio" },
  });
  if (!grant.ok()) throw new Error(`grant-tier failed: ${grant.status()}`);
}

/**
 * The host had no way to queue a request from their own console — they had to
 * scan their own QR code and join as a guest. The composer posts to the
 * authenticated /api/jam-sessions/[id]/entries route, which skips the
 * per-guest open-prompt cap but still reserves party budget.
 */
test("host queues a prompt from the party console", async ({ page, request }) => {
  const email = uniqueEmail("jamhostprompt");
  await registerStudioHost(request, email);
  await loginViaUI(page, email, DEFAULT_PASSWORD);

  await page.goto("/party");
  await page.getByPlaceholder("Session name (optional)").fill("Host Prompt E2E");
  await page.getByRole("button", { name: "Start jam session" }).click();
  await page.waitForURL(/\/party\/[^/]+$/, { timeout: 30000 });

  const budget = page.getByText("songs left").locator("xpath=preceding-sibling::div[1]");
  const budgetBefore = await budget.textContent();

  const input = page.getByLabel("Add your own request");
  await expect(input).toBeVisible();
  await input.fill("host-authored e2e request");
  await page.getByRole("button", { name: "Queue it" }).click();

  // The server's own entry card must land in the live queue…
  await expect(page.getByText("host-authored e2e request")).toBeVisible({ timeout: 30000 });
  await expect(input).toHaveValue("");
  // …and the host's request must consume party budget like a guest's.
  await expect(budget).not.toHaveText(budgetBefore ?? "");
});
