import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDatabase, testPrisma } from "../helpers/db";
import { uploadDocument } from "@/actions/upload";

// Spy on global fetch to verify fire-and-forget call
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
});

function makePdfFormData(sizeBytes = 1024): FormData {
  const content = "x".repeat(sizeBytes);
  const file = new File([content], "test.pdf", { type: "application/pdf" });
  const fd = new FormData();
  fd.set("file", file);
  return fd;
}

describe("uploadDocument", () => {
  it("returns error when profile is not found", async () => {
    const fd = makePdfFormData();
    const result = await uploadDocument("nonexistent-id", fd);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("not found");
  });

  it("returns processing status for valid PDF upload", async () => {
    const profile = await testPrisma.assetProfile.create({
      data: { instrumentType: "STOCK", fieldSources: "{}" },
    });

    const fd = makePdfFormData(1024);
    const result = await uploadDocument(profile.id, fd);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.status).toBe("processing");
    expect(result.data.profileId).toBe(profile.id);
  });

  it("fires enrichment fetch after valid upload", async () => {
    const profile = await testPrisma.assetProfile.create({
      data: { instrumentType: "FUND", fieldSources: "{}" },
    });

    const fd = makePdfFormData(512);
    await uploadDocument(profile.id, fd);

    // fetch should have been called for fire-and-forget enrichment
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/enrichment"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("returns error for no file in FormData", async () => {
    const profile = await testPrisma.assetProfile.create({
      data: { instrumentType: "STOCK", fieldSources: "{}" },
    });

    const fd = new FormData(); // no file
    const result = await uploadDocument(profile.id, fd);
    expect(result.success).toBe(false);
  });
});
