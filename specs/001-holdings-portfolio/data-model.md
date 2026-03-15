# Data Model: Holdings Registration and Portfolio Profile

**Feature Branch**: `001-holdings-portfolio`
**Date**: 2026-03-13

---

## Entities

### Holding

The user's personal position in a financial instrument within a named account.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `String` | PK, cuid | Auto-generated |
| `instrumentIdentifier` | `String` | Required | User-provided name, ticker, or ISIN |
| `instrumentType` | `InstrumentType` | Required | `STOCK` or `FUND` |
| `accountName` | `String` | Required, non-empty | Free-text label (e.g., "Nordnet ASK") |
| `shares` | `Decimal` | Required if STOCK | Number of shares held |
| `pricePerShare` | `Decimal` | Required if STOCK | Price per share in NOK |
| `currentValue` | `Decimal` | Required if FUND | Current holding value in NOK |
| `enrichmentStatus` | `EnrichmentStatus` | Required, default `PENDING` | `PENDING`, `COMPLETE`, `PARTIAL`, `NOT_FOUND` |
| `assetProfileId` | `String?` | FK → AssetProfile | Nullable until enrichment links/creates a profile |
| `lastUpdated` | `DateTime` | Required, auto-set | Set on creation; updated on price/value edits (FR-027) |
| `createdAt` | `DateTime` | Required, auto-set | Immutable creation timestamp |
| `updatedAt` | `DateTime` | Required, auto-set | Prisma `@updatedAt` |

**Derived fields** (not stored):
- `displayValue`: For stocks: `shares × pricePerShare`. For funds: `currentValue`. Computed at query time.

**Validation rules**:
- `accountName` must be non-empty string.
- `instrumentType` must be `STOCK` or `FUND`.
- If `STOCK`: `shares` > 0 and `pricePerShare` > 0 required.
- If `FUND`: `currentValue` > 0 required.
- `instrumentIdentifier` must be non-empty string.

**Unique constraint**: `@@unique([accountName, instrumentIdentifier])` — one position per instrument per account.

---

### AssetProfile

Properties of a financial instrument, independent of any holding. Shared across holdings for the same instrument.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `String` | PK, cuid | Auto-generated |
| `instrumentType` | `InstrumentType` | Required | `STOCK` or `FUND` — authoritative type |
| `isin` | `String?` | Unique (if set) | Primary identifier when available |
| `ticker` | `String?` | | Secondary identifier |
| `name` | `String?` | | Full company/fund name |
| `exchange` | `String?` | | Stock: exchange name (e.g., "Oslo Børs") |
| `country` | `String?` | | Stock: country of primary listing |
| `sector` | `String?` | | Stock: GICS sector |
| `industry` | `String?` | | Stock: GICS industry |
| `fundManager` | `String?` | | Fund: fund manager/family |
| `fundCategory` | `FundCategory?` | | Fund: `EQUITY`, `BOND`, `COMBINATION` |
| `equityPct` | `Decimal?` | | Fund (combination): equity percentage |
| `bondPct` | `Decimal?` | | Fund (combination): bond/interest percentage |
| `sectorWeightings` | `Json?` | | Fund: `{ "Technology": 25.5, "Financials": 18.0, ... }` |
| `geographicWeightings` | `Json?` | | Fund: `{ "Norway": 40.0, "Europe ex-Norway": 30.0, ... }` |
| `fieldSources` | `Json` | Default `{}` | Per-field source tracking (see below) |
| `createdAt` | `DateTime` | Required, auto-set | |
| `updatedAt` | `DateTime` | Required, auto-set | Prisma `@updatedAt` |

**Relationships**:
- `holdings`: One-to-many → `Holding[]`

**Matching logic** (FR-005):
- Match by ISIN first (exact match).
- Fall back to ticker match if no ISIN.
- If a match exists, link the holding to the existing profile; do not re-fetch.

---

### Field Sources (JSON structure)

The `fieldSources` JSON column tracks the provenance of each field value:

```typescript
type FieldSources = {
  [fieldName: string]: {
    source: 'enrichment' | 'user' | 'ai_extraction';
    enrichedAt?: string;    // ISO 8601 date
    provider?: string;      // e.g., "euronext", "morningstar", "user_upload"
  };
};
```

**Source priority** (highest wins during merge):
1. `user` — manually edited fields; never overwritten by enrichment or AI.
2. `enrichment` — primary enrichment from public sources.
3. `ai_extraction` — secondary enrichment from document upload.

