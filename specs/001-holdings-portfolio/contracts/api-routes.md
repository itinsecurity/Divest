# API Routes Contract

**Feature Branch**: `001-holdings-portfolio`
**Date**: 2026-03-13

API routes are used only for async background processing that cannot be handled by server actions. All routes require an authenticated session.

---

## `POST /api/enrichment`

Triggers asynchronous enrichment for an asset profile. Returns immediately; processing happens in the background.

**Request**:
```typescript
{
  assetProfileId: string;
  type?: 'primary' | 'secondary';  // Default: 'primary'
  documentBase64?: string;         // Required if type === 'secondary'
  documentMimeType?: string;       // Required if type === 'secondary'
}
```

**Response** (immediate):
```typescript
// 202 Accepted
{
  status: 'accepted';
  assetProfileId: string;
}

// 400 Bad Request
{
  error: string;
}

// 401 Unauthorized
{
  error: 'Authentication required';
}

// 404 Not Found
{
  error: 'Asset profile not found';
}
```

**Behavior**:
1. Validates request body (Zod).
2. Verifies `assetProfileId` exists in database.
3. Enqueues enrichment work in the in-process queue (deduplicates by `assetProfileId`).
4. Returns 202 immediately.
5. Background processing:
   - **Primary**: Fetches from public sources (Euronext, fund companies) using ISIN/ticker.
   - **Secondary**: Sends document to AI provider for structured extraction.
6. On completion: updates `AssetProfile` fields (respecting source priority) and all linked holdings' `enrichmentStatus`.

**Rate limiting**: The in-process queue serializes requests per `assetProfileId` — concurrent enrichment of the same profile is impossible.

---

## Internal Types

These types are used across server actions and API routes.

### `HoldingWithProfile`

```typescript
type HoldingWithProfile = {
  id: string;
  instrumentIdentifier: string;
  instrumentType: 'STOCK' | 'FUND';
  accountName: string;
  shares: number | null;
  pricePerShare: number | null;
  currentValue: number | null;
  displayValue: number;           // Computed: shares × pricePerShare or currentValue
  enrichmentStatus: 'PENDING' | 'COMPLETE' | 'PARTIAL' | 'NOT_FOUND';
  lastUpdated: string;            // ISO 8601
  assetProfile: AssetProfile | null;
};
```

### `SpreadData`

```typescript
type SpreadBucket = {
  name: string;          // Sector name, region name, or "Unclassified"
  value: number;         // NOK value
  percentage: number;    // Percentage of total
  isUnclassified: boolean;
};

type StockInterestBalance = {
  equity: SpreadBucket;
  interest: SpreadBucket;
  unclassified: SpreadBucket;
  total: number;
};

type SpreadAnalysis = {
  buckets: SpreadBucket[];
  total: number;
  incompleteHoldings: number;  // Count of holdings with non-COMPLETE status
};
```
