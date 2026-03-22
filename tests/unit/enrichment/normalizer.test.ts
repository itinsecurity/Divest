import { describe, it, expect } from "vitest";
import { normalizeIdentifier } from "@/lib/enrichment/normalizer";

describe("normalizeIdentifier", () => {
  describe("ISIN detection", () => {
    it("detects a valid ISIN", () => {
      const result = normalizeIdentifier("NO0010096985");
      expect(result.detectedType).toBe("ISIN");
      expect(result.normalized).toBe("NO0010096985");
    });

    it("uppercases a lowercase ISIN before detecting", () => {
      const result = normalizeIdentifier("no0010096985");
      expect(result.detectedType).toBe("ISIN");
      expect(result.normalized).toBe("NO0010096985");
    });

    it("trims whitespace before ISIN detection", () => {
      const result = normalizeIdentifier("  NO0010096985  ");
      expect(result.detectedType).toBe("ISIN");
      expect(result.normalized).toBe("NO0010096985");
    });

    it("rejects an ISIN with wrong length", () => {
      const result = normalizeIdentifier("NO001009698");
      expect(result.detectedType).not.toBe("ISIN");
    });

    it("rejects a string that is not an ISIN pattern", () => {
      const result = normalizeIdentifier("EQNR");
      expect(result.detectedType).not.toBe("ISIN");
    });
  });

  describe("TICKER detection", () => {
    it("detects a short uppercase ticker", () => {
      const result = normalizeIdentifier("EQNR");
      expect(result.detectedType).toBe("TICKER");
      expect(result.normalized).toBe("EQNR");
    });

    it("detects a lowercase ticker and preserves original case", () => {
      const result = normalizeIdentifier("eqnr");
      expect(result.detectedType).toBe("TICKER");
    });

    it("detects a ticker up to 6 characters with no spaces", () => {
      const result = normalizeIdentifier("AAPL");
      expect(result.detectedType).toBe("TICKER");
    });

    it("does not detect a 7+ char string as ticker", () => {
      const result = normalizeIdentifier("EQUINOR");
      expect(result.detectedType).toBe("NAME");
    });
  });

  describe("NAME detection", () => {
    it("detects a multi-word name", () => {
      const result = normalizeIdentifier("Equinor ASA");
      expect(result.detectedType).toBe("NAME");
    });

    it("detects a long single word as name", () => {
      const result = normalizeIdentifier("Storebrand");
      expect(result.detectedType).toBe("NAME");
    });

    it("collapses multiple internal spaces", () => {
      const result = normalizeIdentifier("DNB  Norge   Indeks");
      expect(result.normalized).toBe("DNB Norge Indeks");
    });
  });

  describe("whitespace handling", () => {
    it("trims leading and trailing whitespace", () => {
      const result = normalizeIdentifier("  Equinor  ");
      expect(result.normalized).toBe("Equinor");
    });

    it("preserves the raw input unchanged", () => {
      const input = "  Equinor ASA  ";
      const result = normalizeIdentifier(input);
      expect(result.raw).toBe(input);
    });
  });
});
