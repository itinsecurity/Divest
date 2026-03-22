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
 * Fund fixture (NO0010140502):
 *   fundManager=Storebrand Asset Management, fundCategory=EQUITY,
 *   equityPct=96.5, bondPct=3.5
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
  await page.fill('input[name="accountName"]', "E2E Test Account");
  await page.fill('input[name="shares"]', "100");
  await page.fill('input[name="pricePerShare"]', "300");

  await page.click('button[type="submit"]:has-text("Add Holding")');

  // Wait for form to close
  await expect(
    page.getByRole("heading", { name: "Add New Holding" })
  ).not.toBeVisible();

  // Click on the new row to navigate to the holding detail page.
  // The row shows the identifier (no profile name yet while PENDING).
  const row = page.getByRole("row").filter({ hasText: "NO0010096985" });
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

  // Assert status badge shows "Partial" (sector/industry absent from Euronext)
  await expect(page.getByText("Partial")).toBeVisible();
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

  // Fill in a Storebrand fund ISIN (fixture key in storebrand.ts test mode)
  await page.fill('input[name="instrumentIdentifier"]', "NO0010140502");
  await page.selectOption('select[name="instrumentType"]', "FUND");
  await page.fill('input[name="accountName"]', "E2E Test Account");
  await page.fill('input[name="currentValue"]', "50000");

  await page.click('button[type="submit"]:has-text("Add Holding")');

  // Wait for form to close
  await expect(
    page.getByRole("heading", { name: "Add New Holding" })
  ).not.toBeVisible();

  // Click on the new row
  const row = page.getByRole("row").filter({ hasText: "NO0010140502" });
  await expect(row).toBeVisible();
  await row.click();

  await expect(page).toHaveURL(/\/holdings\/.+/);
  const holdingUrl = page.url();

  // Poll until enrichment completes
  await expect(async () => {
    await page.goto(holdingUrl);
    await expect(page.getByText("Pending")).not.toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30000 });

  // Assert fund profile fields populated by enrichment
  await expect(page.getByText("Storebrand Asset Management")).toBeVisible();
  await expect(page.getByText("EQUITY")).toBeVisible();

  // Assert status badge shows "Complete" (all required fund fields present)
  await expect(page.getByText("Complete")).toBeVisible();
});
