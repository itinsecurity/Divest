// Per-host last-request timestamp (ms). Module-level singleton.
const lastRequest = new Map<string, number>();

/** Reset all tracked hosts — for testing only. */
export function resetRateLimiter(): void {
  lastRequest.clear();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForRateLimit(url: string): Promise<void> {
  const host = new URL(url).hostname;
  const last = lastRequest.get(host);
  if (last !== undefined) {
    const elapsed = Date.now() - last;
    if (elapsed < 1000) {
      await sleep(1000 - elapsed);
    }
  }
  lastRequest.set(host, Date.now());
}
