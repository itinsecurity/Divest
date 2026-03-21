import { test, expect } from "@playwright/test";

function parseRgb(color: string): { r: number; g: number; b: number } | null {
  const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3] };
}

function isDark(color: string): boolean {
  const rgb = parseRgb(color);
  if (!rgb) return false;
  const brightness = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return brightness < 0.5;
}

test.describe("form input text contrast — WCAG AA regression", () => {
  test.describe("login page (unauthenticated)", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("login form inputs have dark, readable text when OS is in dark mode", async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto("/login");
      const input = page.getByRole("textbox", { name: /username/i });
      await expect(input).toBeVisible();
      const color = await input.evaluate(
        (el) => window.getComputedStyle(el).color
      );
      expect(isDark(color), `Expected dark text, got: ${color}`).toBe(true);
    });
  });

  test.describe("holdings page (authenticated)", () => {
    test("add-holding form inputs have dark, readable text when OS is in dark mode", async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto("/holdings");
      await page.getByRole("button", { name: "Add Holding" }).click();
      const input = page.locator('input[name="instrumentIdentifier"]');
      await expect(input).toBeVisible();
      const color = await input.evaluate(
        (el) => window.getComputedStyle(el).color
      );
      expect(isDark(color), `Expected dark text, got: ${color}`).toBe(true);
    });
  });
});
