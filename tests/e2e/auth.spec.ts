import { expect, test, type Page } from "@playwright/test";

const adminEmail = "admin@example.com";
const adminPassword = "test-admin-password-123";
const agentEmail = "agent@example.com";
const agentPassword = "test-agent-password-123";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("blocks ticket API access without a session", async ({ request }) => {
  const response = await request.get("/api/tickets");

  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toEqual({
    error: "Authentication required"
  });
});

test("admin can sign in and access the users page", async ({ page }) => {
  await signIn(page, adminEmail, adminPassword);

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Ticket Dashboard" })).toBeVisible();
  await page.getByRole("link", { name: "Users" }).click();
  await expect(page).toHaveURL("/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Team Members" })).toBeVisible();
});

test("agent can sign in but cannot access the users page", async ({ page }) => {
  await signIn(page, agentEmail, agentPassword);

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Ticket Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);

  await page.goto("/users");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Ticket Dashboard" })).toBeVisible();
});

test("password visibility toggle reveals and hides the password", async ({ page }) => {
  await page.goto("/login");
  const passwordInput = page.locator("#password");

  await expect(passwordInput).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(passwordInput).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(passwordInput).toHaveAttribute("type", "password");
});
