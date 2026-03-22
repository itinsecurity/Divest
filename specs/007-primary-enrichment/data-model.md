# Data Model: Live Primary Enrichment

**Feature**: `007-primary-enrichment`
**Date**: 2026-03-22

---

## New Prisma Models

### EnrichmentCache

Stores fetched instrument data to avoid redundant HTTP requests within the cache window (FR-019, FR-020).

```prisma
model EnrichmentCache {
  id         String   @id @default(cuid())
  cacheKey   String   @unique  // "{normalizedIdentifier}:{instrumentType}"
  data       String            // JSON: Partial<AssetProfileUpdateData>
  source     String            // which data source produced this entry
  expiresAt  DateTime
  createdAt  DateTime @default(now())
}
```

**Cache key format**: `{normalizedIdentifier}:{instrumentType}`
- Examples: `NO0010096985:STOCK`, `no0010096985:FUND`, `dnb norge indeks:FUND`
- Identifier is lowercased for lookup; ISINs are normalized to uppercase before lowercasing

**TTL**: Controlled by `ENRICHMENT_CACHE_TTL_HOURS` env var (default: 24 hours)

**Eviction**: Entries are not automatically deleted. Stale entries (`expiresAt < now()`) are ignored on read and overwritten on write. A periodic cleanup is out of scope (single-user app, table stays small).

---

### EnrichmentCandidate

Persists disambiguation candidates for holdings in NEEDS_INPUT status (FR-008, FR-009).

```prisma
model EnrichmentCandidate {
  id             String   @id @default(cuid())
  assetProfileId String
  name           String
  ticker         String?
  isin           String?
  exchange       String?
  instrumentType String   // "STOCK" | "FUND"
  sourceId       String   // which source returned this candidate
  rawData        String   // JSON: full source response for this candidate
  score          Int      @default(0)  // match score used for auto-select decisions
  createdAt      DateTime @default(now())

  assetProfile   AssetProfile @relation(fields: [assetProfileId], references: [id], onDelete: Cascade)
}
```

**Lifecycle**:
1. Created when `runPrimaryEnrichment` detects multiple comparably-strong candidates
2. Displayed on the holding detail page for user resolution
3. Deleted when the user selects a candidate (`POST /api/enrichment/resolve`)
4. Also deleted on profile deletion (cascade)

**Relationship**: An AssetProfile has zero or many EnrichmentCandidates. Candidates only exist while a profile is in NEEDS_INPUT status.

---

## Modified Prisma Model: AssetProfile

No schema change required. The `EnrichmentCandidate` relation is added as a new field:

```prisma
// Add to existing AssetProfile model:
candidates EnrichmentCandidate[]
```

---

## Type System Changes

### `src/types/index.ts`

Add `NEEDS_INPUT` to the `HoldingWithProfile` enrichment status union:

```typescript
// Before:
enrichmentStatus: "PENDING" | "COMPLETE" | "PARTIAL" | "NOT_FOUND";

// After:
enrichmentStatus: "PENDING" | "COMPLETE" | "PARTIAL" | "NOT_FOUND" | "NEEDS_INPUT";
```

Add `EnrichmentCandidateData` type for UI consumption:

```typescript
export type EnrichmentCandidateData = {
  id: string;
  name: string;
  ticker: string | null;
  isin: string | null;
  exchange: string | null;
  instrumentType: "STOCK" | "FUND";
  sourceId: string;
};
```

Extend `HoldingWithProfile` to include candidates:

```typescript
export type HoldingWithProfile = {
  // ... existing fields ...
  enrichmentStatus: "PENDING" | "COMPLETE" | "PARTIAL" | "NOT_FOUND" | "NEEDS_INPUT";
  candidates: EnrichmentCandidateData[];  // empty array when not NEEDS_INPUT
};
```

---

## New TypeScript Interfaces

### `src/lib/enrichment/sources/registry.ts`

```typescript
export type IdentifierInfo = {
  raw: string;            // original user input
  normalized: string;     // trimmed, whitespace-collapsed
  detectedType: "ISIN" | "TICKER" | "NAME";  // best-guess input format
};

export type CandidateData = {
  name: string;
  ticker: string | null;
  isin: string | null;
  exchange: string | null;
  instrumentType: "STOCK" | "FUND";
  sourceId: string;
  rawData: Record<string, unknown>;
  score: number;
};

export type SourceResult =
  | { status: "found"; data: Partial<AssetProfileUpdateData>; sourceId: string }
  | { status: "multiple"; candidates: CandidateData[] }
  | { status: "not_found" }
  | { status: "error"; retryable: boolean; message: string };

export interface DataSource {
  id: string;
  supportedTypes: Array<"STOCK" | "FUND">;
  fetch(
    identifier: IdentifierInfo,
    instrumentType: "STOCK" | "FUND"
  ): Promise<SourceResult>;
}
```

### `src/lib/enrichment/normalizer.ts`

```typescript
export type IdentifierInfo = {
  raw: string;
  normalized: string;
  detectedType: "ISIN" | "TICKER" | "NAME";
};

export function normalizeIdentifier(raw: string): IdentifierInfo;
```

### `src/lib/enrichment/candidates.ts`

```typescript
export type ScoredCandidate = CandidateData & { score: number };

export function scoreCandidate(candidate: CandidateData, identifier: IdentifierInfo): number;
export function shouldAutoSelect(candidates: ScoredCandidate[]): ScoredCandidate | null;
```

---

## State Transitions

### Enrichment Status State Machine

```
                    User adds holding
                          │
                          ▼
                       PENDING
                          │
                   runPrimaryEnrichment
                    ┌─────┴──────┐
                    │            │
               Unambiguous   Multiple
                 match       candidates
                    │       (comparable)
                    │            │
                    │            ▼
                    │        NEEDS_INPUT ──► User selects
                    │                       candidate
                    │                          │
                    │            ┌─────────────┘
                    │            │ (re-enqueue with
                    │            │  resolved ISIN)
                    ▼            ▼
              All sources tried
              ┌────────────────────────┐
              │                        │
         All fields              Some fields
          filled                  filled
              │                        │
              ▼                        ▼
           COMPLETE                 PARTIAL
                                       │
                                  User triggers
                                  refresh or
                                  manual edit
              No source found
                    │
                    ▼
                NOT_FOUND
```

### Re-enrichment (FR-018)
- `COMPLETE`: Only re-enriched when user clicks "Refresh Profile" → sets status to PENDING, re-enqueues
- `PARTIAL`: User can trigger re-enrichment (same mechanism as above)
- `NOT_FOUND`: User can trigger re-enrichment (same mechanism as above)
- `NEEDS_INPUT`: User resolves by selecting candidate → data applied → status set to PENDING → re-enqueued
- `PENDING`: Already in queue; deduplication in `queue.ts` prevents double-processing
