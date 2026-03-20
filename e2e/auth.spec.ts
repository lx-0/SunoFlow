import { test, expect } from "@playwright/test";

const TEST_USER = {
  name: "E2E Test User",
  email: `e2e-auth-${Date.now()}@test.local`,
  password: "TestPass123!",
};

// Helper: register a user via API and return the response
async function registerUser(
  baseURL: string,
  user: { name: string; email: string; password: string }
) {
  const res = await fetch(`${baseURL}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  return res;
}

test.describe("Register", () => {
  test("happy path — register and redirect to authenticated page", async ({
    page,
    baseURL,
  }) => {
    const uniqueEmail = `e2e-reg-${Date.now()}@test.local`;

    await page.goto("/register");

    await expect(page.locator("h1")).toContainText("SunoFlow");
    await expect(page.getByText("Create your account")).toBeVisible();

    await page.getByLabel("Name").fill("New User");
    await page.getByLabel("Email").fill(uniqueEmail);
    await page.getByLabel("Password").fill("ValidPass123!");
    await page.getByRole("button", { name: "Create account" }).click();

    // After register + auto-login, should redirect to home (which may redirect
    // to an authenticated page like / or /generate)
    await expect(page).not.toHaveURL(/\/register/);
    await page.waitForURL("**/*", { timeout: 10000 });
    // Should not be on login page either (auto sign-in happened)
    expect(page.url()).not.toContain("/login");
  });

  test("duplicate email — shows error message", async ({
    page,
    baseURL,
  }) => {
    // Seed a user via API first
    const email = `e2e-dup-${Date.now()}@test.local`;
    const res = await registerUser(baseURL!, {
      name: "Existing",
      email,
      password: "ExistingPass1!",
    });
    expect(res.status).toBe(201);

    // Try to register with the same email
    await page.goto("/register");
    await page.getByLabel("Name").fill("Duplicate User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("AnotherPass1!");
    await page.getByRole("button", { name: "Create account" }).click();

    // Should display error about email already registered
    await expect(
      page.locator("text=Email already registered")
    ).toBeVisible({ timeout: 5000 });

    // Should stay on register page
    await expect(page).toHaveURL(/\/register/);
  });

  test("validation — submit with empty email shows browser validation", async ({
    page,
  }) => {
    await page.goto("/register");

    // Fill only password, leave email empty
    await page.getByLabel("Password").fill("ValidPass123!");
    await page.getByRole("button", { name: "Create account" }).click();

    // HTML5 required validation should prevent submission — still on register
    await expect(page).toHaveURL(/\/register/);
  });

  test("validation — short password prevented by minLength", async ({
    page,
  }) => {
    await page.goto("/register");

    await page.getByLabel("Email").fill(`e2e-short-${Date.now()}@test.local`);
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();

    // HTML5 minLength=8 validation prevents submission — still on register
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe("Login", () => {
  let seededEmail: string;
  const seededPassword = "SeededPass123!";

  test.beforeAll(async ({ baseURL }) => {
    // Seed a user for login tests
    seededEmail = `e2e-login-${Date.now()}@test.local`;
    const res = await registerUser(baseURL ?? "http://localhost:3000", {
      name: "Login Test User",
      email: seededEmail,
      password: seededPassword,
    });
    if (res.status !== 201) {
      throw new Error(
        `Failed to seed login user: ${res.status} ${await res.text()}`
      );
    }
  });

  test("happy path — login with valid credentials", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("h1")).toContainText("SunoFlow");
    await expect(page.getByText("Sign in to your music manager")).toBeVisible();

    await page.getByLabel("Email").fill(seededEmail);
    await page.getByLabel("Password").fill(seededPassword);
    await page.getByRole("button", { name: "Sign in" }).click();

    // Should redirect away from login to an authenticated page
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
    expect(page.url()).not.toContain("/register");
  });

  test("invalid credentials — shows error message", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill(seededEmail);
    await page.getByLabel("Password").fill("WrongPassword99!");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.locator("text=Invalid email or password")
    ).toBeVisible({ timeout: 5000 });

    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });
});
