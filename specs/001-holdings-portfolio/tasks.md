# Tasks: Holdings Registration and Portfolio Profile

**Input**: Design documents from `/specs/001-holdings-portfolio/`
**Branch**: `001-holdings-portfolio` | **Date**: 2026-03-13
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Included — TDD is mandatory per constitution Principle IV. Tests are written first (red → green → refactor).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- All file paths are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, and test infrastructure.

- [x] T001 Initialize Next.js 15 App Router project with TypeScript in repository root (`npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-git`)
- [x] T002 Install all primary dependencies: Prisma 6, Auth.js v5, Recharts 2, Zod, Vitest, `@vitest/coverage-v8`, React Testing Library, Playwright, `unpdf`, `cheerio`, `bcryptjs`, `@types/bcryptjs`
- [x] T003 [P] Configure Vitest with Next.js environment: create `vitest.config.ts` at root; configure `vitest.setup.ts`; add `test`, `test:watch`, `test:integration`, `test:e2e`, `lint`, `typecheck` scripts to `package.json`
- [x] T004 [P] Configure Playwright: create `playwright.config.ts` at root targeting `localhost:3000`; create `tests/e2e/` directory
- [x] T005 [P] Create `tests/unit/` and `tests/integration/` directory structure mirroring `src/`; create `.env.example` with all required env vars (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_USERNAME`, `AUTH_PASSWORD_HASH`, `AI_PROVIDER`, `AI_API_KEY`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T006 Define Prisma schema in `prisma/schema.prisma`: `Holding` and `AssetProfile` models with all fields from data-model.md (`InstrumentType`, `EnrichmentStatus`, `FundCategory` enums; `fieldSources Json`; `@@unique([accountName, instrumentIdentifier])` on Holding)
- [x] T007 Run `npx prisma generate` and `npx prisma db push`; implement Prisma client singleton in `src/lib/db.ts` (global instance pattern for Next.js dev hot-reload safety)
- [x] T008 [P] Implement Auth.js v5 abstraction layer: define `AuthProvider` interface in `src/lib/auth/types.ts`; implement credentials provider with `AUTH_USERNAME`/`AUTH_PASSWORD_HASH` env vars in `src/lib/auth/authjs.ts`; re-export active provider in `src/lib/auth/index.ts`
- [x] T009 [P] Implement auth middleware in `src/middleware.ts` protecting all `/(app)` routes; redirect unauthenticated requests to `/login`
- [x] T010 [P] Define all shared TypeScript types in `src/types/index.ts`: `ActionResult<T>`, `HoldingWithProfile`, `SpreadBucket`, `StockInterestBalance`, `SpreadAnalysis`, `FieldSources` (from contracts/api-routes.md and data-model.md)
- [x] T011 [P] Create login page UI in `src/app/(auth)/login/page.tsx` (username/password form calling Auth.js `signIn`) and `src/app/(auth)/layout.tsx` (bare layout, no app shell)
- [x] T012 Create root layout in `src/app/layout.tsx` (HTML shell, providers) and root page `src/app/page.tsx` (redirect to `/holdings`)
- [x] T013 [P] Create app shell layout with navigation in `src/app/(app)/layout.tsx` (nav links to `/holdings` and `/portfolio`, session-aware)
- [x] T014 [P] Implement AI provider abstraction layer: define `AIProvider` interface with `extractStructuredData()` in `src/lib/ai/types.ts`; scaffold active provider re-export in `src/lib/ai/index.ts` (wire to `AI_PROVIDER` env var)

**Checkpoint**: Foundation ready — auth works, database schema applied, shared types defined, app shell renders. User story implementation can now begin.

---

## Phase 3: User Story 1 — Register a Holding (Priority: P1) 🎯 MVP

**Goal**: User can add a stock or fund holding with validation; it saves immediately and appears in the holdings list with correct value and "pending" enrichment status.

**Independent Test**: Add a stock holding (ticker: DNB, type: stock, account: "Nordnet ASK", 100 shares at 200 NOK) and a fund holding (ISIN: NO0008001872, type: fund, account: "DNB pensjonskonto", value: 50,000 NOK). Verify both appear in the list with correct `displayValue` and `enrichmentStatus: PENDING`.

### Tests for User Story 1

> **Write these tests FIRST. Ensure they FAIL before implementation.**

- [x] T015 [P] [US1] Unit tests for `createHolding`, `updateHolding`, `deleteHolding`, `getHoldings` Zod input schemas — all valid/invalid input combinations — in `tests/unit/actions/holdings.test.ts`
- [x] T016 [P] [US1] Integration tests for `createHolding` server action against real SQLite: successful stock creation, successful fund creation, duplicate rejection, missing field validation in `tests/integration/actions/holdings.test.ts`
- [x] T017 [P] [US1] E2E test: navigate to `/holdings`, add stock holding, add fund holding, verify both appear in list with correct values and PENDING badge in `tests/e2e/holdings.spec.ts`

### Implementation for User Story 1

- [x] T018 [P] [US1] Implement `createHolding`, `updateHolding`, `deleteHolding`, `getHoldings` server actions with Zod validation, `displayValue` computation, and `lastUpdated` auto-set in `src/actions/holdings.ts`
- [x] T019 [P] [US1] Create shared UI primitives: enrichment status badge (PENDING=amber, COMPLETE=green, PARTIAL=blue, NOT_FOUND=red) in `src/components/ui/StatusBadge.tsx`; user-supplied field indicator in `src/components/ui/UserSuppliedBadge.tsx`
- [x] T020 [US1] Build holdings list page with native HTML `<table>` (Tailwind `divide-y`, `text-right` for numbers, `hover:bg-gray-50`), account filter dropdown, and "Add Holding" button in `src/app/(app)/holdings/page.tsx`
- [x] T021 [US1] Build "Add Holding" form with type-conditional fields (stock: shares + pricePerShare; fund: currentValue), Zod client-side validation, and `createHolding` action wiring in `src/app/(app)/holdings/page.tsx`
- [x] T022 [US1] Build holding detail/edit page with edit form (account, amount fields), `updateHolding` action wiring, delete button with `deleteHolding` action, and `lastUpdated` timestamp display in `src/app/(app)/holdings/[id]/page.tsx`

**Checkpoint**: US1 complete — holdings list renders, stock/fund holdings can be added, edited, and deleted. No enrichment yet.

---

## Phase 4: User Story 2 — Primary Asset Profile Enrichment (Priority: P1)

**Goal**: After a holding is saved, system automatically fetches asset profile data from public sources (Euronext, fund companies) asynchronously. Holding status updates from PENDING to COMPLETE, PARTIAL, or NOT_FOUND. Existing profiles are reused without re-fetching.

**Independent Test**: Add a DNB Bank ASA stock holding; wait for enrichment; verify linked asset profile contains company name, exchange, ticker, ISIN, country, and sector. Add a second holding for the same instrument; verify it links to the existing profile without re-fetching.

### Tests for User Story 2

> **Write these tests FIRST. Ensure they FAIL before implementation.**

- [x] T023 [P] [US2] Unit tests for enrichment queue: enqueue, deduplication by `assetProfileId`, sequential processing in `tests/unit/enrichment/queue.test.ts`
- [x] T024 [P] [US2] Unit tests for primary enrichment profile merge: field source priority logic (user-supplied preserved, enrichment fills empty fields) in `tests/unit/enrichment/merge.test.ts`
- [x] T025 [P] [US2] Unit tests for Euronext and fund company fetchers with mocked HTTP responses; ISIN lookup, fallback to ticker/name in `tests/unit/enrichment/primary.test.ts`
- [x] T026 [P] [US2] Integration tests for `POST /api/enrichment` route: valid request returns 202, invalid body returns 400, unknown profile returns 404, real queue enqueue in `tests/integration/api/enrichment.test.ts`

### Implementation for User Story 2

- [x] T027 [P] [US2] Implement in-process enrichment queue with deduplication by `assetProfileId` and profile-match lookup (ISIN first, ticker fallback) in `src/lib/enrichment/queue.ts`
- [x] T028 [P] [US2] Implement field merge utility respecting source priority (`user` > `enrichment` > `ai_extraction`): populates empty fields only; updates `fieldSources` JSON in `src/lib/enrichment/types.ts`
- [x] T029 [P] [US2] Implement primary enrichment fetchers: Euronext JSON endpoint for Oslo Børs stocks (ISIN lookup → company name, exchange, ticker, country, sector); fund company fetchers (DNB, Storebrand, KLP, VFF) for fund category/weightings in `src/lib/enrichment/primary.ts` (rate-limit ≤1 req/sec)
- [x] T030 [US2] Implement `POST /api/enrichment` route handler: Zod validation, `assetProfileId` existence check, enqueue, return 202 in `src/app/api/enrichment/route.ts`
- [x] T031 [US2] Update `createHolding` in `src/actions/holdings.ts` to fire-and-forget `fetch('/api/enrichment', { method: 'POST', body: { assetProfileId } })` after saving; check for existing profile by ISIN/ticker match before creating stub
- [x] T032 [US2] Display enrichment results on holding detail page: populated asset profile fields with source labels (enrichment/ai_extraction); prompt for document upload when status is NOT_FOUND in `src/app/(app)/holdings/[id]/page.tsx`

**Checkpoint**: US2 complete — enrichment runs automatically, statuses update, profiles populate for well-known instruments.

---

## Phase 5: User Story 3 — AI Secondary Enrichment via Document Upload (Priority: P2)

**Goal**: User can upload a PDF/image/text document (≤5 MB); AI agent extracts profile fields; fields merge without overwriting existing enrichment or user-supplied data. Status updates after processing.

**Independent Test**: Upload a Morningstar PDF for a fund with NOT_FOUND status; verify AI extracts profile fields (fund name, category, sector/geo weightings) and status updates to PARTIAL or COMPLETE.

### Tests for User Story 3

> **Write these tests FIRST. Ensure they FAIL before implementation.**

- [x] T033 [P] [US3] Unit tests for AI extraction pipeline: `unpdf` text extraction from PDF, direct content pass-through for text/CSV/MD, base64 encoding for images, Zod schema validation of AI response in `tests/unit/enrichment/secondary.test.ts`
- [x] T034 [P] [US3] Unit tests for `uploadDocument` action: accepted file types, size limit enforcement (>5 MB rejected), profile-not-found error in `tests/unit/actions/upload.test.ts`
- [x] T035 [P] [US3] Integration tests for `uploadDocument` action: file accepted → AI extraction result merged into profile → holding status updated, and no-data-extracted → status unchanged in `tests/integration/actions/upload.test.ts`

### Implementation for User Story 3

- [x] T036 [P] [US3] Implement secondary enrichment pipeline in `src/lib/enrichment/secondary.ts`: route by file type (PDF→`unpdf` text extraction or raw base64; image→base64; text/CSV/MD→direct), call AI provider with structured extraction prompt and Zod output schema, return extracted `AssetProfile` fields with confidence score
- [x] T037 [P] [US3] Implement `uploadDocument` server action in `src/actions/upload.ts`: validate file type (PDF, PNG, JPG, TXT, CSV, MD) and size (≤5 MB), fire-and-forget `POST /api/enrichment` with `type:'secondary'`, `documentBase64`, and `documentMimeType`
- [x] T038 [US3] Extend `POST /api/enrichment` route in `src/app/api/enrichment/route.ts` to handle `type:'secondary'`: validate `documentBase64`/`documentMimeType` present, enqueue secondary enrichment, apply merge with `source:'ai_extraction'` (skips user-supplied and enrichment-sourced fields)
- [x] T039 [US3] Build document upload UI in `src/app/(app)/holdings/[id]/page.tsx`: show upload prompt when status is NOT_FOUND/PARTIAL, proactive "Upload Document" button always visible, file input with client-side type/size validation, processing state indicator

**Checkpoint**: US3 complete — document upload works, AI extracts profile data, merge respects source priority.

---

## Phase 6: User Story 4 — View Spread Analysis (Priority: P2)

**Goal**: User can view three spread analysis views (stock/interest balance, sector spread, geographic spread) weighted by current NOK value; Unclassified bucket shown for missing data; incomplete holdings clearly indicated; account filter works.

**Independent Test**: Add a 50,000 NOK stock holding (fully enriched) and a 50,000 NOK BOND fund (fully enriched). Navigate to `/portfolio`; verify stock/interest balance shows 50% equity / 50% interest. Add a 80,000 NOK COMBINATION fund with no equity/bond split; verify its full value appears in Unclassified.

### Tests for User Story 4

> **Write these tests FIRST. Ensure they FAIL before implementation.**

- [x] T040 [P] [US4] Unit tests for `computeStockInterestBalance`: STOCK→equity, EQUITY fund→equity, BOND fund→interest, COMBINATION fund with split, COMBINATION fund without split→Unclassified, missing profile→Unclassified in `tests/unit/spread/stockInterest.test.ts`
- [x] T041 [P] [US4] Unit tests for `computeSectorSpread` and `computeGeographicSpread`: stock full value→single sector/region, fund with weightings (proportional), fund weightings sum <100% (remainder→Unclassified), null sector/country→Unclassified in `tests/unit/spread/spread.test.ts`
- [x] T042 [P] [US4] Integration tests for spread data aggregation over real holdings+profiles with account filter applied in `tests/integration/spread/spread.test.ts`
- [x] T043 [P] [US4] E2E test: navigate to `/portfolio`, verify three spread views render, verify account filter updates chart data in `tests/e2e/portfolio.spec.ts`

### Implementation for User Story 4

- [x] T044 [P] [US4] Implement spread computation functions in `src/lib/spread.ts`: `computeStockInterestBalance(holdings)`, `computeSectorSpread(holdings)`, `computeGeographicSpread(holdings)` — all using `displayValue`, Unclassified bucket, proportional fund weighting, `incompleteHoldings` count
- [x] T045 [P] [US4] Create Recharts chart components in `src/components/charts/`: `DonutChart.tsx` (sector/geographic spread, `PieChart` with `innerRadius`, Unclassified in warm grey last), `StackedBarChart.tsx` (stock/interest balance, `BarChart`)
- [x] T046 [US4] Build portfolio spread analysis page in `src/app/(app)/portfolio/page.tsx`: account filter dropdown (shared with holdings list), three chart sections (stock/interest, sector, geographic) using computation functions + chart components, incomplete holdings warning banner when `incompleteHoldings > 0`

**Checkpoint**: US4 complete — all three spread views render correctly with Unclassified bucket and account filtering.

---

## Phase 7: User Story 5 — Manually Edit Asset Profile Fields (Priority: P3)

**Goal**: User can edit any profile field; field is saved with `source:'user'` and visually distinguished as "user-supplied"; preserved through all subsequent enrichment operations.

**Independent Test**: Edit the "Technology" sector weighting on a fund profile to 35%; verify the field is saved, marked user-supplied in UI, and `fieldSources.sectorWeightings.source === 'user'` in the database.

### Tests for User Story 5

> **Write these tests FIRST. Ensure they FAIL before implementation.**

- [x] T047 [P] [US5] Unit tests for `updateProfileField` action: valid field edit sets `source:'user'` in fieldSources, invalid field name rejected, profile not found error in `tests/unit/actions/profiles.test.ts`
- [x] T048 [P] [US5] Integration tests for `updateProfileField` then trigger simulated enrichment merge: user-supplied field preserved, non-user fields overwritten in `tests/integration/actions/profiles.test.ts`

### Implementation for User Story 5

- [x] T049 [P] [US5] Implement `updateProfileField(profileId, field, value)` server action in `src/actions/profiles.ts`: validate field name against `AssetProfile` schema, update field value and set `fieldSources[field].source = 'user'`, return updated profile; include shared-profile warning in action result when multiple holdings linked
- [x] T050 [US5] Add inline field editing to asset profile display in `src/app/(app)/holdings/[id]/page.tsx`: click-to-edit per field, `UserSuppliedBadge` on fields with `source:'user'`, shared-profile warning dialog before saving, optimistic UI update

**Checkpoint**: US5 complete — all profile fields editable inline; user-supplied fields visually marked and persist through enrichment.

---

## Phase 8: User Story 6 — Refresh Asset Profile (Priority: P3)

**Goal**: User can trigger a manual re-fetch for any asset profile; enrichment-sourced and ai_extraction-sourced fields update; user-supplied fields are unconditionally preserved.

**Independent Test**: Edit one profile field (user-supplied), then trigger refresh; verify the user-supplied field is unchanged while enrichment-sourced fields are updated.

### Tests for User Story 6

> **Write these tests FIRST. Ensure they FAIL before implementation.**

- [x] T051 [P] [US6] Unit tests for `refreshProfile` action: sets all linked holdings to PENDING, fires enrichment; and for refresh merge: user-supplied fields preserved, enrichment/ai_extraction fields overwritten in `tests/unit/actions/profiles.test.ts`
- [x] T052 [P] [US6] Integration tests for full refresh cycle: trigger refresh → enrichment runs → user-supplied field preserved, other fields updated in `tests/integration/actions/profiles.test.ts`

### Implementation for User Story 6

- [x] T053 [P] [US6] Implement `refreshProfile(profileId)` server action in `src/actions/profiles.ts`: set all linked holdings' `enrichmentStatus` to `PENDING`, fire-and-forget `POST /api/enrichment` with `type:'primary'`; update enrichment merge on completion to overwrite `enrichment`/`ai_extraction` sources while skipping `user` sources
- [x] T054 [US6] Add "Refresh Profile" button to holding detail page in `src/app/(app)/holdings/[id]/page.tsx` calling `refreshProfile`; show PENDING status while refresh is in progress; update UI when enrichment completes

**Checkpoint**: US6 complete — manual profile refresh works; source priority unconditionally preserved.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Seed data, CI integration, npm scripts, and final validation.

- [x] T055 [P] Create `prisma/seed.ts` with sample data: 2 accounts, 3 holdings (1 stock with complete profile, 1 fund with partial profile, 1 fund with NOT_FOUND status), appropriate `fieldSources` entries
- [x] T056 [P] Replace placeholder CI lint and test jobs in `.github/workflows/ci.yml` with real jobs: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:integration`
- [x] T057 [P] Add npm ecosystem entry to `.github/dependabot.yml` for weekly Node.js package updates
- [x] T058 [P] Audit all server actions and the enrichment API route for consistent error handling: unknown profile IDs, database errors, enrichment failures — all return `ActionResult` or appropriate HTTP status
- [x] T059 Run full quickstart.md validation: `npm install`, `npx prisma db push`, `npx prisma db seed`, `npm run dev` (manual smoke test), `npm run test`, `npm run test:integration`, `npm run test:e2e` — all pass
- [x] T060 [P] Verify edge cases from spec.md: two holdings for same instrument link to same profile; shared-profile edit warning fires; all-NOT_FOUND portfolio shows "no enrichment data" message; ISIN mismatch alert

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Phase 2 — no dependency on other user stories
- **US2 (Phase 4)**: Depends on Phase 2 + US1 complete (enrichment fires from `createHolding`)
- **US3 (Phase 5)**: Depends on Phase 2 + US2 complete (extends enrichment API route)
- **US4 (Phase 6)**: Depends on Phase 2 + US1 complete (needs holdings + profiles for spread data); can parallel with US3
- **US5 (Phase 7)**: Depends on Phase 2 + US2 complete (needs profiles to exist)
- **US6 (Phase 8)**: Depends on US5 complete (refresh must preserve user-supplied fields)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Phase 1 (Setup)
    └── Phase 2 (Foundational)
            ├── US1 (P1) — Register Holding
            │       └── US2 (P1) — Primary Enrichment
            │               ├── US3 (P2) — AI Secondary Enrichment
            │               └── US5 (P3) — Manual Profile Edit
            │                       └── US6 (P3) — Refresh Profile
            └── US1 (P1) — Register Holding
                    └── US4 (P2) — Spread Analysis  [can parallel with US3]
```

### Within Each User Story

1. Write tests first → confirm they fail
2. Models/types before services
3. Services before pages/UI
4. Core implementation before integration wiring
5. Commit after each task or logical group

### Parallel Opportunities

- All Phase 1 tasks marked [P] can run in parallel
- All Phase 2 tasks marked [P] can run in parallel after T006/T007
- Within each user story, all tasks marked [P] can run in parallel
- US3 and US4 can run in parallel once US2 is complete
- US5 and US4 can run in parallel once US2 is complete

---

## Parallel Example: User Story 1

```bash
# Write all US1 tests first (in parallel — different files):
Task: T015 — Unit tests for Zod schemas in tests/unit/actions/holdings.test.ts
Task: T016 — Integration tests for createHolding in tests/integration/actions/holdings.test.ts
Task: T017 — E2E test for add holding flow in tests/e2e/holdings.spec.ts

# Then implement in parallel where possible:
Task: T018 — Server actions in src/actions/holdings.ts
Task: T019 — Status badge component in src/components/ui/StatusBadge.tsx
```

## Parallel Example: User Story 4

```bash
# Tests and computation logic in parallel:
Task: T040 — Unit tests for stock/interest computation
Task: T041 — Unit tests for sector/geographic computation
Task: T044 — Spread computation functions in src/lib/spread.ts
Task: T045 — Chart components in src/components/charts/
# Then wire together:
Task: T046 — Portfolio page in src/app/(app)/portfolio/page.tsx
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

Both US1 and US2 are P1. US2 depends on US1. Together they form the minimal viable product — holdings can be registered and automatically enriched.

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (Register Holding)
4. **VALIDATE**: Both holdings can be added and appear in list ✅
5. Complete Phase 4: User Story 2 (Primary Enrichment)
6. **VALIDATE**: Enrichment runs, profiles populate for DNB Bank ASA ✅
7. **STOP and DEMO** — portfolio has data; spread views remain for next increment

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 + US2 → Holdings registered + enriched → **Deploy/Demo (MVP)**
3. US3 + US4 → Document upload + spread views → **Deploy/Demo**
4. US5 + US6 → Profile editing + refresh → **Deploy/Demo**
5. Polish → CI live, seed data, edge case validation → **Final**

---

## Notes

- [P] tasks = operate on different files, no dependency on incomplete siblings
- [Story] label maps each task to a specific user story for traceability
- Each user story is independently completable and testable
- Tests MUST fail before implementing (TDD — constitution Principle IV)
- Real SQLite for integration tests — no mocks (constitution Principle IV)
- Rate-limit all public source fetches to ≤1 req/sec (research.md)
- Morningstar: document upload only — no automated scraping (research.md)
- Shared profile edits affect all linked holdings — warn user before saving (spec.md edge cases)
- "Unclassified" bucket must always be visible when any value cannot be attributed (FR-019, FR-021, FR-026)
