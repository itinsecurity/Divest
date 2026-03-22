# Implementation Plan: Live Primary Enrichment

**Branch**: `007-primary-enrichment` | **Date**: 2026-03-22 | **Spec**: specs/007-primary-enrichment/spec.md

## Summary

Replace stub primary enrichment fetchers with real HTTP clients that look up instrument data from public web sources. Extends the existing `src/lib/enrichment/` infrastructure with: a source registry pattern, real Euronext stock lookup, Storebrand fund document API + PDF parsing, identifier normalization, per-host rate limiting, DB-backed time-based caching, disambiguation candidate persistence, NEEDS_INPUT enrichment status, and a web search fallback via Serper.dev. The existing queue, merge, secondary enrichment, and API layers are largely unchanged.

## Technical Context

**Language/Version**: TypeScript 5.6 / Node.js 24
**Primary Dependencies**: Next.js 16 (App Router), Prisma 7.5, cheerio 1.0, unpdf 1.4, zod 4 — all existing in `package.json`; no new runtime packages
**Storage**: PostgreSQL (production) / SQLite-compatible Prisma schema; 2 new models added
**Testing**: Vitest (unit + integration), Playwright (E2E)
**Target Platform**: Next.js server (API routes + server actions)
**Project Type**: Web application
**Performance Goals**: Unambiguous enrichment completes within 30 seconds (SC-003); all sources exhausted within 60 seconds (SC-006)
**Constraints**: ≤1 req/sec per host (FR-011); browser-like request headers (FR-012); no new npm runtime dependencies
**Scale/Scope**: Single user, personal tool

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Portability | PASS | All API keys via env vars; no hosting-provider SDK calls |
| II. Tech Stack | PASS | No new runtime packages; `cheerio` and `unpdf` already in `package.json` |
| III. Security | PASS | Auth.js session required on all new routes; `SERPER_API_KEY` via env var only; zod input validation on new endpoint |
| IV. Testing | PASS | TDD enforced; `next build` required before phase complete; E2E Playwright happy-path test required |
| V. Simplicity | PASS | Each new module has single responsibility; no premature abstractions; source registry is a plain sorted array, not a plugin system |

## Project Structure

### Documentation (this feature)

```text
specs/007-primary-enrichment/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # API contracts
└── tasks.md             # Phase 2 output (/speckit.tasks — not created here)
```

### Source Code

```text
src/lib/enrichment/
├── primary.ts              # Modified: replace stub with source registry orchestration
├── queue.ts                # Unchanged
├── secondary.ts            # Unchanged
├── types.ts                # Minor: no change needed (status is a string in DB)
├── normalizer.ts           # New: identifier normalization + type detection
├── rate-limiter.ts         # New: per-host rate limiting (≤1 req/sec)
├── cache.ts                # New: DB-backed EnrichmentCache CRUD
├── candidates.ts           # New: candidate scoring + auto-select threshold logic
├── search-fallback.ts      # New: Serper.dev web search last-resort fallback
└── sources/
    ├── registry.ts         # New: DataSource interface + ordered source list
    ├── euronext.ts         # New: real Euronext XOSL stock fetcher (searchJSON + HTML parse)
    └── storebrand.ts       # New: Storebrand document API + unpdf PDF parser

src/app/api/enrichment/
├── route.ts                # Unchanged
└── resolve/
    └── route.ts            # New: POST — select disambiguation candidate

prisma/
└── schema.prisma           # Add EnrichmentCache + EnrichmentCandidate models

src/types/index.ts          # Add NEEDS_INPUT to enrichmentStatus union; add EnrichmentCandidateData type

src/app/(app)/holdings/[id]/
├── page.tsx                # Modified: include candidates in server data fetch
└── HoldingDetailClient.tsx # Modified: NEEDS_INPUT badge + disambiguation UI card

src/components/ui/StatusBadge.tsx  # Modified: add NEEDS_INPUT badge style
```

### Tests

```text
tests/unit/enrichment/
├── normalizer.test.ts          # New
├── rate-limiter.test.ts        # New
├── candidates.test.ts          # New
├── cache.test.ts               # New
├── search-fallback.test.ts     # New
└── sources/
    ├── euronext.test.ts        # New
    └── storebrand.test.ts      # New

tests/integration/
├── api/
│   └── enrichment-resolve.test.ts   # New
└── enrichment/
    └── primary.test.ts              # New (replaces/extends existing unit test)

tests/e2e/
└── enrichment.spec.ts               # New: Playwright E2E happy path
```

**Note**: The existing `tests/unit/enrichment/primary.test.ts` currently tests the stub implementation. It will be superseded by the new integration test with mocked HTTP and the updated unit tests for the refactored modules.

## Complexity Tracking

> No constitution violations — no entries required.

---

## Phase 0: Research

**Status**: Complete. See `specs/007-primary-enrichment/research.md`.

