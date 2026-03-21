import { test, expect } from "@playwright/test";

function relativeLuminance(r: number, g: number, b: number): number {
  const linearize = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(fg: string, bg: string): number {
  const parse = (color: string) => {
    const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    return m ? { r: +m[1], g: +m[2], b: +m[3] } : null;
  };
  const f = parse(fg);
  const b2 = parse(bg);
  if (!f || !b2) return 0;
  const l1 = relativeLuminance(f.r, f.g, f.b);
  const l2 = relativeLuminance(b2.r, b2.g, b2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function getInputContrast(
  locator: ReturnType<import("@playwright/test").Page["locator"]>
): Promise<number> {
  const { color, backgroundColor } = await locator.evaluate((el) => {
    const style = window.getComputedStyle(el as HTMLElement);
    return { color: style.color, backgroundColor: style.backgroundColor };
  });
  return contrastRatio(color, backgroundColor);
}

test.describe("form input text contrast — WCAG AA regression", () => {
  test.describe("login page (unauthenticated)", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("login form inputs meet WCAG AA contrast in dark OS mode", async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto("/login");
      const input = page.getByRole("textbox", { name: /username/i });
      await expect(input).toBeVisible();
      const ratio = await getInputContrast(input);
      expect(
        ratio,
        `Input contrast ratio ${ratio.toFixed(2)}:1 is below WCAG AA minimum 4.5:1`
      ).toBeGreaterThanOrEqual(4.5);
    });
  });

  test.describe("holdings page (authenticated)", () => {
    test("add-holding form inputs meet WCAG AA contrast in dark OS mode", async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto("/holdings");
      await page.getByRole("button", { name: "Add Holding" }).click();
      const input = page.locator('input[name="instrumentIdentifier"]');
      await expect(input).toBeVisible();
      const ratio = await getInputContrast(input);
      expect(
        ratio,
        `Input contrast ratio ${ratio.toFixed(2)}:1 is below WCAG AA minimum 4.5:1`
      ).toBeGreaterThanOrEqual(4.5);
    });
  });
});
