import { expect, test, type Page } from "@playwright/test";

const adminEmail = "admin@example.com";
const adminPassword = "test-admin-password-123";
const inboundEmailToken = "dev-inbound-email-token";

function inboundEmailPayload(overrides: Record<string, unknown> = {}) {
  return {
    from: "Student Sender <student.sender@example.com>",
    to: "support@example.com",
    subject: `Inbound email ticket ${Date.now()}`,
    text: "I need help accessing my course.",
    messageId: `<${Date.now()}-${Math.random()}@example.com>`,
    ...overrides
  };
}

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(adminEmail);
  await page.locator("#password").fill(adminPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}

test("converts an inbound support email into a ticket", async ({ page, request }) => {
  const subject = `Inbound email ticket ${Date.now()}`;

  const response = await request.post("/api/inbound-email", {
    data: inboundEmailPayload({ subject }),
    headers: {
      "x-inbound-email-token": inboundEmailToken
    }
  });

  expect(response.status()).toBe(201);
  await expect(response.json()).resolves.toMatchObject({
    data: {
      requesterEmail: "student.sender@example.com",
      status: "open",
      subject
    }
  });

  await signIn(page);
  await page.getByRole("link", { exact: true, name: "Tickets" }).click();

  await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
  const ticketRow = page
    .getByRole("article")
    .filter({ hasText: subject });
  await expect(ticketRow).toBeVisible();
  await expect(ticketRow.getByText("student.sender@example.com")).toBeVisible();
});

test("rejects inbound email webhook requests without the shared token", async ({
  request
}) => {
  const response = await request.post("/api/inbound-email", {
    data: inboundEmailPayload()
  });

  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toEqual({
    error: "Invalid inbound email token"
  });
});

test("rejects inbound email sent to a non-support address", async ({ request }) => {
  const response = await request.post("/api/inbound-email", {
    data: inboundEmailPayload({
      to: "billing@example.com"
    }),
    headers: {
      "x-inbound-email-token": inboundEmailToken
    }
  });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toEqual({
    error: "Email was not sent to the support address"
  });
});

test("deduplicates inbound email webhook retries by messageId", async ({ request }) => {
  const payload = inboundEmailPayload({
    messageId: `<dedupe-${Date.now()}@example.com>`
  });

  const firstResponse = await request.post("/api/inbound-email", {
    data: payload,
    headers: {
      "x-inbound-email-token": inboundEmailToken
    }
  });
  expect(firstResponse.status()).toBe(201);
  const firstBody = await firstResponse.json();

  const retryResponse = await request.post("/api/inbound-email", {
    data: payload,
    headers: {
      "x-inbound-email-token": inboundEmailToken
    }
  });
  expect(retryResponse.status()).toBe(200);
  await expect(retryResponse.json()).resolves.toMatchObject({
    data: {
      id: firstBody.data.id,
      subject: payload.subject
    }
  });
});
