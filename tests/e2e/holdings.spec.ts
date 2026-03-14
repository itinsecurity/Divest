import { test, expect } from "@playwright/test";

const TEST_USER = "testuser";
const TEST_PASSWORD = "testpassword";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill('input[id="username"]', TEST_USER);
  await page.fill('input[id="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("/holdings");
}

test("unauthenticated user is redirected to /login", async ({ page }) => {
  await page.goto("/holdings");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
});

test("login with valid credentials redirects to /holdings", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Holdings" })).toBeVisible();
});

test("login with invalid credentials shows error", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[id="username"]', "wronguser");
  await page.fill('input[id="password"]', "wrongpassword");
  await page.click('button[type="submit"]');
  await expect(page.locator("p[role='alert']")).toContainText("Invalid username or password");
});

test("holdings page displays seeded holdings", async ({ page }) => {
  await login(page);
  await expect(page.getByText("DNB Bank ASA")).toBeVisible();
  await expect(page.getByText("Storebrand Global Indeks A")).toBeVisible();
});

test("add a stock holding via the form, verify it appears with PENDING badge", async ({
  page,
}) => {
  await login(page);

  await page.click('button:has-text("Add Holding")');
  await expect(page.getByRole("heading", { name: "Add New Holding" })).toBeVisible();

  await page.fill('input[name="instrumentIdentifier"]', "EQNR");
  await page.selectOption('select[name="instrumentType"]', "STOCK");
  await page.fill('input[name="accountName"]', "Test Account");
  await page.fill('input[name="shares"]', "100");
  await page.fill('input[name="pricePerShare"]', "300");

  await page.click('button[type="submit"]:has-text("Add Holding")');

  // Form should close and new holding should appear
  await expect(page.getByRole("heading", { name: "Add New Holding" })).not.toBeVisible();
  const eqnrRow = page.getByRole("row", { name: /EQNR/ });
  await expect(eqnrRow).toBeVisible();
  await expect(eqnrRow.getByText("Pending")).toBeVisible();
});

test("add a fund holding, verify it appears with correct value and PENDING badge", async ({
  page,
}) => {
  await login(page);

  await page.click('button:has-text("Add Holding")');

  await page.fill('input[name="instrumentIdentifier"]', "GBFUND");
  await page.selectOption('select[name="instrumentType"]', "FUND");
  await page.fill('input[name="accountName"]', "Test Account");
  await page.fill('input[name="currentValue"]', "50000");

  await page.click('button[type="submit"]:has-text("Add Holding")');

  await expect(page.getByRole("heading", { name: "Add New Holding" })).not.toBeVisible();
  const gbfundRow = page.getByRole("row", { name: /GBFUND/ });
  await expect(gbfundRow).toBeVisible();
  await expect(gbfundRow.getByText("Pending")).toBeVisible();
});
