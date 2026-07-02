import { expect, test, type Page } from "@playwright/test";

const adminEmail = "admin@example.com";
const adminPassword = "test-admin-password-123";
const userPassword = "test-agent-password-123";

async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(adminEmail);
  await page.locator("#password").fill(adminPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}

async function openUsersPage(page: Page) {
  await signInAsAdmin(page);
  await page.getByRole("link", { name: "Users" }).click();
  await expect(page).toHaveURL("/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
}

async function createAgent(page: Page, name: string, email: string) {
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(userPassword);
  await page.getByRole("button", { name: "Create user" }).click();
  await expect(page.getByText("User created.")).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
}

async function openActions(page: Page, name: string) {
  await page
    .getByRole("button", { name: `Open actions for ${name}` })
    .click();
}

test.describe.serial("user management", () => {
  test("reads the seeded users list", async ({ page }) => {
    await openUsersPage(page);

    await expect(page.getByText(adminEmail)).toBeVisible();
    await expect(page.getByText("agent@example.com")).toBeVisible();
    await expect(page.getByText("You")).toBeVisible();
  });

  test("creates an agent user", async ({ page }) => {
    await openUsersPage(page);

    await createAgent(page, "E2E Create Agent", "e2e-create-agent@example.com");

    const row = page.getByText("e2e-create-agent@example.com").locator("xpath=ancestor::article");
    await expect(row.getByText("Agent", { exact: true })).toBeVisible();
    await expect(row.getByText("Active", { exact: true })).toBeVisible();
  });

  test("updates an agent user", async ({ page }) => {
    await openUsersPage(page);
    await createAgent(page, "E2E Update Agent", "e2e-update-agent@example.com");

    await openActions(page, "E2E Update Agent");
    await page.getByRole("menuitem", { name: "Edit" }).click();
    await page.getByLabel("Name").fill("E2E Updated Agent");
    await page.getByLabel("Email").fill("e2e-updated-agent@example.com");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("User updated.")).toBeVisible();
    await expect(page.getByText("E2E Updated Agent")).toBeVisible();
    await expect(page.getByText("e2e-updated-agent@example.com")).toBeVisible();
  });

  test("deletes an agent user and allows reusing the email", async ({ page }) => {
    const email = "e2e-delete-agent@example.com";
    await openUsersPage(page);
    await createAgent(page, "E2E Delete Agent", email);

    await openActions(page, "E2E Delete Agent");
    await page.getByRole("menuitem", { name: "Delete user" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Delete user?" })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Delete user" }).click();

    await expect(page.getByText("User deleted.")).toBeVisible();
    await expect(page.getByText(email)).toHaveCount(0);

    await createAgent(page, "E2E Recreated Agent", email);
    await expect(page.getByText("E2E Recreated Agent")).toBeVisible();
  });
});
