import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDatabase, testPrisma } from "../helpers/db";
import { POST } from "@/app/api/enrichment/route";

// Mock the auth to simulate authenticated session
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "1", name: "testuser" } }),
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock the enrichment queue to avoid side effects
vi.mock("@/lib/enrichment/queue", () => ({
  enrichmentQueue: {
    enqueue: vi.fn(),
  },
}));

function makeRequest(body: unknown, method = "POST"): Request {
  return new Request("http://localhost:3000/api/enrichment", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
});

describe("POST /api/enrichment", () => {
  it("returns 202 for a valid request with existing profile", async () => {
    // Create an AssetProfile first
    const profile = await testPrisma.assetProfile.create({
      data: {
        instrumentType: "STOCK",
        ticker: "DNB",
        fieldSources: "{}",
      },
    });

    const req = makeRequest({ assetProfileId: profile.id, type: "primary" });
    const response = await POST(req);

    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.status).toBe("accepted");
    expect(body.assetProfileId).toBe(profile.id);
  });

  it("returns 400 for missing assetProfileId", async () => {
    const req = makeRequest({ type: "primary" });
    const response = await POST(req);

    expect(response.status).toBe(400);
  });

  it("returns 404 for unknown assetProfileId", async () => {
    const req = makeRequest({
      assetProfileId: "nonexistent-id",
      type: "primary",
    });
    const response = await POST(req);

    expect(response.status).toBe(404);
  });

  it("enqueues work and deduplicates same profileId", async () => {
    const { enrichmentQueue } = await import("@/lib/enrichment/queue");

    const profile = await testPrisma.assetProfile.create({
      data: {
        instrumentType: "STOCK",
        ticker: "DNB",
        fieldSources: "{}",
      },
    });

    const req1 = makeRequest({ assetProfileId: profile.id, type: "primary" });
    const req2 = makeRequest({ assetProfileId: profile.id, type: "primary" });

    await POST(req1);
    await POST(req2);

    // enqueue called twice — deduplication is handled inside the queue itself
    expect(enrichmentQueue.enqueue).toHaveBeenCalledWith(profile.id, "primary", undefined);
    expect(enrichmentQueue.enqueue).toHaveBeenCalledTimes(2);
  });
});
