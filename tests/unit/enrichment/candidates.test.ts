import { describe, it, expect } from "vitest";
import { scoreCandidate, shouldAutoSelect } from "@/lib/enrichment/candidates";
import type { CandidateData } from "@/lib/enrichment/sources/registry";
import type { IdentifierInfo } from "@/lib/enrichment/normalizer";

function makeCandidate(overrides: Partial<CandidateData> = {}): CandidateData {
  return {
    name: "Test Company",
    ticker: null,
    isin: null,
    exchange: null,
    instrumentType: "STOCK",
    sourceId: "euronext",
    rawData: {},
    score: 0,
    ...overrides,
  };
}

function makeIdentifier(
  normalized: string,
  detectedType: IdentifierInfo["detectedType"] = "NAME"
): IdentifierInfo {
  return { raw: normalized, normalized, detectedType };
}

describe("scoreCandidate", () => {
  it("scores 100 for exact ISIN match", () => {
    const candidate = makeCandidate({ isin: "NO0010096985" });
    const identifier = makeIdentifier("NO0010096985", "ISIN");
    expect(scoreCandidate(candidate, identifier)).toBe(100);
  });

  it("scores 80 for exact ticker match (case-insensitive)", () => {
    const candidate = makeCandidate({ ticker: "EQNR" });
    const identifier = makeIdentifier("eqnr", "TICKER");
    expect(scoreCandidate(candidate, identifier)).toBe(80);
  });

  it("scores 60 for exact name match (case-insensitive)", () => {
    const candidate = makeCandidate({ name: "Equinor ASA" });
    const identifier = makeIdentifier("equinor asa", "NAME");
    expect(scoreCandidate(candidate, identifier)).toBe(60);
  });

  it("scores 20 for partial name match", () => {
    const candidate = makeCandidate({ name: "Equinor ASA" });
    const identifier = makeIdentifier("equinor", "NAME");
    expect(scoreCandidate(candidate, identifier)).toBe(20);
  });

  it("scores 0 for no match", () => {
    const candidate = makeCandidate({ name: "Storebrand ASA", ticker: "STB" });
    const identifier = makeIdentifier("equinor", "NAME");
    expect(scoreCandidate(candidate, identifier)).toBe(0);
  });
});

describe("shouldAutoSelect", () => {
  it("returns the single candidate when only one exists", () => {
    const candidate = { ...makeCandidate({ isin: "NO0010096985" }), score: 100 };
    const result = shouldAutoSelect([candidate]);
    expect(result).toEqual(candidate);
  });

  it("auto-selects when score gap is >= 40", () => {
    const top = { ...makeCandidate({ isin: "NO0010096985" }), score: 100 };
    const second = { ...makeCandidate({ name: "Equinor AB" }), score: 20 };
    const result = shouldAutoSelect([top, second]);
    expect(result).toEqual(top);
  });

  it("returns null when top two candidates have a gap < 40", () => {
    const a = { ...makeCandidate({ name: "Storebrand Aksje Norge" }), score: 60 };
    const b = { ...makeCandidate({ name: "Storebrand Global" }), score: 50 };
    const result = shouldAutoSelect([a, b]);
    expect(result).toBeNull();
  });

  it("returns null for an empty array", () => {
    expect(shouldAutoSelect([])).toBeNull();
  });

  it("sorts by score before comparing", () => {
    const low = { ...makeCandidate({ name: "Low" }), score: 10 };
    const high = { ...makeCandidate({ isin: "NO0010096985" }), score: 100 };
    // passed in wrong order — should still auto-select high
    const result = shouldAutoSelect([low, high]);
    expect(result).toEqual(high);
  });
});