Key findings:
- **Euronext**: `GET /en/instrumentSearch/searchJSON?q={id}` (with `X-Requested-With: XMLHttpRequest`) returns JSON candidates with name, ISIN, MIC, and ticker embedded in HTML label. No sector/industry data available — PARTIAL is the expected stock outcome.
- **Funds**: Storebrand document API (`api.fund.storebrand.no`) returns Morningstar Fund Profile PDFs for any Norwegian ISIN. Parse with `unpdf` (already in project). Covers fund name, manager, category, equity/bond %, sector/geographic weightings.
- **Web search**: Serper.dev — 2,500 free queries, no card required. `POST https://google.serper.dev/search` with `X-API-KEY` header. If key not set, silently skip.
- **Cache**: DB-backed `EnrichmentCache` table; key = `{normalizedId}:{type}`, configurable TTL (default 24h).
- **Rate limiting**: In-process per-host timestamp map; await remainder if < 1,000ms since last request to that host.
- **Disambiguation**: Auto-select if exact ISIN/ticker match (score gap ≥ 40); otherwise NEEDS_INPUT with stored candidates.

---

## Phase 1: Design

### Orchestration Flow (`runPrimaryEnrichment`)

```
1. Load profile from DB (skip if COMPLETE and no forceRefresh flag)
2. normalizeIdentifier(profile.instrumentIdentifier) → IdentifierInfo
3. checkCache(key) → if hit: apply cached data, determine status, update DB, return
4. For each source in registry filtered by instrumentType (in priority order):
   a. rateLimiter.wait(source.host)
   b. result = await source.fetch(identifier, type)
      - On "error" + retryable: retry once after 1s; if still error: log + continue
      - On "error" + not retryable: log + continue
      - On "not_found": continue to next source
      - On "multiple": score candidates, call shouldAutoSelect()
        - Auto-select → treat as "found" with auto-selected candidate's data
        - No auto-select → persist candidates, set NEEDS_INPUT on holdings, return
      - On "found": writeCache(key, result.data, source.id), break
5. If no source returned data → try web search fallback (if SERPER_API_KEY set)
6. determineStatus(mergedData, instrumentType) → COMPLETE | PARTIAL | NOT_FOUND
7. mergeProfileFields(existing, incoming, fieldSources, "enrichment")
8. Update AssetProfile + Holding records in DB
```

### Source Registry (`sources/registry.ts`)

```typescript
export const SOURCES: DataSource[] = [
  euronextSource,     // priority 1 — STOCK
  storebrandSource,   // priority 2 — FUND
  euronextFundSource, // priority 3 — FUND (basic name/ticker fallback)
];
// web search is handled separately as a last-resort step, not a registered source
```

### Identifier Normalization (`normalizer.ts`)

```
Input: raw string from profile.instrumentIdentifier
Steps:
  1. trim()
  2. collapse internal whitespace to single space
  3. attempt ISIN detection: uppercase → test ISIN regex → if match, type = ISIN
  4. otherwise: if alphanumeric ≤ 6 chars with no spaces, type = TICKER; else type = NAME
Output: { raw, normalized, detectedType }
```

ISIN regex: `/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/`

### Euronext Source (`sources/euronext.ts`)

```
fetch(identifier, "STOCK"):
  1. GET /en/instrumentSearch/searchJSON?q={identifier.normalized}
     Headers: Accept: application/json, X-Requested-With: XMLHttpRequest, User-Agent: ...
  2. Parse JSON array; exclude last "See all results" element
  3. For each result: parse ticker from label HTML (cheerio: .instrument-symbol text)
  4. Build CandidateData array with scores
  5. Score: exact ISIN=100, exact ticker=80, exact name=60, partial name=20
  6. Call shouldAutoSelect()
     - Single candidate: "found" with that candidate's data
     - Auto-select: "found" with auto-selected data
     - No auto-select: "multiple" with all candidates
  7. Map MIC → exchange name (XOSL→"Oslo Bors", MERK→"Euronext Growth Oslo", XOAS→"Oslo Axess")
  8. Map ISIN prefix → country (NO→"Norway", SE→"Sweden", DK→"Denmark", ...)
  9. Return: { name, ticker, isin, exchange, country } — no sector/industry
```

### Storebrand Source (`sources/storebrand.ts`)

