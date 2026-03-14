# Research: Holdings Registration and Portfolio Profile

**Feature Branch**: `001-holdings-portfolio`
**Date**: 2026-03-13

---

## 1. Next.js App Router Project Structure

**Decision**: Route-group layout with shared `lib/`, `actions/`, and `components/` directories under `src/`.

**Rationale**: Route groups `(auth)` and `(app)` enable different layouts (unauthenticated vs app shell) without affecting URLs. Private folders (`_components`, `_lib`) keep route-specific code colocated but non-routable. Top-level `lib/` holds shared server-side logic; `actions/` keeps server actions discoverable (imported by both server and client components). This is the recommended Next.js App Router pattern for medium-complexity apps.

**Alternatives Considered**:
- **Everything inside `app/`**: Simpler for tiny projects but clutters the routing directory with non-route code.
- **Feature-based folders** (`src/features/holdings/`): More scalable for large teams but over-engineered for single-developer. Violates Principle V (Simplicity/YAGNI).

---

## 2. Prisma Schema & Field-Level Source Tracking

**Decision**: JSON metadata column (`fieldSources`) on `AssetProfile` for tracking whether each field is enrichment-sourced or user-supplied. No separate metadata table.

**Rationale**: A JSON column avoids the row explosion of a separate `FieldMetadata` table (one row per field per profile). For a single-user app, the JSON approach is simpler and queryable enough. Prisma stores JSON as TEXT in SQLite and JSONB in PostgreSQL — works in both.

**Field sources structure**:
```typescript
type FieldSources = {
  [fieldName: string]: {
    source: 'enrichment' | 'user' | 'ai_extraction';
    enrichedAt?: string;   // ISO date
    provider?: string;     // e.g., "euronext", "morningstar"
  };
};
```

**SQLite/Postgres compatibility notes**:
- Use `provider = "postgresql"` in schema; switch via `DATABASE_URL` env var.
- SQLite emulates enums as string columns (Prisma handles this transparently).
- `Decimal` maps to `REAL` in SQLite (acceptable for local dev; Postgres in production).
- `Json` type works in both.
- Simplest local dev path: run Postgres via Docker, or accept SQLite limitations for dev.

**Alternatives Considered**:
- **Separate `FieldMetadata` table** (normalized): Creates N rows per asset profile, complicates every query. YAGNI.
- **Shadow columns** (`name` + `nameSource`): Doubles column count. Rigid when adding fields.
- **Separate boolean columns** (`nameIsUserSupplied`): Doesn't scale. Most rigid option.

---

## 3. Background Enrichment Processing

**Decision**: API route handler with fire-and-forget `fetch()` from server actions, backed by a simple in-process async queue.

**Rationale**: Single-user, self-hosted means the Node.js process is long-lived. No need for Redis, BullMQ, or any external queue infrastructure. The enrichment API route returns 202 Accepted immediately and processes work asynchronously in the Node.js event loop. The in-process queue deduplicates by asset profile ID to prevent concurrent enrichment of the same instrument.

**Pattern**:
1. Server action saves the holding, then calls `fetch('/api/enrichment', { method: 'POST', body: { assetProfileId } })` without awaiting.
2. API route handler enqueues work and returns 202.
3. Queue processes enrichment, updates `AssetProfile.enrichmentStatus` on completion.
4. If enrichment fails, status stays `PENDING` — user can re-trigger manually (US6).

**Why not server actions alone?** Server actions are synchronous from the client perspective — React tracks the action lifecycle. The client would wait for enrichment to complete before UI updates. API route handlers can return immediately.

**Alternatives Considered**:
- **BullMQ + Redis**: Production-grade but massive overkill for single-user. Adds infrastructure dependency violating Principle I (Portability).
- **Database-backed queue** (poll a `jobs` table): Unnecessary complexity for single-instance.
- **`after()` from Next.js 15**: Experimental API, ties enrichment to request lifecycle.

---

## 4. Public Financial Data Sources

**Decision**: HTTP fetch of publicly available data from Euronext JSON endpoints (Oslo Børs equities) and fund company/VFF sources (Norwegian funds), with HTML parsing fallback via `cheerio`.

**Rationale**: Euronext's frontend makes XHR requests to unauthenticated JSON endpoints discoverable via browser DevTools. These provide structured data for Oslo Børs-listed instruments without HTML parsing. For funds, Norwegian fund companies (DNB, Storebrand, KLP) and VFF publish NAV/profile data. All fetching sits behind an enrichment abstraction layer so data sources can be swapped.

**Legal/TOS considerations**:
- Personal-use, single-user, self-hosted, no data redistribution — low practical risk.
- Respect `robots.txt` and rate-limit all requests (≤1 req/sec).
- Morningstar TOS explicitly prohibit scraping — use as document-upload source (US3) rather than automated scraping.

**Source priority for stocks (Oslo Børs)**:
1. Euronext JSON endpoints (ISIN lookup, company profile)
2. Company investor relations pages (sector/industry if missing)

**Source priority for funds (Norwegian)**:
1. Fund company websites (DNB, Storebrand, KLP — NAV, category, sector/geo weightings)
2. VFF (Verdipapirfondenes Forening) — standardized fund data
3. Morningstar — manual document upload only (US3)

