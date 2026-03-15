import { test, expect } from "@playwright/test";

test("portfolio page shows the three spread views", async ({ page }) => {
  await page.goto("/portfolio");

  await expect(page.getByRole("heading", { name: "Portfolio" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Stock / Interest Balance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sector Spread" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Geographic Spread" })).toBeVisible();
});

test("portfolio page with seeded COMPLETE holdings does not show all-NOT_FOUND warning", async ({
  page,
}) => {
  await page.goto("/portfolio");

  await expect(
    page.getByText("None of your holdings have been enriched")
  ).not.toBeVisible();
});

test("portfolio page unauthenticated redirects to login", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/portfolio");
  await expect(page).toHaveURL(/\/login/);
});
