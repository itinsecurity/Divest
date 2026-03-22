# API Contracts: Live Primary Enrichment

**Feature**: `007-primary-enrichment`
**Date**: 2026-03-22

---

## Existing Endpoint (unchanged)

### POST /api/enrichment

Triggers primary or secondary enrichment for an asset profile. **No changes to this contract.**

```
POST /api/enrichment
Authorization: Session cookie (Auth.js)
Content-Type: application/json

Body:
{
  "assetProfileId": string,   // required
  "type": "primary" | "secondary",  // default: "primary"
  "documentBase64": string,   // required when type = "secondary"
  "documentMimeType": string  // required when type = "secondary"
}

Response 202:
{
  "status": "accepted",
  "assetProfileId": string
}

Response 400:
{
  "error": string | Record<string, string[]>
}

Response 401:
{
  "error": "Authentication required"
}

Response 404:
{
  "error": "Asset profile not found"
}
```

---

## New Endpoint

### POST /api/enrichment/resolve

Resolves disambiguation for a holding in NEEDS_INPUT status. The user selects one candidate; its data is applied to the asset profile and primary enrichment is re-queued.

```
POST /api/enrichment/resolve
Authorization: Session cookie (Auth.js)
Content-Type: application/json

Body:
{
  "assetProfileId": string,  // required
  "candidateId": string      // required — must belong to the assetProfileId
}

Response 202:
{
  "status": "accepted",
  "assetProfileId": string
}

Response 400:
{
  "error": string | Record<string, string[]>
}
// Also returned if candidateId does not belong to the given assetProfileId.

Response 401:
{
  "error": "Authentication required"
}

Response 404:
{
  "error": "Candidate not found"
}
// Also returned if the asset profile does not exist.
```

**Side effects on 202**:
1. Candidate's data is applied to the `AssetProfile` (via `mergeProfileFields` with source = "enrichment")
2. All `EnrichmentCandidate` rows for this `assetProfileId` are deleted
3. All linked `Holding.enrichmentStatus` values are set to `"PENDING"`
4. Primary enrichment is re-queued (the profile now has an ISIN to work with)

---

## Holding Detail Page — Candidates Display

The holding detail page (`/holdings/[id]`) already fetches the full `HoldingWithProfile` record. With this feature, the server-side data fetch includes candidates:

**Extended server query** (in `src/app/(app)/holdings/[id]/page.tsx`):
```typescript
// The holding query includes assetProfile.candidates for NEEDS_INPUT status
const holding = await getHoldingById(id);
// holding.candidates: EnrichmentCandidateData[]  (empty if not NEEDS_INPUT)
```

**UI contract** (for `HoldingDetailClient.tsx`):
- When `holding.enrichmentStatus === "NEEDS_INPUT"` and `holding.candidates.length > 0`, render a disambiguation UI card
- Each candidate displays: name, ticker (if available), ISIN (if available), exchange (if available)
- Each candidate has a "Select" button that calls `POST /api/enrichment/resolve`
- After selection: update local status to `"PENDING"`, refresh the page

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SERPER_API_KEY` | No | — | Serper.dev API key for web search fallback. If unset, web search is skipped silently. |
| `ENRICHMENT_CACHE_TTL_HOURS` | No | `24` | Time-to-live for cache entries in hours. |

---

## Internal Source Registry Interface

Not an HTTP API — documented here for implementation reference.

```typescript
// Each source implements this interface:
interface DataSource {
  id: string;                            // e.g. "euronext", "storebrand", "web-search"
  supportedTypes: Array<"STOCK" | "FUND">;
  fetch(
    identifier: IdentifierInfo,
    instrumentType: "STOCK" | "FUND"
  ): Promise<SourceResult>;
}

// Registry processes sources in order:
// 1. euronext      → STOCK
// 2. storebrand    → FUND
// 3. euronext-fund → FUND (fallback: basic name/ticker from fund list)
// 4. web-search    → STOCK, FUND (last resort, requires SERPER_API_KEY)
```
