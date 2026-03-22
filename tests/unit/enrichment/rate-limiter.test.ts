import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Date.now so we can control time
let mockNow = 0;
vi.spyOn(Date, "now").mockImplementation(() => mockNow);

import { waitForRateLimit, resetRateLimiter } from "@/lib/enrichment/rate-limiter";

beforeEach(() => {
  mockNow = 0;
  resetRateLimiter();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.spyOn(Date, "now").mockImplementation(() => mockNow);
});

describe("waitForRateLimit", () => {
  it("does not delay on the first call to a host", async () => {
    const delays: number[] = [];
    vi.stubGlobal("setTimeout", (fn: () => void, ms: number) => {
      delays.push(ms);
      fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    mockNow = 5000;
    await waitForRateLimit("https://live.euronext.com/en/test");
    expect(delays.length).toBe(0);

    vi.unstubAllGlobals();
  });

  it("enforces at least 1s gap between rapid successive calls to the same host", async () => {
    const delays: number[] = [];
    vi.stubGlobal("setTimeout", (fn: () => void, ms: number) => {
      delays.push(ms);
      fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    // First call at t=1000 — no delay
    mockNow = 1000;
    await waitForRateLimit("https://live.euronext.com/en/first");

    // Second call 500ms later — should trigger a ~500ms delay
    mockNow = 1500;
    await waitForRateLimit("https://live.euronext.com/en/second");
    expect(delays.length).toBe(1);
    expect(delays[0]).toBeGreaterThan(0);
    expect(delays[0]).toBeLessThanOrEqual(1000);

    vi.unstubAllGlobals();
  });

  it("tracks different hosts independently", async () => {
    const delays: number[] = [];
    vi.stubGlobal("setTimeout", (fn: () => void, ms: number) => {
      delays.push(ms);
      fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    // First call to euronext at t=0
    mockNow = 0;
    await waitForRateLimit("https://live.euronext.com/en/test");

    // Call to different host immediately — no delay expected
    mockNow = 1;
    await waitForRateLimit("https://api.fund.storebrand.no/open/test");
    expect(delays.length).toBe(0);

    vi.unstubAllGlobals();
  });
});
