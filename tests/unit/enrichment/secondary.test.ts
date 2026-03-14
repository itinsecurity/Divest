import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildExtractionInput, AIProfileExtractionSchema } from "@/lib/enrichment/secondary";

// Mock unpdf
vi.mock("unpdf", () => ({
  extractText: vi.fn(),
}));

describe("buildExtractionInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts text from PDF and returns text input", async () => {
    const { extractText } = await import("unpdf");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(extractText).mockResolvedValueOnce({ text: "Fund prospectus content", totalPages: 1 } as any);

    const buffer = Buffer.from("fake-pdf-bytes");
    const result = await buildExtractionInput(buffer, "application/pdf");

    expect(result.text).toBe("Fund prospectus content");
    expect(result.mimeType).toBe("application/pdf");
    expect(result.fileBase64).toBeUndefined();
  });

  it("falls back to base64 when PDF text extraction fails", async () => {
    const { extractText } = await import("unpdf");
    vi.mocked(extractText).mockRejectedValueOnce(new Error("PDF parse error"));

    const buffer = Buffer.from("fake-pdf-bytes");
    const result = await buildExtractionInput(buffer, "application/pdf");

    expect(result.fileBase64).toBeDefined();
    expect(result.text).toBeUndefined();
    expect(result.mimeType).toBe("application/pdf");
  });

  it("falls back to base64 when PDF text is empty", async () => {
    const { extractText } = await import("unpdf");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(extractText).mockResolvedValueOnce({ text: "   ", totalPages: 1 } as any); // unpdf type mismatch

    const buffer = Buffer.from("fake-pdf-bytes");
    const result = await buildExtractionInput(buffer, "application/pdf");

    expect(result.fileBase64).toBeDefined();
    expect(result.mimeType).toBe("application/pdf");
  });

  it("encodes images as base64", async () => {
    const buffer = Buffer.from("fake-image-bytes");
    const result = await buildExtractionInput(buffer, "image/png");

    expect(result.fileBase64).toBe(buffer.toString("base64"));
    expect(result.mimeType).toBe("image/png");
    expect(result.text).toBeUndefined();
  });

  it("returns text directly for plain text files", async () => {
    const content = "Fund name: Test Fund\nISIN: NO0001234567";
    const buffer = Buffer.from(content);
    const result = await buildExtractionInput(buffer, "text/plain");

    expect(result.text).toBe(content);
    expect(result.mimeType).toBe("text/plain");
    expect(result.fileBase64).toBeUndefined();
  });

  it("returns text directly for CSV files", async () => {
    const content = "name,isin\nTest Fund,NO0001234567";
    const buffer = Buffer.from(content);
    const result = await buildExtractionInput(buffer, "text/csv");

    expect(result.text).toBe(content);
    expect(result.mimeType).toBe("text/csv");
  });

  it("returns text directly for markdown files", async () => {
    const content = "# Fund Report\n\nISIN: NO0001234567";
    const buffer = Buffer.from(content);
    const result = await buildExtractionInput(buffer, "text/markdown");

    expect(result.text).toBe(content);
    expect(result.mimeType).toBe("text/markdown");
  });
});

describe("AIProfileExtractionSchema", () => {
  it("validates valid AI output", () => {
    const result = AIProfileExtractionSchema.safeParse({
      name: "DNB Global Index",
      isin: "NO0001234567",
      fundCategory: "EQUITY",
      equityPct: 95,
      sectorWeightings: { Technology: 25, Financials: 20 },
    });
    expect(result.success).toBe(true);
  });

  it("accepts partial data", () => {
    const result = AIProfileExtractionSchema.safeParse({ name: "Some Fund" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid fundCategory", () => {
    const result = AIProfileExtractionSchema.safeParse({ fundCategory: "INVALID" });
    expect(result.success).toBe(false);
  });

  it("rejects equityPct > 100", () => {
    const result = AIProfileExtractionSchema.safeParse({ equityPct: 110 });
    expect(result.success).toBe(false);
  });

  it("accepts empty object", () => {
    const result = AIProfileExtractionSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