**Merge rules** (FR-007, FR-014):
- On primary enrichment: populate empty fields; skip fields with `source: 'user'`.
- On AI extraction: populate empty fields; skip fields with `source: 'user'` or `source: 'enrichment'`.
- On manual edit: overwrite any field; set `source: 'user'`.
- On refresh (FR-015): re-run primary enrichment; overwrite fields with `source: 'enrichment'` or `source: 'ai_extraction'`; skip fields with `source: 'user'`.

---

## Enums

### InstrumentType

| Value | Description |
|-------|-------------|
| `STOCK` | Individual equity/stock |
| `FUND` | Mutual fund, ETF, or index fund |

### EnrichmentStatus

| Value | Description |
|-------|-------------|
| `PENDING` | Enrichment not yet attempted or in progress |
| `COMPLETE` | All expected profile fields populated |
| `PARTIAL` | Some profile fields populated, others missing |
| `NOT_FOUND` | Enrichment attempted, no data found |

### FundCategory

| Value | Description |
|-------|-------------|
| `EQUITY` | Equity/stock fund (100% equity exposure) |
| `BOND` | Bond/interest fund (100% bond/interest exposure) |
| `COMBINATION` | Mix of equity and bond (uses `equityPct`/`bondPct` split) |

---

## Spread Analysis Computation Model

These are not stored entities but derived computations over holdings and their linked profiles.

### Stock/Interest Balance (FR-016, FR-020)

For each holding with a linked profile:
- **Stock (instrumentType=STOCK)**: Full `displayValue` → equity bucket.
- **Fund (category=EQUITY)**: Full `displayValue` → equity bucket.
- **Fund (category=BOND)**: Full `displayValue` → interest bucket.
- **Fund (category=COMBINATION)**: `displayValue × equityPct/100` → equity; `displayValue × bondPct/100` → interest. If `equityPct`/`bondPct` missing → full value → Unclassified.
- **Missing profile or category**: Full `displayValue` → Unclassified.

### Sector Spread (FR-017, FR-019, FR-026)

For each holding with a linked profile:
- **Stock**: Full `displayValue` attributed to the stock's `sector`. If `sector` is null → Unclassified.
- **Fund with `sectorWeightings`**: For each sector, `displayValue × weightPct/100`. If weightings sum < 100%, remainder → Unclassified.
- **Missing profile or no weightings**: Full `displayValue` → Unclassified.

### Geographic Spread (FR-018, FR-019, FR-026)

For each holding with a linked profile:
- **Stock**: Full `displayValue` attributed to the stock's `country` (mapped to region). If `country` is null → Unclassified.
- **Fund with `geographicWeightings`**: For each region, `displayValue × weightPct/100`. If weightings sum < 100%, remainder → Unclassified.
- **Missing profile or no weightings**: Full `displayValue` → Unclassified.

### Predefined Categories

**Sectors** (GICS-based): Technology, Financials, Energy, Healthcare, Consumer Discretionary, Consumer Staples, Industrials, Materials, Utilities, Real Estate, Communication Services, Unclassified.

**Geographic Regions**: Norway, Nordics, Europe ex-Norway, North America, Asia-Pacific, Emerging Markets, Frontier Markets, Global/Other, Unclassified.

---

## State Transitions

### Enrichment Status Lifecycle

```
[Holding created] → PENDING
    │
    ├── Primary enrichment succeeds (all fields) → COMPLETE
    ├── Primary enrichment succeeds (some fields) → PARTIAL
    ├── Primary enrichment finds nothing → NOT_FOUND
    │
    ├── [User uploads document for PARTIAL/NOT_FOUND]
    │   ├── AI extraction adds remaining fields → COMPLETE
    │   └── AI extraction adds some fields → PARTIAL (improved)
    │
    └── [User triggers refresh]
        └── Re-runs primary enrichment → PENDING → (same transitions above)
```

### Profile Field Source Lifecycle

```
[Field empty] → enrichment populates → source: 'enrichment'
    │
    ├── AI extraction populates (if still empty) → source: 'ai_extraction'
    ├── User manually edits → source: 'user' (protected from refresh)
    │
    └── [Refresh triggered]
        ├── source: 'user' → PRESERVED (not overwritten)
        ├── source: 'enrichment' → OVERWRITTEN with fresh data
        └── source: 'ai_extraction' → OVERWRITTEN with fresh data
```
