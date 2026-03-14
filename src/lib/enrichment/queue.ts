import { runPrimaryEnrichment } from "./primary";

type EnrichmentType = "primary" | "secondary";

type QueueItem = {
  assetProfileId: string;
  type: EnrichmentType;
  documentBase64?: string;
  documentMimeType?: string;
};

export type EnrichmentQueue = {
  enqueue(
    assetProfileId: string,
    type: EnrichmentType,
    documentData?: { base64: string; mimeType: string }
  ): void;
};

/**
 * Creates a new in-process enrichment queue with deduplication.
 * Uses a Set to track currently-enqueued profile IDs.
 */
export function createQueue(): EnrichmentQueue {
  const inFlight = new Set<string>();

  function processItem(item: QueueItem): void {
    const { assetProfileId, type, documentBase64, documentMimeType } = item;

    Promise.resolve()
      .then(async () => {
        if (type === "primary") {
          await runPrimaryEnrichment(assetProfileId);
        } else if (type === "secondary" && documentBase64 && documentMimeType) {
          // Lazy import to avoid circular deps and support test mocking
          const { runSecondaryEnrichment } = await import("./secondary");
          const { aiProvider } = await import("@/lib/ai");
          const buffer = Buffer.from(documentBase64, "base64");
          await runSecondaryEnrichment(assetProfileId, buffer, documentMimeType, aiProvider);
        }
      })
      .catch((err) => {
        console.error(`Enrichment failed for profile ${assetProfileId}:`, err);
      })
      .finally(() => {
        inFlight.delete(assetProfileId);
      });
  }

  return {
    enqueue(
      assetProfileId: string,
      type: EnrichmentType = "primary",
      documentData?: { base64: string; mimeType: string }
    ) {
      if (inFlight.has(assetProfileId)) {
        // Already processing — deduplicate
        return;
      }
      inFlight.add(assetProfileId);
      processItem({
        assetProfileId,
        type,
        documentBase64: documentData?.base64,
        documentMimeType: documentData?.mimeType,
      });
    },
  };
}

// Singleton queue instance for the application
const globalForQueue = globalThis as unknown as {
  enrichmentQueue: EnrichmentQueue | undefined;
};

export const enrichmentQueue: EnrichmentQueue =
  globalForQueue.enrichmentQueue ?? createQueue();

if (process.env.NODE_ENV !== "production") {
  globalForQueue.enrichmentQueue = enrichmentQueue;
}
