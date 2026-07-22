import { test, expect, type APIRequestContext } from "@playwright/test";
import { DEFAULT_PASSWORD, isRemote, loginViaUI, uniqueEmail } from "./helpers";

/**
 * Jam-session host flow (M005). Uses the test-only /api/test/grant-tier
 * endpoint (PLAYWRIGHT_TEST servers only), so the whole file skips on
 * remote/staging runs. Deliberately NEVER pushes a guest prompt against an
 * OPEN session — a local server usually carries a real SUNOAPI_KEY and a
 * committed spec must not burn generation credits. The generative path is
 * covered by unit tests; the closed-session 409 guardrail is free.
 */

test.skip(isRemote, "grant-tier test endpoint does not exist on remote targets");

async function registerWithTier(
  request: APIRequestContext,
  email: string,
  tier: "free" | "studio",
) {
  const reg = await request.post("/api/register", {
    data: { name: "Jam E2E", email, password: DEFAULT_PASSWORD },
  });
  if (reg.status() !== 201) {
    throw new Error(`register failed: ${reg.status()} ${await reg.text()}`);
  }
  if (tier !== "free") {
    const grant = await request.post("/api/test/grant-tier", {
      data: { email, tier },
    });
    if (!grant.ok()) {
      throw new Error(`grant-tier failed: ${grant.status()}`);
    }
  }
}

test("studio host runs a session end to end (create, QR, close, guardrails)", async ({
  page,
  request,
}) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (err) => pageErrors.push(err));

  const email = uniqueEmail("jamhost");
  await registerWithTier(request, email, "studio");
  await loginViaUI(page, email, DEFAULT_PASSWORD);

  // Create via the UI entry points: /playlists Jam button routes to /party
  await page.goto("/playlists");
  await page.getByRole("button", { name: "Jam" }).click();
  await page.waitForURL(/\/party$/, { timeout: 15000 });
  await page.getByLabel("Song budget").fill("7");
  await page.getByRole("button", { name: "Start jam session" }).click();
  await page.waitForURL(/\/party\//, { timeout: 15000 });

  // Console renders budget countdown + join URL
  await expect(page.getByText("songs left")).toBeVisible({ timeout: 15000 });
  const joinUrl = (await page.getByTestId("jam-join-url").textContent())?.trim() ?? "";
  const token = joinUrl.split("/jam/")[1];
  expect(token?.length).toBeGreaterThan(10);

  // Tokened guest state endpoint is public (`request` carries no cookies)
  const stateRes = await request.get(`/api/jam/${token}`);
  expect(stateRes.status()).toBe(200);
  const state = await stateRes.json();
  expect(state.session.status).toBe("open");
  expect(state.session.budgetTotal).toBe(7);

  // QR overlay opens and closes
  await page.getByRole("button", { name: "Show QR" }).click();
  await expect(page.getByRole("img", { name: /QR code linking/ })).toBeVisible({
    timeout: 10000,
  });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("img", { name: /QR code linking/ })).not.toBeVisible();

  // End session (inline confirm) — header flips
  await page.getByRole("button", { name: "End session" }).click();
  await page.getByRole("button", { name: "Confirm end" }).click();
  await expect(page.getByText("Session ended").first()).toBeVisible({ timeout: 10000 });

  // Guardrail: pushing a prompt against a CLOSED session 409s (no Suno call,
  // no credits — safe to assert against any environment).
  const pushRes = await request.post(`/api/jam/${token}/prompts`, {
    data: {
      promptText: "too late",
      guestKey: "e2e-guest-device-01",
    },
  });
  expect(pushRes.status()).toBe(409);

  expect(pageErrors.map((e) => e.message), "no uncaught errors").toEqual([]);
});

test("free-tier users see no Jam entry point", async ({ page, request }) => {
  const email = uniqueEmail("jamfree");
  await registerWithTier(request, email, "free");
  await loginViaUI(page, email, DEFAULT_PASSWORD);

  await page.goto("/playlists");
  await expect(page.getByRole("button", { name: "New" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("button", { name: "Jam" })).toHaveCount(0);
});
