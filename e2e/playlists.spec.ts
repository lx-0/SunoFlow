import { test, expect } from "@playwright/test";
import {
  uniqueEmail,
  DEFAULT_PASSWORD,
  registerUser,
  loginViaUI,
  mockSong,
  mockPlaylist,
} from "./helpers";

const TEST_PASSWORD = DEFAULT_PASSWORD;
let testEmail: string;

test.beforeAll(async ({ baseURL }) => {
  testEmail = uniqueEmail("playlists");
  await registerUser(baseURL ?? "http://localhost:3200", {
    name: "Playlist Tester",
    email: testEmail,
    password: TEST_PASSWORD,
  });
});

// ─── Playlist CRUD ──────────────────────────────────────────────────────────

test.describe("Playlists — List & Create", () => {
  test("playlists page renders with empty state", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASSWORD);
    await page.goto("/playlists");

    await expect(page.locator("h1")).toContainText("Playlists");
    await expect(
      page.getByText("No playlists yet. Create one to organize your songs.")
    ).toBeVisible({ timeout: 5000 });
  });

  test("create a new playlist via the form", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASSWORD);
    await page.goto("/playlists");

    // Click "New" button
    await page.getByRole("button", { name: "New" }).click();

    // Fill form
    await page.getByPlaceholder("Playlist name").fill("My First Playlist");
    await page
      .getByPlaceholder("Description (optional)")
      .fill("A test playlist");

    // Submit
    await page.getByRole("button", { name: "Create" }).click();

    // Should show the new playlist in the list
    await expect(page.getByText("My First Playlist")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("A test playlist")).toBeVisible();
  });

  test("create form requires playlist name", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASSWORD);
    await page.goto("/playlists");

    await page.getByRole("button", { name: "New" }).click();

    // Create button should be disabled when name is empty
    const createBtn = page.getByRole("button", { name: "Create" });
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
    await page.getByRole("button", { name: "New" }).click();
    await page.getByPlaceholder("Playlist name").fill("Detail Test Playlist");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Detail Test Playlist")).toBeVisible({
      timeout: 5000,
    });

    // Navigate to it
    await page.getByText("Detail Test Playlist").click();
    await expect(page).toHaveURL(/\/playlists\//, { timeout: 5000 });

    // Should show empty state
    await expect(
      page.getByText("No songs in this playlist yet.")
    ).toBeVisible({ timeout: 5000 });
  });

  test("edit playlist name and description", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASSWORD);
    await page.goto("/playlists");

    // Create a playlist
    await page.getByRole("button", { name: "New" }).click();
    await page.getByPlaceholder("Playlist name").fill("Editable Playlist");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Editable Playlist")).toBeVisible({
      timeout: 5000,
    });

    // Navigate to detail
    await page.getByText("Editable Playlist").click();
    await expect(page).toHaveURL(/\/playlists\//, { timeout: 5000 });

    // Click edit button
    await page.getByLabel("Edit playlist").click();

    // Clear and type new name
    const nameInput = page.locator("input[maxlength='100']").first();
    await nameInput.clear();
    await nameInput.fill("Renamed Playlist");

    await page.getByRole("button", { name: "Save" }).click();

    // Verify new name is displayed
    await expect(page.locator("h1")).toContainText("Renamed Playlist", {
      timeout: 5000,
    });
  });
});

test.describe("Playlists — Delete", () => {
  test("delete a playlist from the list view", async ({ page }) => {
    await loginViaUI(page, testEmail, TEST_PASSWORD);
    await page.goto("/playlists");

    // Create a playlist to delete
    await page.getByRole("button", { name: "New" }).click();
    await page.getByPlaceholder("Playlist name").fill("Playlist To Delete");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Playlist To Delete")).toBeVisible({
      timeout: 5000,
    });

    // Click the delete button for this playlist
    await page.getByLabel("Delete playlist").first().click();

    // Playlist should be removed (or confirmation followed by removal)
    await expect(page.getByText("Playlist To Delete")).not.toBeVisible({
      timeout: 5000,
    });
  });
});
