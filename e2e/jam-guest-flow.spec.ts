import { test, expect } from "@playwright/test";
import { DEFAULT_PASSWORD, isRemote, loginViaUI, uniqueEmail } from "./helpers";

/**
 * Full-path jam flow across TWO browser contexts (host console + guest page).
 * The guest PUSHES A PROMPT against an OPEN session, so this file only runs
 * when the server is explicitly keyless (instant mock-ready songs, no
 * credits). Opt-in:
 *
 *   SUNOAPI_KEY="" PLAYWRIGHT_TEST=true pnpm start   # keyless server
 *   JAM_KEYLESS_E2E=1 npx playwright test e2e/jam-guest-flow.spec.ts
 *
 * Without JAM_KEYLESS_E2E the file skips — a default run against a server
 * carrying a real SUNOAPI_KEY would burn generation credits.
 */

test.skip(
  isRemote || process.env.JAM_KEYLESS_E2E !== "1",
  "opt-in: requires a keyless PLAYWRIGHT_TEST server (JAM_KEYLESS_E2E=1)",
);

test("guest pushes a prompt; both contexts see it land in the queue", async ({
  browser,
  request,
}) => {
  const email = uniqueEmail("jamflow");
  const reg = await request.post("/api/register", {
    data: { name: "Flow Host", email, password: DEFAULT_PASSWORD },
  });
  expect(reg.status()).toBe(201);
  const grant = await request.post("/api/test/grant-tier", {
    data: { email, tier: "studio" },
  });
  expect(grant.ok()).toBe(true);

  // Host context: create the session through the UI and open the console.
  const hostCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  const hostErrors: Error[] = [];
  host.on("pageerror", (e) => hostErrors.push(e));
  await loginViaUI(host, email, DEFAULT_PASSWORD);
  await host.goto("/playlists");
  await host.getByRole("button", { name: "Jam" }).click();
  await host.getByLabel("Song budget").fill("5");
  await host.getByRole("button", { name: "Start jam session" }).click();
  await host.waitForURL(/\/party\//, { timeout: 15000 });
  const joinUrl = (await host.getByTestId("jam-join-url").textContent())?.trim() ?? "";
  const token = joinUrl.split("/jam/")[1];

  // Guest context: no cookies, mobile viewport, joins via the token URL.
  const guestCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const guest = await guestCtx.newPage();
  const guestErrors: Error[] = [];
  guest.on("pageerror", (e) => guestErrors.push(e));
  await guest.goto(`/jam/${token}`);
  await expect(guest.getByText("songs left")).toBeVisible({ timeout: 15000 });

  await guest.getByLabel("Your name").fill("Ken");
  await guest.getByLabel("Song request").fill("italo disco about cold pizza");
  await guest.getByRole("button", { name: "Send request" }).click();

  // Guest sees the card immediately (server-returned entry).
  await expect(guest.getByText("Requests (1)")).toBeVisible({ timeout: 15000 });
  await expect(guest.getByText("italo disco about cold pizza")).toBeVisible();
  await expect(guest.getByText(/Ken/)).toBeVisible();

  // Host console picks it up within one poll cycle; keyless mode means the
  // entry is instantly ready and the auto-enqueue toast fires.
  await expect(host.getByText("italo disco about cold pizza")).toBeVisible({
    timeout: 15000,
  });
  await expect(host.getByText(/Added to queue/)).toBeVisible({ timeout: 15000 });

  // The completed song is a member of the session playlist (guest state
  // reports it ready with a song card).
  const state = await (await request.get(`/api/jam/${token}`)).json();
  expect(state.entries).toHaveLength(1);
  expect(state.entries[0].status).toBe("ready");
  expect(state.entries[0].song?.id).toBeTruthy();
  expect(state.session.budgetUsed).toBe(1);

  expect(hostErrors.map((e) => e.message), "host pageerrors").toEqual([]);
  expect(guestErrors.map((e) => e.message), "guest pageerrors").toEqual([]);

  await hostCtx.close();
  await guestCtx.close();
});
