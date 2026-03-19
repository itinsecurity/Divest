# Quickstart: Force Dynamic Page Rendering

**Feature**: 004-dynamic-rendering | **Date**: 2026-03-19

## What Changed

All pages and layouts in the authenticated `(app)` route group now export `dynamic = 'force-dynamic'`, ensuring they are rendered at request time instead of being statically generated during `next build`.

## Verification

### 1. Build without database (primary acceptance test)

```bash
# Unset DATABASE_URL (or ensure it's not configured)
unset DATABASE_URL
npm run build
# Expected: Build completes successfully with zero errors
```

The build output should show the `(app)` routes as dynamically rendered (`ƒ` or `λ` symbol) rather than statically generated (`●` symbol).

### 2. Runtime data freshness

```bash
# Start with database available
npm run start

# 1. Navigate to /holdings — verify holdings load
# 2. Modify a holding in the database directly
# 3. Refresh the page — verify updated data appears immediately
```

### 3. Existing tests

```bash
npm run test          # Unit + integration tests
npm run test:e2e      # Playwright E2E tests (if configured)
npx tsc --noEmit      # Type checking
```

All existing tests must continue to pass.

## Files Modified

| File | Change |
|---|---|
| `src/app/(app)/layout.tsx` | Added `export const dynamic = 'force-dynamic'` |
| `src/app/(app)/holdings/page.tsx` | Added `export const dynamic = 'force-dynamic'` |
| `src/app/(app)/holdings/[id]/page.tsx` | Added `export const dynamic = 'force-dynamic'` |
| `src/app/(app)/portfolio/page.tsx` | Added `export const dynamic = 'force-dynamic'` |
