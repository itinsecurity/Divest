import { test } from "@playwright/test";

// E2E tests require the Next.js app running at localhost:3000.
// These are stubs until the app is deployed/running in CI.

test.skip("navigate to /holdings, add stock holding, verify it appears in list with PENDING badge", async () => {});
test.skip("navigate to /holdings, add fund holding, verify it appears with correct value and PENDING badge", async () => {});
test.skip("click on a holding, edit shares, verify lastUpdated is refreshed", async () => {});
test.skip("delete a holding, verify it is removed from the list", async () => {});