```
fetch(identifier, "FUND"):
  1. Determine ISIN: if identifier.detectedType === ISIN, use directly;
     otherwise try Euronext fund list lookup to resolve name → ISIN first
  2. GET https://api.fund.storebrand.no/open/funddata/document
        ?documentType=FUND_PROFILE&isin={ISIN}&languageCode=en-GB&market=NOR
     On non-200 or empty: return "not_found"
  3. Parse PDF with unpdf extractText()
  4. Apply regex patterns to extracted text:
     - name: first non-empty line
     - category: /Category[:\s]+(\w[\w\s]*)/i → map to EQUITY|BOND|COMBINATION
     - manager: /Fund company[:\s]+(.+)/i or /Management company[:\s]+(.+)/i
     - equityPct: /Equity[:\s]+([\d.]+)%/i
     - bondPct: /Bond[:\s]+([\d.]+)%/i or /Fixed income[:\s]+([\d.]+)%/i
     - sectorWeightings: parse sector table rows (name: percentage pairs)
     - geographicWeightings: parse geographic table rows
  5. Return "found" with extracted data, or "not_found" if no fields extracted
```

### Rate Limiter (`rate-limiter.ts`)

```typescript
// Module-level map: hostname → last request timestamp (ms)
const lastRequest = new Map<string, number>();

export async function waitForRateLimit(url: string): Promise<void> {
  const host = new URL(url).hostname;
  const last = lastRequest.get(host) ?? 0;
  const elapsed = Date.now() - last;
  if (elapsed < 1000) await sleep(1000 - elapsed);
  lastRequest.set(host, Date.now());
}
```

### Cache (`cache.ts`)

```typescript
export async function getCached(key: string): Promise<Partial<AssetProfileUpdateData> | null>
export async function setCached(key: string, data: Partial<AssetProfileUpdateData>, source: string): Promise<void>
```

TTL from `parseInt(process.env.ENRICHMENT_CACHE_TTL_HOURS ?? "24") * 3600 * 1000`

### Disambiguation (`candidates.ts`)

```typescript
const AUTO_SELECT_SCORE_GAP = 40;

export function scoreCandidate(candidate, identifier): number
export function shouldAutoSelect(scored: ScoredCandidate[]): ScoredCandidate | null {
  // Sort by score descending
  // If top score - second score >= AUTO_SELECT_GAP → return top
  // Otherwise → return null (trigger NEEDS_INPUT)
}
```

### NEEDS_INPUT Handling

When `shouldAutoSelect` returns null:
1. Persist all candidates to `EnrichmentCandidate` table
2. Set all linked holdings to `enrichmentStatus: "NEEDS_INPUT"`
3. Return early from `runPrimaryEnrichment`

When `POST /api/enrichment/resolve` is called:
1. Load candidate + verify it belongs to the profile
2. Parse `rawData` → extract `Partial<AssetProfileUpdateData>`
3. Apply via `mergeProfileFields`
4. Delete all candidates for this profile
5. Set holdings to `"PENDING"`
6. Re-enqueue via `enrichmentQueue.enqueue(profileId, "primary")`

### Web Search Fallback (`search-fallback.ts`)

```typescript
export async function searchFallback(
  identifier: IdentifierInfo,
  instrumentType: "STOCK" | "FUND"
): Promise<Partial<AssetProfileUpdateData> | null>
```

Query: `"${identifier.normalized}" ${instrumentType.toLowerCase()} ISIN`

On results: check each `link` against known source domains (`live.euronext.com`, `api.fund.storebrand.no`). If a known source URL is found, fetch and parse it via the appropriate source module. Return null if no known source found.

### UI Changes

**`StatusBadge.tsx`**: Add `NEEDS_INPUT` to the status config with an amber/yellow style to indicate user action required.

**`HoldingDetailClient.tsx`**: When `enrichmentStatus === "NEEDS_INPUT"` and `candidates.length > 0`, render a disambiguation card showing each candidate with name, ticker, ISIN, exchange, and a "Select" button. The "Select" button calls `POST /api/enrichment/resolve` and updates local state to "PENDING".

**`holdings/[id]/page.tsx`**: Extend the server-side data query to include `assetProfile.candidates` so the client component receives pre-fetched candidates.

### COMPLETE vs PARTIAL Determination

```
Stock fields: ["name", "ticker", "isin", "exchange", "country", "sector", "industry"]
Fund fields:  ["name", "fundManager", "fundCategory", "equityPct", "bondPct"]

If all required fields for the type are non-null → COMPLETE
If any required field is null → PARTIAL
If no fields populated → NOT_FOUND
```

Note: Euronext does not return sector/industry, so most stock enrichments will be PARTIAL. This is an accepted limitation (see research.md §1 Critical Limitation).

---

## Post-Phase 1 Constitution Re-Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Portability | PASS | Same as initial check |
| II. Tech Stack | PASS | No new packages added; cheerio/unpdf already present |
| III. Security | PASS | Auth required on resolve endpoint; no financial data in logs; zod validation |
| IV. Testing | PASS | Each new module has tests; E2E covers add-holding → enrichment happy path |
| V. Simplicity | PASS | 7 new files in enrichment/; each has single responsibility; no premature generalization |

New models: `EnrichmentCache` and `EnrichmentCandidate` are both directly required (FR-019, FR-009). No premature abstractions added. Source registry is a plain sorted array — intentionally not a dynamic plugin system.
