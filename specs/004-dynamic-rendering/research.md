# Research: Force Dynamic Page Rendering

**Feature**: 004-dynamic-rendering | **Date**: 2026-03-19

## R1: Why does the build fail?

**Finding**: During `next build`, Next.js attempts to statically pre-render pages. Pages in `src/app/(app)/` call `getHoldings()` (a server action) which imports `prisma` from `src/lib/db.ts`. The Prisma client is eagerly instantiated at module load via `PrismaPg({ connectionString: process.env.DATABASE_URL })`. When no database is available at build time, this fails.

**Key detail**: The `(app)/layout.tsx` calls `auth()` which uses `cookies()` internally, which should trigger dynamic rendering. However, the cascade behavior of layout-level dynamic rendering to child pages is undocumented in Next.js (GitHub Discussion #73312). Each page segment may be evaluated independently for static/dynamic determination.

## R2: Approach — `force-dynamic` vs `connection()` vs `cacheComponents`

**Decision**: Use `export const dynamic = 'force-dynamic'` on each file in the `(app)` route group.

**Rationale**:
- Explicit, per-file, well-documented behavior in Next.js 16
- No dependency on undocumented cascade behavior
- No change to the application's caching model
- One-line addition per file — minimal diff, easy to review

**Alternatives considered**:

| Alternative | Why rejected |
|---|---|
| `await connection()` from `next/server` | Function-level opt-in is more granular than needed; would require adding it inside each component body rather than as a clean top-level export |
| `cacheComponents: true` in next.config.ts | Changes the entire caching model (everything dynamic by default, opt-in with `"use cache"`). Overkill for this fix — introduces a paradigm shift when we only need 4 files to be dynamic. Also removes route segment config entirely, which may have unintended side effects. |
| Layout-only `force-dynamic` | Cascade to child pages is undocumented (Next.js GitHub Discussion #73312). Risky to rely on for a build-breaking issue. |
| Prisma lazy initialization | Would defer the connection to query time, but doesn't address the fundamental issue that Next.js would still attempt to execute `getHoldings()` during static generation. Also adds complexity to the DB layer for a rendering configuration problem. |

## R3: Which files need `force-dynamic`?

**Decision**: All 4 files in the `(app)` route group — the layout + 3 pages.

**Analysis per file**:

| File | DB Access | Other Dynamic Signals | Needs `force-dynamic`? |
|---|---|---|---|
| `(app)/layout.tsx` | `auth()` → cookies | `cookies()` (implicit via auth) | Yes — makes intent explicit, guards against framework changes |
| `(app)/holdings/page.tsx` | `getHoldings()` → Prisma | None | **Yes — critical**. No other dynamic signal; this is the most likely candidate for static generation |
| `(app)/holdings/[id]/page.tsx` | `getHoldings()` → Prisma | `await params` (dynamic segment) | Yes — dynamic segment helps but explicit export is cheap insurance |
| `(app)/portfolio/page.tsx` | `getHoldings()` → Prisma | `await searchParams` | Yes — searchParams helps but explicit export is cheap insurance |

**Files excluded** (no database access):

| File | Reason |
|---|---|
| `src/app/page.tsx` | Simple redirect, no data fetching |
| `src/app/(auth)/login/page.tsx` | Reads `NODE_ENV` only, no DB |
| `src/app/(auth)/layout.tsx` | Static wrapper, no DB |
| `src/app/layout.tsx` | Root metadata only |

## R4: middleware.ts and dynamic rendering

**Finding**: Middleware runs as a network-level routing layer before page rendering. It does NOT affect whether pages are statically or dynamically rendered during `next build`. The `auth()` call in middleware provides request-time auth checks but does not prevent static pre-rendering of pages.

**Note**: Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts` (with Node.js runtime). This migration is out of scope for this feature but noted for future work.

## R5: Next.js 16 breaking changes relevant to this feature

**Finding**: No breaking changes affect the chosen approach. Key points:
- `export const dynamic = 'force-dynamic'` continues to work in Next.js 16 (when `cacheComponents` is not enabled)
- `params` and `searchParams` must be awaited (already done in our codebase)
- The `cacheComponents` flag exists but is opt-in; we are not enabling it
