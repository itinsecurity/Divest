import { describe, it, expect } from "vitest";
import {
  createHoldingSchema,
  updateHoldingSchema,
} from "@/actions/holdings";

describe("createHoldingSchema", () => {
  it("accepts a valid STOCK holding", () => {
    const result = createHoldingSchema.safeParse({
      instrumentIdentifier: "DNB",
      instrumentType: "STOCK",
      accountName: "Nordnet ASK",
      shares: 100,
      pricePerShare: 200,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid FUND holding with currentValue", () => {
    const result = createHoldingSchema.safeParse({
      instrumentIdentifier: "NO0008001872",
      instrumentType: "FUND",
      accountName: "DNB pensjonskonto",
      currentValue: 50000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing accountName", () => {
    const result = createHoldingSchema.safeParse({
      instrumentIdentifier: "DNB",
      instrumentType: "STOCK",
      shares: 100,
      pricePerShare: 200,
    });
    expect(result.success).toBe(false);
  });

  it("rejects STOCK without shares", () => {
    const result = createHoldingSchema.safeParse({
      instrumentIdentifier: "DNB",
      instrumentType: "STOCK",
      accountName: "Nordnet ASK",
      pricePerShare: 200,
    });
    expect(result.success).toBe(false);
  });

  it("rejects STOCK without pricePerShare", () => {
    const result = createHoldingSchema.safeParse({
      instrumentIdentifier: "DNB",
      instrumentType: "STOCK",
      accountName: "Nordnet ASK",
      shares: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects FUND without currentValue", () => {
    const result = createHoldingSchema.safeParse({
      instrumentIdentifier: "NO0008001872",
      instrumentType: "FUND",
      accountName: "DNB pensjonskonto",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty instrumentIdentifier", () => {
    const result = createHoldingSchema.safeParse({
      instrumentIdentifier: "",
      instrumentType: "STOCK",
      accountName: "Nordnet ASK",
      shares: 100,
      pricePerShare: 200,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty accountName", () => {
    const result = createHoldingSchema.safeParse({
      instrumentIdentifier: "DNB",
      instrumentType: "STOCK",
      accountName: "",
      shares: 100,
      pricePerShare: 200,
    });
    expect(result.success).toBe(false);
  });

  it("rejects STOCK with shares <= 0", () => {
    const result = createHoldingSchema.safeParse({
      instrumentIdentifier: "DNB",
      instrumentType: "STOCK",
      accountName: "Nordnet ASK",
      shares: 0,
      pricePerShare: 200,
    });
    expect(result.success).toBe(false);
  });

  it("rejects FUND with currentValue <= 0", () => {
    const result = createHoldingSchema.safeParse({
      instrumentIdentifier: "NO0008001872",
      instrumentType: "FUND",
      accountName: "DNB pensjonskonto",
      currentValue: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid instrumentType", () => {
    const result = createHoldingSchema.safeParse({
      instrumentIdentifier: "DNB",
      instrumentType: "ETF",
      accountName: "Nordnet ASK",
      shares: 100,
      pricePerShare: 200,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateHoldingSchema", () => {
  it("accepts a valid partial update with accountName", () => {
    const result = updateHoldingSchema.safeParse({
      accountName: "New Account",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid partial update with shares", () => {
    const result = updateHoldingSchema.safeParse({
      shares: 150,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid partial update with pricePerShare", () => {
    const result = updateHoldingSchema.safeParse({
      pricePerShare: 210,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid partial update with currentValue", () => {
    const result = updateHoldingSchema.safeParse({
      currentValue: 55000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects shares <= 0", () => {
    const result = updateHoldingSchema.safeParse({
      shares: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty accountName", () => {
    const result = updateHoldingSchema.safeParse({
      accountName: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty update object", () => {
    const result = updateHoldingSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