**Alternatives Considered**:
- **Paid data APIs** (Alpha Vantage, Financial Modeling Prep): Cost money, may not cover Norwegian funds. Can be added later behind abstraction.
- **Yahoo Finance API**: Unofficial, frequently breaks, poor Norwegian coverage.

---

## 5. AI Document Extraction

**Decision**: Multi-modal AI provider (behind abstraction layer) as primary extraction engine, with `unpdf` for text-based PDF pre-processing.

**Rationale**: Modern multi-modal AI models handle both text and image inputs and can parse complex table layouts in financial documents. Pre-extracting text from PDFs reduces token usage. For scanned PDFs or images, send raw file directly to multi-modal AI. Zod schema validation ensures AI output conforms to expected structure.

**Processing pipeline**:
1. Upload received (PDF, image, text, CSV, Markdown — max 5MB per FR-007).
2. If PDF with extractable text → extract via `unpdf` → send text to AI with structured prompt.
3. If scanned PDF or image → send raw file (base64) to multi-modal AI.
4. If CSV/text/Markdown → send content directly to AI.
5. AI returns structured data matching a Zod schema.
6. Merge extracted fields into existing profile (respecting source priority: user-supplied > enrichment > AI).

**AI provider abstraction**:
```typescript
interface AIProvider {
  extractStructuredData(input: {
    text?: string;
    fileBase64?: string;
    mimeType?: string;
    schema: ZodSchema;
  }): Promise<{ data: Record<string, unknown>; confidence: number }>;
}
```

**Alternatives Considered**:
- **Tesseract.js for OCR**: Heavy WASM/native dependency. Multi-modal AI does OCR and extraction in one step.
- **Amazon Textract / Google Document AI**: Paid, provider-specific, violates abstraction requirement.
- **`pdf-parse`**: Still functional but last published 2019. `unpdf` is actively maintained by the unjs team.

---

## 6. Testing Strategy

**Decision**: Vitest for unit/integration tests, Playwright for E2E, real SQLite database for integration tests.

**Rationale**: Vitest has native TypeScript/ESM support, 30-70% faster than Jest, and Next.js official docs treat it as first-class. Transaction-rollback pattern with real SQLite ensures database behavior is tested without mocks (constitution requirement). Playwright handles async Server Component testing that Vitest cannot.

**Testing layers**:
| Layer | Tool | What it covers |
|-------|------|---------------|
| Unit | Vitest | Financial calculations, spread logic, enrichment merging, Zod schemas |
| Integration | Vitest + real SQLite | Server actions, database operations, enrichment queue |
| Component | Vitest + React Testing Library | Client components, chart wrappers, form validation |
| E2E | Playwright | Full user flows (add holding → see spread), async Server Components |

**TDD workflow**: `vitest --watch` for sub-second red-green-refactor feedback. Playwright tests written first for E2E user stories.

**Alternatives Considered**:
- **Jest**: Requires more config for TypeScript/ESM. Performance disadvantage.
- **Cypress**: No WebKit support, slower, heavier RAM. Paid plan for parallelism.
- **Prisma mocks**: Constitution forbids mocks for financial logic. Real database only.

---

## 7. Auth Strategy

**Decision**: Auth.js v5 Credentials provider with username/password via environment variables, JWT sessions.

**Rationale**: For a single-user, self-hosted app, OAuth adds unnecessary external dependencies and requires internet connectivity — violating Principle I (Portability) and Principle V (Simplicity). Credentials provider validates against env-supplied `AUTH_USERNAME` and `AUTH_PASSWORD_HASH`. JWT sessions mean no database session table. Auth.js v5's universal `auth()` function works in server components, route handlers, middleware, and server actions.

**Abstraction layer**: Application code imports only from `lib/auth/`, never from `next-auth` or `@auth/*` directly. An `AuthProvider` interface wraps Auth.js so the provider can be swapped without touching business logic.

**Alternatives Considered**:
- **OAuth (GitHub/Google)**: External dependency, internet required, registration needed. Overkill.
- **Magic link/email**: Requires email service. Overkill.
- **Passkey/WebAuthn**: Interesting but YAGNI.

---

## 8. Visualization Approach

**Decision**: Recharts with `ResponsiveContainer`, donut charts for sector/geographic spread, stacked bar for stock/interest balance, warm grey for "Unclassified" bucket.

**Rationale**: Recharts is the canonical charting library per constitution. Donut charts (`PieChart` with `innerRadius`) display proportion data naturally. Stacked bar charts show equity/interest balance. "Unclassified" uses warm grey and is always positioned last — data visualization best practice (grey de-emphasizes less important categories). `ResponsiveContainer` handles responsive sizing.

**UI patterns**:
- Holdings list: native HTML `<table>` with Tailwind utilities (`divide-y`, `text-right` for numbers, `hover:bg-gray-50`).
- Spread views: Tailwind grid of cards (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3`).
- Status badges: semantic colors — complete (green), pending (amber), partial (blue), not found (red).

**Alternatives Considered**:
- **Tremor**: Higher-level Recharts wrapper but adds non-canonical dependency.
- **TanStack Table**: Powerful but YAGNI for initial holdings list.
- **shadcn/ui**: May adopt selectively later; not a dependency for MVP.
