import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/enrichment/rate-limiter", () => ({
  waitForRateLimit: vi.fn().mockResolvedValue(undefined),
}));

import { euronextSource } from "@/lib/enrichment/sources/euronext";
import { normalizeIdentifier } from "@/lib/enrichment/normalizer";

// Sample Euronext searchJSON response
const EQUINOR_RESPONSE = [
  {
    value: "NO0010096985",
    isin: "NO0010096985",
    mic: "XOSL",
    name: "EQUINOR",
    label:
      '<span class="instrument-name">EQUINOR</span><span class="instrument-symbol">EQNR</span>',
    link: "/en/product/equities/NO0010096985-XOSL",
  },
  // Last element is always "See all results" placeholder
  { value: "", isin: "", mic: "", name: "", label: "See all results", link: "" },
];

function mockFetch(status: number, body: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    })
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("euronextSource", () => {
  it("has correct id and supportedTypes", () => {
    expect(euronextSource.id).toBe("euronext");
    expect(euronextSource.supportedTypes).toContain("STOCK");
    expect(euronextSource.supportedTypes).not.toContain("FUND");
  });

  it("returns not_found for FUND instrument type", async () => {
    const identifier = normalizeIdentifier("DNB Norge Indeks");
    const result = await euronextSource.fetch(identifier, "FUND");
    expect(result.status).toBe("not_found");
  });

  it("sends X-Requested-With header", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await euronextSource.fetch(normalizeIdentifier("EQNR"), "STOCK");

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers["X-Requested-With"]).toBe("XMLHttpRequest");
  });

  it("returns not_found when response array is empty", async () => {
    mockFetch(200, []);
    const result = await euronextSource.fetch(
      normalizeIdentifier("ZZZNOMATCH"),
      "STOCK"
    );
    expect(result.status).toBe("not_found");
  });

  it("returns error when fetch throws a network exception", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const result = await euronextSource.fetch(
      normalizeIdentifier("EQNR"),
      "STOCK"
    );
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.retryable).toBe(true);
    }
  });

  it("parses ticker from label HTML using cheerio", async () => {
    mockFetch(200, EQUINOR_RESPONSE);
    const result = await euronextSource.fetch(
      normalizeIdentifier("NO0010096985"),
      "STOCK"
    );
    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.data.ticker).toBe("EQNR");
    }
  });

  it("maps XOSL mic to Oslo Bors exchange", async () => {
    mockFetch(200, EQUINOR_RESPONSE);
    const result = await euronextSource.fetch(
      normalizeIdentifier("NO0010096985"),
      "STOCK"
    );
    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.data.exchange).toBe("Oslo Bors");
    }
  });

  it("derives country Norway from NO ISIN prefix", async () => {
    mockFetch(200, EQUINOR_RESPONSE);
    const result = await euronextSource.fetch(
      normalizeIdentifier("NO0010096985"),
      "STOCK"
    );
    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.data.country).toBe("Norway");
    }
  });

  it("returns name and ISIN from response", async () => {
    mockFetch(200, EQUINOR_RESPONSE);
    const result = await euronextSource.fetch(
      normalizeIdentifier("NO0010096985"),
      "STOCK"
    );
    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.data.name).toBe("EQUINOR");
      expect(result.data.isin).toBe("NO0010096985");
    }
  });

  it("returns multiple candidates when there are comparably scored results", async () => {
    const ambiguousResponse = [
      {
        value: "NO0001234567",
        isin: "NO0001234567",
        mic: "XOSL",
        name: "STOREBRAND ASA",
        label:
          '<span class="instrument-name">STOREBRAND ASA</span><span class="instrument-symbol">STB</span>',
        link: "/en/product/equities/NO0001234567-XOSL",
      },
      {
        value: "SE0001234567",
        isin: "SE0001234567",
        mic: "XSTO",
        name: "STOREBRAND AB",
        label:
          '<span class="instrument-name">STOREBRAND AB</span><span class="instrument-symbol">STB2</span>',
        link: "/en/product/equities/SE0001234567-XSTO",
      },
      { value: "", isin: "", mic: "", name: "", label: "See all results", link: "" },
    ];
    mockFetch(200, ambiguousResponse);

    const result = await euronextSource.fetch(
      normalizeIdentifier("STOREBRAND"),
      "STOCK"
    );
    // Both candidates have equal partial name match scores — should be "multiple"
    expect(result.status).toBe("multiple");
  });

  it("maps MERK mic to Euronext Growth Oslo", async () => {
    const merkResponse = [
      {
        value: "NO0001111111",
        isin: "NO0001111111",
        mic: "MERK",
        name: "SMALL COMPANY",
        label:
          '<span class="instrument-name">SMALL COMPANY</span><span class="instrument-symbol">SMCO</span>',
        link: "/en/product/equities/NO0001111111-MERK",
      },
      { value: "", isin: "", mic: "", name: "", label: "See all results", link: "" },
    ];
    mockFetch(200, merkResponse);
    const result = await euronextSource.fetch(
      normalizeIdentifier("NO0001111111"),
      "STOCK"
    );
    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.data.exchange).toBe("Euronext Growth Oslo");
    }
  });
});
