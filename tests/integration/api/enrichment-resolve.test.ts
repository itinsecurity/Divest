import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDatabase, testPrisma } from "../helpers/db";
import { POST } from "@/app/api/enrichment/resolve/route";

// Mock the auth — factory must not reference outer variables (hoisting)
vi.mock("@/auth", () => ({
  auth: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock the enrichment queue
vi.mock("@/lib/enrichment/queue", () => ({
  enrichmentQueue: { enqueue: vi.fn() },
}));

import { auth } from "@/auth";
import { enrichmentQueue } from "@/lib/enrichment/queue";

const mockAuth = vi.mocked(auth);
const mockEnqueue = vi.mocked(enrichmentQueue.enqueue);

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/enrichment/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function seedNeedsInputProfile() {
  const profile = await testPrisma.assetProfile.create({
    data: { instrumentType: "STOCK", fieldSources: "{}" },
  });
  const holding = await testPrisma.holding.create({
    data: {
      instrumentIdentifier: "STO",
      instrumentType: "STOCK",
      accountName: "Test",
      enrichmentStatus: "NEEDS_INPUT",
      assetProfileId: profile.id,
      lastUpdated: new Date(),
    },
  });
  const candidate1 = await testPrisma.enrichmentCandidate.create({
    data: {
      assetProfileId: profile.id,
      name: "STOREBRAND ASA",
      ticker: "STB",
      isin: "NO0001234567",
      exchange: "Oslo Bors",
      instrumentType: "STOCK",
      sourceId: "euronext",
      rawData: JSON.stringify({
        name: "STOREBRAND ASA",
        ticker: "STB",
        isin: "NO0001234567",
        exchange: "Oslo Bors",
      }),
      score: 20,
    },
  });
  const candidate2 = await testPrisma.enrichmentCandidate.create({
    data: {
      assetProfileId: profile.id,
      name: "STOREBRAND AB",
      ticker: "STB2",
      isin: "SE0001234567",
      exchange: "Stockholm",
      instrumentType: "STOCK",
      sourceId: "euronext",
      rawData: JSON.stringify({
        name: "STOREBRAND AB",
        ticker: "STB2",
        isin: "SE0001234567",
        exchange: "Stockholm",
      }),
      score: 20,
    },
  });
  return { profile, holding, candidate1, candidate2 };
}

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
  // Default: authenticated session
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockAuth.mockResolvedValue({ user: { id: "1", name: "testuser" } } as any);
});

describe("POST /api/enrichment/resolve", () => {
  it("returns 401 when unauthenticated", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValue(null as any);
    const req = makeRequest({ assetProfileId: "any", candidateId: "any" });
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new Request("http://localhost:3000/api/enrichment/resolve", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 when candidateId is missing", async () => {
    const req = makeRequest({ assetProfileId: "some-id" });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 404 when candidateId does not belong to the assetProfileId", async () => {
    const { candidate1 } = await seedNeedsInputProfile();
    // Create another profile and try to use candidate from a different profile
    const otherProfile = await testPrisma.assetProfile.create({
      data: { instrumentType: "STOCK", fieldSources: "{}" },
    });
    const req = makeRequest({
      assetProfileId: otherProfile.id,
      candidateId: candidate1.id,
    });
    const response = await POST(req);
    expect(response.status).toBe(404);
  });

  it("returns 202 and applies candidate data to the profile", async () => {
    const { profile, candidate1 } = await seedNeedsInputProfile();

    const req = makeRequest({
      assetProfileId: profile.id,
      candidateId: candidate1.id,
    });
    const response = await POST(req);

    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.status).toBe("accepted");

    const updatedProfile = await testPrisma.assetProfile.findUnique({
      where: { id: profile.id },
    });
    expect(updatedProfile?.name).toBe("STOREBRAND ASA");
    expect(updatedProfile?.ticker).toBe("STB");
    expect(updatedProfile?.isin).toBe("NO0001234567");
    expect(updatedProfile?.exchange).toBe("Oslo Bors");
  });

  it("deletes all candidates for the profile after selection", async () => {
    const { profile, candidate1 } = await seedNeedsInputProfile();

    const req = makeRequest({
      assetProfileId: profile.id,
      candidateId: candidate1.id,
    });
    await POST(req);

    const remaining = await testPrisma.enrichmentCandidate.findMany({
      where: { assetProfileId: profile.id },
    });
    expect(remaining).toHaveLength(0);
  });

  it("sets holding enrichmentStatus back to PENDING after selection", async () => {
    const { profile, holding, candidate1 } = await seedNeedsInputProfile();

    const req = makeRequest({
      assetProfileId: profile.id,
      candidateId: candidate1.id,
    });
    await POST(req);

    const updatedHolding = await testPrisma.holding.findUnique({
      where: { id: holding.id },
    });
    expect(updatedHolding?.enrichmentStatus).toBe("PENDING");
  });

  it("enqueues primary enrichment after selection", async () => {
    const { profile, candidate1 } = await seedNeedsInputProfile();

    const req = makeRequest({
      assetProfileId: profile.id,
      candidateId: candidate1.id,
    });
    await POST(req);

    expect(mockEnqueue).toHaveBeenCalledWith(profile.id, "primary");
  });
});
