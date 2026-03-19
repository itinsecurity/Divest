import { test, expect } from "@playwright/test";

test("holdings page renders fresh data after update without rebuild (dynamic rendering)", async ({
  page,
}) => {
  // Step 1: Add a holding with a unique account name so we can track it
  const uniqueAccount = `DynTest-${Date.now()}`;
  await page.goto("/holdings");
  await page.click('button:has-text("Add Holding")');
  await expect(page.getByRole("heading", { name: "Add New Holding" })).toBeVisible();

  await page.fill('input[name="instrumentIdentifier"]', "DYNTEST");
  await page.selectOption('select[name="instrumentType"]', "STOCK");
  await page.fill('input[name="accountName"]', uniqueAccount);
  await page.fill('input[name="shares"]', "10");
  await page.fill('input[name="pricePerShare"]', "100");
  await page.click('button[type="submit"]:has-text("Add Holding")');

  // Verify the holding appears in the list
  const holdingRow = page.getByRole("row", { name: /DYNTEST/ });
  await expect(holdingRow).toBeVisible();

  // Step 2: Navigate to the holding's detail page and update the account name
  await holdingRow.click();
  await expect(page.getByRole("heading", { name: /DYNTEST/ })).toBeVisible();

  await page.click('button:has-text("Edit")');
  const updatedAccount = uniqueAccount + "-updated";
  await page.fill('input[name="accountName"]', updatedAccount);
  await page.click('button[type="submit"]:has-text("Save Changes")');
  await expect(page.getByRole("heading", { name: "Edit" })).not.toBeVisible();

  // Step 3: Full server navigation back to /holdings — if pages were statically
  // pre-rendered the old account name would appear; force-dynamic ensures fresh data
  await page.goto("/holdings");

  // Step 4: Assert the updated account name is visible (server fetched fresh DB data)
  await expect(page.getByText(updatedAccount)).toBeVisible();
});
