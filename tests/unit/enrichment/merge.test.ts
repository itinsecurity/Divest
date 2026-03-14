import { describe, it, expect } from "vitest";
import { mergeProfileFields } from "@/lib/enrichment/types";
import type { FieldSources } from "@/types";

describe("mergeProfileFields", () => {
  it("fills empty fields from enrichment", () => {
    const result = mergeProfileFields(
      { name: null, sector: null },
      { name: "DNB Bank", sector: "Financials" },
      {},
      "enrichment"
    );

    expect(result.fields.name).toBe("DNB Bank");
    expect(result.fields.sector).toBe("Financials");
    expect(result.fieldSources.name?.source).toBe("enrichment");
    expect(result.fieldSources.sector?.source).toBe("enrichment");
  });

  it("does not overwrite user-supplied fields", () => {
    const existingFieldSources: FieldSources = {
      sector: { source: "user", enrichedAt: "2026-01-01" },
    };

    const result = mergeProfileFields(
      { name: null, sector: "Technology" },
      { name: "DNB Bank", sector: "Financials" },
      existingFieldSources,
      "enrichment"
    );

    // name should be updated (it was null/empty)
    expect(result.fields.name).toBe("DNB Bank");
    // sector should NOT be overwritten (user-supplied)
    expect(result.fields.sector).toBeUndefined();
    expect(result.fieldSources.sector?.source).toBe("user");
  });

  it("does not overwrite enrichment-sourced fields with ai_extraction", () => {
    const existingFieldSources: FieldSources = {
      name: { source: "enrichment", enrichedAt: "2026-01-01" },
    };

    const result = mergeProfileFields(
      { name: "DNB Bank", sector: null },
      { name: "Different Name", sector: "Financials" },
      existingFieldSources,
      "ai_extraction"
    );

    // name should NOT be overwritten (enrichment > ai_extraction)
    expect(result.fields.name).toBeUndefined();
    // sector should be updated (it was null)
    expect(result.fields.sector).toBe("Financials");
    expect(result.fieldSources.sector?.source).toBe("ai_extraction");
  });

  it("enrichment can overwrite ai_extraction-sourced fields", () => {
    const existingFieldSources: FieldSources = {
      name: { source: "ai_extraction", enrichedAt: "2026-01-01" },
    };

    const result = mergeProfileFields(
      { name: "AI Name", sector: null },
      { name: "Enriched Name", sector: "Financials" },
      existingFieldSources,
      "enrichment"
    );

    // name should be overwritten (enrichment > ai_extraction)
    expect(result.fields.name).toBe("Enriched Name");
    expect(result.fieldSources.name?.source).toBe("enrichment");
  });

  it("skips null/undefined incoming values", () => {
    const result = mergeProfileFields(
      { name: null, sector: null },
      { name: null, sector: undefined },
      {},
      "enrichment"
    );

    expect(result.fields.name).toBeUndefined();
    expect(result.fields.sector).toBeUndefined();
  });

  it("preserves existing fieldSources for skipped fields", () => {
    const existingFieldSources: FieldSources = {
      name: { source: "user", enrichedAt: "2026-01-01" },
      sector: { source: "enrichment", enrichedAt: "2026-01-01" },
    };

    const result = mergeProfileFields(
      { name: "User Name", sector: "Tech" },
      { name: "New Name", sector: "New Sector" },
      existingFieldSources,
      "enrichment"
    );

    // user field preserved
    expect(result.fieldSources.name?.source).toBe("user");
    // enrichment field overwritten by enrichment (same priority - refresh scenario)
    expect(result.fieldSources.sector?.source).toBe("enrichment");
  });
});
