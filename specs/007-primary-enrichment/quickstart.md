# Quickstart: Live Primary Enrichment

**Feature**: `007-primary-enrichment`
**Date**: 2026-03-22

---

## Prerequisites

All existing dependencies cover this feature. No new npm packages required.

Already in `package.json`:
- `cheerio` — HTML parsing for Euronext search response labels
- `unpdf` — PDF text extraction for Storebrand fund documents

---

## Environment Setup

Add the following to `.env.local` (never commit this file):

```env
# Optional: enables web search fallback (FR-013)
# Get a free key at https://serper.dev — 2,500 queries free, no credit card
SERPER_API_KEY=your_key_here

# Optional: override cache TTL in hours (default: 24)
ENRICHMENT_CACHE_TTL_HOURS=24
```

The app runs without `SERPER_API_KEY` — web search is simply skipped, and instruments not found via direct sources will end up `NOT_FOUND`.

---

## Database Migration

After modifying `prisma/schema.prisma` to add the two new models:

```bash
# Generate and apply migration
npx prisma migrate dev --name add-enrichment-cache-and-candidates

# Verify schema was applied
npx prisma studio
```

The two new tables are:
- `EnrichmentCache` — lookup cache with TTL
- `EnrichmentCandidate` — disambiguation candidates for NEEDS_INPUT holdings

---

## Running the App

```bash
npm run dev
```

Primary enrichment triggers automatically when a holding is added. To test manually:

1. Add a holding (e.g., identifier "Equinor", type "Stock")
2. Navigate to the holding detail page
3. Observe status transition: PENDING → (enrichment runs) → COMPLETE or PARTIAL
4. For a fund: add identifier "DNB Norge Indeks", type "Fund"

---

## Testing

```bash
# Unit tests (fast, no DB)
npm test

# Integration tests (requires DB)
npm run test:integration

# E2E tests (requires built app + DB)
npm run build
npm run test:e2e
```

Key new test files after implementation:
```
tests/unit/enrichment/normalizer.test.ts
tests/unit/enrichment/candidates.test.ts
tests/unit/enrichment/cache.test.ts
tests/unit/enrichment/rate-limiter.test.ts
tests/unit/enrichment/sources/euronext.test.ts
tests/unit/enrichment/sources/storebrand.test.ts
tests/unit/enrichment/search-fallback.test.ts
tests/integration/api/enrichment-resolve.test.ts
tests/integration/enrichment/primary.test.ts
tests/e2e/enrichment.spec.ts
```

---

## Architecture Overview

```
User adds holding
      │
      ▼
enrichmentQueue.enqueue(profileId, "primary")
      │
      ▼
runPrimaryEnrichment(profileId)
      │
      ├─ normalizeIdentifier(profile.instrumentIdentifier)
      │
      ├─ checkCache(cacheKey) → return cached data if fresh
      │
      ├─ for each source in registry (filtered by instrumentType):
      │    ├─ rateLimiter.wait(host)
      │    ├─ source.fetch(identifier, type) [with 1 retry on error]
      │    │    ├─ "found" → scoreAndAutoSelect → break if unambiguous
      │    │    ├─ "multiple" → save candidates, set NEEDS_INPUT, return
      │    │    ├─ "not_found" → continue
      │    │    └─ "error" → log, continue
      │    └─ write to cache on success
      │
      ├─ if nothing found → web search fallback (if SERPER_API_KEY set)
      │
      └─ determineStatus(data) → COMPLETE | PARTIAL | NOT_FOUND
         updateProfile(data)
         updateHoldings(status)

User resolves NEEDS_INPUT
      │
      ▼
POST /api/enrichment/resolve { assetProfileId, candidateId }
      │
      ├─ Apply candidate data to AssetProfile
      ├─ Delete all candidates for profile
      ├─ Set holdings status to PENDING
      └─ Re-enqueue primary enrichment
```

---

## Source Details

### Euronext (stocks)

Fetches via `GET https://live.euronext.com/en/instrumentSearch/searchJSON?q={identifier}`.

Required headers:
```typescript
{
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'X-Requested-With': 'XMLHttpRequest',  // gates JSON response — do not omit
  'User-Agent': 'Mozilla/5.0 ...'
}
```

Returns: name, ticker (parse from `label` HTML with cheerio), ISIN, exchange (from MIC mapping), country (from ISIN prefix). **Does not return sector or industry** — these fields will be empty, resulting in PARTIAL status.

### Storebrand Document API (funds)

Fetches PDF from `https://api.fund.storebrand.no/open/funddata/document?documentType=FUND_PROFILE&isin={ISIN}&languageCode=en-GB&market=NOR`.

No authentication required. Works for any Norwegian fund ISIN (proxies Morningstar data).

PDF parsed with `unpdf`'s `extractText()`. Regex patterns extract:
- Fund name
- Category (maps to `fundCategory`: EQUITY | BOND | COMBINATION)
- Manager (`fundManager`)
- Asset allocation (`equityPct`, `bondPct`)
- Sector weightings (`sectorWeightings`)
- Geographic exposure (`geographicWeightings`)

### Web Search Fallback

Only used when all direct sources fail and `SERPER_API_KEY` is set.

Query: `"{identifier}" {instrumentType} ISIN stock` or `"{identifier}" fund Norway`

On match: extract the URL of the first result pointing to a known source (euronext.com, storebrand.no, etc.), then fetch and parse that page. If no known source found in results, mark NOT_FOUND.
