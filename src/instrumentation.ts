/**
 * Next.js instrumentation hook — runs once at server startup, before any
 * route modules are loaded.
 *
 * This is the single platform-adapter seam for the app. All platform-specific
 * wiring (e.g. resolving SST resource bindings) lives here so the rest of the
 * codebase stays platform-agnostic and only reads standard env vars.
 */
export async function register() {
  // Only run in the Node.js runtime (not the Edge runtime, which cannot hold
  // long-lived database connections anyway).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // If DATABASE_URL is already present — set by .env.local, CI, or any platform
  // that injects env vars directly — there is nothing to do.
  if (process.env.DATABASE_URL) return;

  // SST resource binding: when the app is deployed via SST with a linked
  // Database resource the connection URL is available through the Resource API
  // rather than as a plain environment variable.  We import dynamically so the
  // app compiles and starts correctly in environments where the `sst` package
  // is not installed (local dev, CI, non-SST platforms).
  try {
    const { Resource } = await import("sst");
    const url = (Resource as { Database?: { url?: string } }).Database?.url;
    if (url) {
      process.env.DATABASE_URL = url;
    }
  } catch {
    // `sst` is not available in this environment.  DATABASE_URL was not
    // resolved here; db.ts will throw a descriptive error on first use if it
    // remains unset.
  }
}
