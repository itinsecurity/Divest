import { test, expect } from "@playwright/test";

test.describe("unauthenticated access", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated visit to / redirects to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page renders 'Sign in with GitHub' button", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("button", { name: /sign in with github/i })
    ).toBeVisible();
  });

  test("no portfolio data or navigation is visible on the login page", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByText("Holdings")).not.toBeVisible();
    await expect(page.getByText("Portfolio")).not.toBeVisible();
  });

  test("unauthenticated GET /holdings redirects to /login", async ({ page }) => {
    await page.goto("/holdings");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated GET /portfolio redirects to /login", async ({
    page,
  }) => {
    await page.goto("/portfolio");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("logout flow", () => {
  test("authenticated user can log out and is redirected to /login", async ({
    page,
  }) => {
    await page.goto("/holdings");
    await expect(page).toHaveURL(/\/holdings/);

    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("after logout, navigating to /holdings redirects to /login", async ({
    page,
  }) => {
    await page.goto("/holdings");
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/holdings");
    await expect(page).toHaveURL(/\/login/);
  });
});
