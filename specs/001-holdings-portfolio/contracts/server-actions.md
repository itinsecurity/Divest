# Server Actions Contract

**Feature Branch**: `001-holdings-portfolio`
**Date**: 2026-03-13

All server actions require an authenticated session. All inputs validated via Zod schemas. All actions return a consistent result type.

---

## Result Type

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
```

---

## Holdings Actions (`actions/holdings.ts`)

### `createHolding(input)`

Creates a new holding and triggers async enrichment.

**Input** (Zod-validated):
```typescript
{
  instrumentIdentifier: string;  // Non-empty. Name, ticker, or ISIN.
  instrumentType: 'STOCK' | 'FUND';
  accountName: string;           // Non-empty.
  shares?: number;               // Required if STOCK. > 0.
  pricePerShare?: number;        // Required if STOCK. > 0.
  currentValue?: number;         // Required if FUND. > 0.
}
```

**Returns**: `ActionResult<Holding>` — the created holding with `enrichmentStatus: 'PENDING'`.

**Side effects**:
- Checks for existing `AssetProfile` by ISIN/ticker match; links if found.
- If no match, creates a new `AssetProfile` stub.
- Fires async enrichment via `POST /api/enrichment` (fire-and-forget).

**Errors**:
- Validation failure → `fieldErrors` with per-field messages.
- Duplicate holding (same account + instrument) → error message.

---

### `updateHolding(id, input)`

Updates a holding's editable fields.

**Input** (Zod-validated):
```typescript
{
  accountName?: string;      // Non-empty if provided.
  shares?: number;           // > 0 if provided. STOCK only.
  pricePerShare?: number;    // > 0 if provided. STOCK only.
  currentValue?: number;     // > 0 if provided. FUND only.
}
```

**Returns**: `ActionResult<Holding>` — the updated holding.

**Side effects**:
- If `pricePerShare`, `shares`, or `currentValue` changed → updates `lastUpdated` to current timestamp (FR-027).

**Errors**:
- Holding not found → error message.
- Validation failure → `fieldErrors`.

---

### `deleteHolding(id)`

Deletes a holding. Does not delete the linked `AssetProfile` if other holdings reference it.

**Input**: `{ id: string }`

**Returns**: `ActionResult<{ id: string }>` — the deleted holding's ID.

**Side effects**:
- If no remaining holdings reference the `AssetProfile`, the profile is orphaned but NOT deleted (may be useful for future holdings).

**Errors**:
- Holding not found → error message.

---

### `getHoldings(filter?)`

Retrieves all holdings, optionally filtered by account.

**Input** (optional):
```typescript
{
  accountName?: string;  // Filter by account name.
}
```

**Returns**: `ActionResult<HoldingWithProfile[]>` — holdings with linked asset profile data and computed `displayValue`.

---

## Profile Actions (`actions/profiles.ts`)

### `updateProfileField(profileId, field, value)`

Manually edits a single field on an asset profile.

**Input** (Zod-validated):
```typescript
{
  profileId: string;
  field: string;     // Must be a valid AssetProfile field name.
  value: unknown;    // Type depends on field (string, number, JSON object).
}
```

**Returns**: `ActionResult<AssetProfile>` — the updated profile.

**Side effects**:
- Sets `fieldSources[field].source` to `'user'`.
- If editing a shared profile, the change affects all linked holdings.

**Errors**:
- Profile not found → error message.
- Invalid field name → error message.
- Value fails type validation → error message.

---

### `refreshProfile(profileId)`

Triggers a manual re-fetch of enrichment data for a profile.

**Input**: `{ profileId: string }`

**Returns**: `ActionResult<{ profileId: string; status: 'accepted' }>` — confirmation that refresh was queued.

**Side effects**:
- Sets all linked holdings' `enrichmentStatus` to `PENDING`.
- Fires async enrichment via `POST /api/enrichment` (fire-and-forget).
- On completion, updates profile fields where `source !== 'user'`.

**Errors**:
- Profile not found → error message.

---

## Upload Actions (`actions/upload.ts`)

### `uploadDocument(profileId, formData)`

Uploads a document for AI secondary enrichment.

**Input**:
```typescript
{
  profileId: string;
  file: File;  // From FormData. Accepted: PDF, PNG, JPG, TXT, CSV, MD. Max 5MB.
}
```

**Returns**: `ActionResult<{ profileId: string; status: 'processing' }>` — confirmation that document was accepted.

**Side effects**:
- Validates file type and size (FR-007).
- Fires async AI extraction (fire-and-forget).
- On completion, merges extracted fields into profile (respecting source priority).
- Updates linked holdings' `enrichmentStatus` based on result.

**Errors**:
- Profile not found → error message.
- File too large (>5MB) → error message.
- Unsupported file type → error message with accepted formats.
