import { test, expect } from "@playwright/test";

test("unauthenticated user is redirected to /login", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/holdings");
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("button", { name: /sign in with github/i })
  ).toBeVisible();
});

test("holdings page displays seeded holdings", async ({ page }) => {
  await page.goto("/holdings");
  await expect(page.getByRole("heading", { name: "Holdings" })).toBeVisible();
  await expect(page.getByText("DNB Bank ASA")).toBeVisible();
  await expect(page.getByText("Storebrand Global Indeks A")).toBeVisible();
});

test("add a stock holding via the form, verify it appears in the table", async ({
  page,
}) => {
  await page.goto("/holdings");

  await page.click('button:has-text("Add Holding")');
  await expect(page.getByRole("heading", { name: "Add New Holding" })).toBeVisible();

  // Use a fake ticker that won't match any seeded or enrichment-test profile
  await page.fill('input[name="instrumentIdentifier"]', "NEWSTOCK999");
  await page.selectOption('select[name="instrumentType"]', "STOCK");
  await page.fill('input[name="accountName"]', "Holdings Stock Test");
  await page.fill('input[name="shares"]', "100");
  await page.fill('input[name="pricePerShare"]', "300");

  await page.click('button[type="submit"]:has-text("Add Holding")');

  await expect(page.getByRole("heading", { name: "Add New Holding" })).not.toBeVisible();
  // Find by unique account name — the row may show the identifier or a profile
  // name depending on enrichment timing, but the account is always stable.
  const newRow = page.getByRole("row").filter({ hasText: "Holdings Stock Test" });
  await expect(newRow).toBeVisible();
});

test("add a fund holding, verify it appears in the table", async ({
  page,
}) => {
  await page.goto("/holdings");

  await page.click('button:has-text("Add Holding")');

  // Use a fake identifier that won't match any seeded or enrichment-test profile
  await page.fill('input[name="instrumentIdentifier"]', "NEWFUND999");
  await page.selectOption('select[name="instrumentType"]', "FUND");
  await page.fill('input[name="accountName"]', "Holdings Fund Test");
  await page.fill('input[name="currentValue"]', "50000");

  await page.click('button[type="submit"]:has-text("Add Holding")');

  await expect(page.getByRole("heading", { name: "Add New Holding" })).not.toBeVisible();
  const newRow = page.getByRole("row").filter({ hasText: "Holdings Fund Test" });
  await expect(newRow).toBeVisible();
});
