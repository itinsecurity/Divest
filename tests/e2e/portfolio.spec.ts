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

test("portfolio page shows the three spread views", async ({ page }) => {
  await login(page);
  await page.goto("/portfolio");

  await expect(page.getByRole("heading", { name: "Portfolio" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Stock / Interest Balance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sector Spread" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Geographic Spread" })).toBeVisible();
});

test("portfolio page with seeded COMPLETE holdings does not show all-NOT_FOUND warning", async ({
  page,
}) => {
  await login(page);
  await page.goto("/portfolio");

  // The seeded holdings have COMPLETE status, so this warning should not appear
  await expect(
    page.getByText("None of your holdings have been enriched")
  ).not.toBeVisible();
});

test("portfolio page unauthenticated redirects to login", async ({ page }) => {
  await page.goto("/portfolio");
  await expect(page).toHaveURL(/\/login/);
});
