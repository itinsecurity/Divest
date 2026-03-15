import { describe, it, expect, vi, beforeEach } from "vitest";
import { createQueue } from "@/lib/enrichment/queue";

// Mock the primary enrichment to avoid DB calls in unit tests
vi.mock("@/lib/enrichment/primary", () => ({
  runPrimaryEnrichment: vi.fn().mockResolvedValue(undefined),
}));

describe("enrichment queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enqueues an item and processes it", async () => {
    const { runPrimaryEnrichment } = await import("@/lib/enrichment/primary");
    const queue = createQueue();

    queue.enqueue("profile-1", "primary");

    // Wait for async processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(runPrimaryEnrichment).toHaveBeenCalledWith("profile-1");
  });

  it("deduplicates enqueue calls for the same profileId", async () => {
    const { runPrimaryEnrichment } = await import("@/lib/enrichment/primary");
    const queue = createQueue();

    queue.enqueue("profile-1", "primary");
    queue.enqueue("profile-1", "primary");
    queue.enqueue("profile-1", "primary");

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should only process once despite being enqueued multiple times
    expect(runPrimaryEnrichment).toHaveBeenCalledTimes(1);
  });

  it("processes multiple different profiles", async () => {
    const { runPrimaryEnrichment } = await import("@/lib/enrichment/primary");
    const queue = createQueue();

    queue.enqueue("profile-1", "primary");
    queue.enqueue("profile-2", "primary");

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(runPrimaryEnrichment).toHaveBeenCalledWith("profile-1");
    expect(runPrimaryEnrichment).toHaveBeenCalledWith("profile-2");
  });

  it("allows re-enqueue after processing is complete", async () => {
    const { runPrimaryEnrichment } = await import("@/lib/enrichment/primary");
    const queue = createQueue();

    queue.enqueue("profile-1", "primary");
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(runPrimaryEnrichment).toHaveBeenCalledTimes(1);

    // Second enqueue after processing
    queue.enqueue("profile-1", "primary");
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(runPrimaryEnrichment).toHaveBeenCalledTimes(2);
  });
});
