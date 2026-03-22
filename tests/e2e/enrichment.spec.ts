import { test, expect } from "@playwright/test";

/**
 * Enrichment E2E tests.
 *
 * Relies on ENRICHMENT_TEST_MODE=true being set in the webServer env
 * (playwright.config.ts), which causes euronext.ts and storebrand.ts to
 * return hardcoded fixture responses instead of hitting live APIs.
 *
 * Stock fixture (NO0010096985):
 *   name=EQUINOR ASA, ticker=EQNR, exchange=Oslo Bors, country=Norway
 *   → PARTIAL (sector/industry not available from Euronext)
 *
 * Fund fixture (NO0010001500) — separate from seeded NO0010140502 to avoid
 * creating a second "Storebrand Global Indeks A" row in subsequent tests:
 *   name=Test Storebrand Fund, fundManager=Test Fund Manager,
 *   fundCategory=EQUITY, equityPct=80, bondPct=20
 *   → COMPLETE (all required fund fields present)
 */
test("stock enrichment: ISIN resolves to PARTIAL with ticker and exchange", async ({
  page,
}) => {
  await page.goto("/holdings");

  // Open "Add Holding" form
  await page.click('button:has-text("Add Holding")');
  await expect(
    page.getByRole("heading", { name: "Add New Holding" })
  ).toBeVisible();

  // Fill in Equinor ISIN
  await page.fill('input[name="instrumentIdentifier"]', "NO0010096985");
  await page.selectOption('select[name="instrumentType"]', "STOCK");
  await page.fill('input[name="accountName"]', "E2E Enrich Stock");
  await page.fill('input[name="shares"]', "100");
  await page.fill('input[name="pricePerShare"]', "300");

  await page.click('button[type="submit"]:has-text("Add Holding")');

  // Wait for form to close
  await expect(
    page.getByRole("heading", { name: "Add New Holding" })
  ).not.toBeVisible();

  // Click on the new row — use the unique account name since the profile name
  // may have already been populated by the time the page re-renders.
  const row = page.getByRole("row").filter({ hasText: "E2E Enrich Stock" });
  await expect(row).toBeVisible();
  await row.click();

  // We are now on the holding detail page — capture the URL
  await expect(page).toHaveURL(/\/holdings\/.+/);
  const holdingUrl = page.url();

  // Poll until enrichment completes (status badge no longer shows "Pending").
  // ENRICHMENT_TEST_MODE makes the enrichment fast (no real HTTP).
  await expect(async () => {
    await page.goto(holdingUrl);
    await expect(page.getByText("Pending")).not.toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30000 });

  // Assert profile fields populated by enrichment
  await expect(page.getByText("EQNR")).toBeVisible();
  await expect(page.getByText("Oslo Bors")).toBeVisible();

  // Assert status badge shows "Partial" (sector/industry absent from Euronext).
  // Use exact:true to avoid matching the upload prompt "Partial data found…"
  await expect(page.getByText("Partial", { exact: true })).toBeVisible();
});

test("fund enrichment: ISIN resolves to COMPLETE with fund manager and category", async ({
  page,
}) => {
  await page.goto("/holdings");

  // Open "Add Holding" form
  await page.click('button:has-text("Add Holding")');
  await expect(
    page.getByRole("heading", { name: "Add New Holding" })
  ).toBeVisible();

  // Use a separate ISIN fixture (NO0010001500) so this test creates a fresh
  // profile and doesn't collide with the seeded NO0010140502 profile.
  await page.fill('input[name="instrumentIdentifier"]', "NO0010001500");
  await page.selectOption('select[name="instrumentType"]', "FUND");
  await page.fill('input[name="accountName"]', "E2E Enrich Fund");
  await page.fill('input[name="currentValue"]', "50000");

  await page.click('button[type="submit"]:has-text("Add Holding")');

  // Wait for form to close
  await expect(
    page.getByRole("heading", { name: "Add New Holding" })
  ).not.toBeVisible();

  // Click on the new row — use the unique account name
  const row = page.getByRole("row").filter({ hasText: "E2E Enrich Fund" });
  await expect(row).toBeVisible();
  await row.click();

  await expect(page).toHaveURL(/\/holdings\/.+/);
  const holdingUrl = page.url();

  // Poll until enrichment completes
  await expect(async () => {
    await page.goto(holdingUrl);
    await expect(page.getByText("Pending")).not.toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30000 });

  // Assert fund profile fields populated by enrichment (from NO0010001500 fixture)
  await expect(page.getByText("Test Fund Manager")).toBeVisible();
  // exact:true avoids case-insensitive match on the "Equity %" label
  await expect(page.getByText("EQUITY", { exact: true })).toBeVisible();

  // Assert status badge shows "Complete" (all required fund fields present)
  await expect(page.getByText("Complete")).toBeVisible();
});
