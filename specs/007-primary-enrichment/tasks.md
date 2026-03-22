# Tasks: Live Primary Enrichment

**Input**: Design documents from `/specs/007-primary-enrichment/`
**Branch**: `007-primary-enrichment`
**Spec**: specs/007-primary-enrichment/spec.md
**Plan**: specs/007-primary-enrichment/plan.md

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths required in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prisma schema changes and type system updates required before any implementation can begin.

- [X] T001 Add EnrichmentCache model to prisma/schema.prisma: fields id (cuid), cacheKey (unique String), data (String/JSON), source (String), expiresAt (DateTime), createdAt (DateTime default now)
- [X] T002 Add EnrichmentCandidate model to prisma/schema.prisma: fields id (cuid), assetProfileId (String, FK to AssetProfile with onDelete Cascade), name, ticker?, isin?, exchange?, instrumentType, sourceId, rawData (String/JSON), score (Int default 0), createdAt; add `candidates EnrichmentCandidate[]` relation to AssetProfile model
- [X] T003 Run `npx prisma migrate dev --name add-enrichment-cache-and-candidates` to generate and apply migration, then verify with `npx prisma generate`
- [X] T004 Update src/types/index.ts: add `"NEEDS_INPUT"` to the `enrichmentStatus` union on `HoldingWithProfile`; add `EnrichmentCandidateData` type (id, name, ticker?, isin?, exchange?, instrumentType, sourceId); add `candidates: EnrichmentCandidateData[]` field to `HoldingWithProfile`

**Checkpoint**: Schema applied, types updated — foundational modules can now be implemented

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities required by all user story phases. TDD: tests written and confirmed failing before each implementation.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Write failing unit tests for `normalizeIdentifier` in tests/unit/enrichment/normalizer.test.ts: cover ISIN detection (uppercase, regex match), ticker detection (≤6 alphanum, no spaces), name fallback, whitespace trimming and collapsing; confirm tests fail before implementation
- [X] T006 Implement src/lib/enrichment/normalizer.ts: export `normalizeIdentifier(raw: string): IdentifierInfo` with ISIN regex `/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/`, trim + whitespace collapse, detectedType logic; make T005 tests pass
- [X] T007 [P] Write failing unit tests for `waitForRateLimit` in tests/unit/enrichment/rate-limiter.test.ts: verify no delay on first call to a host, verify ≥1s delay enforced on rapid successive calls to same host, verify different hosts are tracked independently; confirm tests fail before implementation
- [X] T008 [P] Implement src/lib/enrichment/rate-limiter.ts: module-level `Map<string, number>` of hostname → last-request timestamp; export `waitForRateLimit(url: string): Promise<void>` that sleeps the remainder of 1,000ms if elapsed < 1,000ms; make T007 tests pass
- [X] T009 [P] Write failing unit tests for `getCached` / `setCached` in tests/unit/enrichment/cache.test.ts: verify getCached returns null on miss, returns null on expired entry (expiresAt in the past), returns parsed data on hit; verify setCached writes a row with correct cacheKey and future expiresAt; confirm tests fail before implementation
- [X] T010 Implement src/lib/enrichment/cache.ts: export `getCached(key: string)` and `setCached(key, data, source)` using prisma.enrichmentCache; TTL from `parseInt(process.env.ENRICHMENT_CACHE_TTL_HOURS ?? "24") * 3_600_000`; make T009 tests pass
- [X] T011 [P] Write failing unit tests for `scoreCandidate` and `shouldAutoSelect` in tests/unit/enrichment/candidates.test.ts: verify exact-ISIN match scores 100, exact-ticker match scores 80, exact-name scores 60, partial-name scores 20; verify shouldAutoSelect returns top candidate when score gap ≥ 40, returns null when gap < 40, returns the single candidate when only one exists; confirm tests fail before implementation
- [X] T012 [P] Implement src/lib/enrichment/candidates.ts: export `scoreCandidate(candidate: CandidateData, identifier: IdentifierInfo): number` and `shouldAutoSelect(scored: ScoredCandidate[]): ScoredCandidate | null` with AUTO_SELECT_SCORE_GAP = 40; make T011 tests pass
- [X] T013 Create src/lib/enrichment/sources/registry.ts: define and export TypeScript interfaces only — `IdentifierInfo`, `CandidateData`, `ScoredCandidate`, `SourceResult` (discriminated union: found/multiple/not_found/error), `DataSource` interface with fields id, supportedTypes, fetch(); no implementations, no source instances yet

**Checkpoint**: All foundational utilities tested and passing — user story implementation can begin

---

## Phase 3: User Story 1 — Unambiguous Stock Lookup (Priority: P1) 🎯 MVP

**Goal**: When a user adds a holding with a stock identifier (ISIN, ticker, or name), the system looks up the instrument on Euronext Oslo, fills in the asset profile (name, ticker, ISIN, exchange, country), and sets the status to COMPLETE or PARTIAL.

**Independent Test**: Add a holding with identifier "NO0010096985" (Equinor ISIN) and type "stock". After enrichment completes, the profile has name = "EQUINOR ASA" (or similar), ticker = "EQNR", ISIN = "NO0010096985", exchange = "Oslo Bors", country = "Norway". Sector/industry will be absent → status = PARTIAL.

- [X] T014 [US1] Write failing unit tests for the Euronext source in tests/unit/enrichment/sources/euronext.test.ts: mock `global.fetch` to return a sample `searchJSON` response (JSON array with ISIN, MIC, name, label HTML); verify the source parses ticker from `.instrument-symbol` in the label HTML using cheerio; verify MIC → exchange name mapping (XOSL→"Oslo Bors", MERK→"Euronext Growth Oslo"); verify ISIN prefix → country mapping (NO→"Norway", SE→"Sweden", DK→"Denmark", FI→"Finland", GB→"United Kingdom"); verify "not_found" returned on empty result; verify correct headers sent (X-Requested-With: XMLHttpRequest); confirm tests fail before implementation
- [X] T015 [US1] Implement src/lib/enrichment/sources/euronext.ts: export `euronextSource: DataSource` with id="euronext", supportedTypes=["STOCK"]; fetch `https://live.euronext.com/en/instrumentSearch/searchJSON?q={identifier.normalized}` with browser-like headers including `X-Requested-With: XMLHttpRequest`; parse JSON array, exclude last "See all results" element; parse ticker from label HTML using cheerio; score each candidate via `scoreCandidate` from candidates.ts; call `shouldAutoSelect`; return "found"/"multiple"/"not_found" accordingly; apply waitForRateLimit before the fetch; make T014 tests pass
- [X] T016 [US1] Write failing integration test for unambiguous stock enrichment in tests/integration/enrichment/primary.test.ts: create a STOCK holding + AssetProfile in the test DB; mock global.fetch to return a realistic Euronext searchJSON response with one clear match; call `runPrimaryEnrichment(profileId)`; assert profile is updated with name/ticker/ISIN/exchange/country; assert holding enrichmentStatus = "PARTIAL" (sector/industry absent); confirm test fails before T017
- [X] T017 [US1] Rewrite src/lib/enrichment/primary.ts to use source registry orchestration: (1) load profile, skip if COMPLETE and no re-enrich flag; (2) normalizeIdentifier; (3) checkCache — if hit, apply cached data + update holdings + return; (4) loop over SOURCES array (from registry, filtered by instrumentType) — call waitForRateLimit, call source.fetch, handle found/multiple/not_found/error results; (5) on "found": setCached, apply data via mergeProfileFields, break loop; (6) on "multiple": call shouldAutoSelect — if null, persist candidates to DB, set holdings to NEEDS_INPUT, return early; if selected, treat as "found"; (7) after loop, determineStatus (stock: name+ticker+isin+exchange+country = COMPLETE; any missing = PARTIAL; none = NOT_FOUND; fund: name+fundManager+fundCategory+equityPct+bondPct = COMPLETE); (8) updateAssetProfile + updateHoldings; import euronextSource and assemble SOURCES = [euronextSource] for now; make T016 tests pass
- [X] T018 [US1] Update tests/unit/enrichment/primary.test.ts: rewrite or replace tests for the stub to test the new orchestration; mock getCached, setCached, euronextSource.fetch, and prisma; verify the loop, cache-hit shortcut, and NOT_FOUND path all work; ensure all tests pass
- [X] T019 [US1] Write Playwright E2E test for stock enrichment happy path in tests/e2e/enrichment.spec.ts: mock external HTTP at the Node.js fetch level (use environment variable `ENRICHMENT_TEST_MODE=true` or test fixture intercept) to return a known Euronext response; login, add a holding with identifier "NO0010096985" and type "Stock"; poll holding detail page until enrichmentStatus is no longer "PENDING" (max 30s); assert profile shows ticker "EQNR" and exchange "Oslo Bors"; assert status badge shows "Partial" (sector/industry absent from Euronext)

**Checkpoint**: Stock lookup end-to-end working. Can add Equinor by ISIN and get name/ticker/exchange/country populated.

---

## Phase 4: User Story 2 — Unambiguous Fund Lookup (Priority: P2)

**Goal**: When a user adds a holding with a fund identifier (ISIN or name), the system fetches the Morningstar Fund Profile PDF via the Storebrand document API, parses it, and fills in all fund profile fields (name, manager, category, equityPct, bondPct, sectorWeightings, geographicWeightings), setting the status to COMPLETE.

**Independent Test**: Add a holding with identifier "NO0010817851" (a Storebrand fund ISIN) and type "fund". After enrichment, the profile has fundManager, fundCategory, equityPct, bondPct populated and holding status = COMPLETE (all required fund fields present).

- [X] T020 [US2] Write failing unit tests for the Storebrand source in tests/unit/enrichment/sources/storebrand.test.ts: mock `global.fetch` to return a PDF buffer (use a minimal test PDF fixture); mock `unpdf` extractText to return a known text string with fund profile fields; verify parsing extracts fundManager, fundCategory (mapped to EQUITY|BOND|COMBINATION), equityPct, bondPct, sectorWeightings (object), geographicWeightings (object); verify "not_found" returned on HTTP error or when no fields extracted; verify correct URL constructed for a given ISIN; confirm tests fail before implementation
- [X] T021 [US2] Implement src/lib/enrichment/sources/storebrand.ts: export `storebrandSource: DataSource` with id="storebrand", supportedTypes=["FUND"]; on fetch: if identifier.detectedType !== "ISIN", return "not_found" (requires ISIN for this source — name-based fund lookup is handled by web search fallback); fetch `https://api.fund.storebrand.no/open/funddata/document?documentType=FUND_PROFILE&isin={identifier.normalized}&languageCode=en-GB&market=NOR`; on non-200, return "not_found"; extract PDF text with unpdf `extractText()`; apply regex patterns to extract all fund fields; return "found" with extracted data or "not_found" if extraction yields nothing; apply waitForRateLimit before the fetch; make T020 tests pass
- [X] T022 [US2] Extend src/lib/enrichment/primary.ts: import storebrandSource, update SOURCES array to `[euronextSource, storebrandSource]`; update `determineStatus` fund-fields list to `["name", "fundManager", "fundCategory", "equityPct", "bondPct"]`; existing orchestration loop handles funds without further changes
- [X] T023 [US2] Extend tests/integration/enrichment/primary.test.ts with fund enrichment scenario: create a FUND holding + AssetProfile in test DB; mock global.fetch to return a realistic PDF response (mock unpdf text extraction); call `runPrimaryEnrichment(profileId)`; assert profile updated with fund fields; assert holding enrichmentStatus = "COMPLETE" when all fund fields populated
- [X] T024 [US2] Extend tests/e2e/enrichment.spec.ts with fund enrichment happy path: mock Storebrand API response; login, add a holding with identifier for a known Norwegian fund ISIN and type "Fund"; poll detail page until status is no longer "PENDING"; assert profile shows fundManager and fundCategory fields

**Checkpoint**: Fund lookup working. DNB or Storebrand fund by ISIN yields a complete fund profile.

---

## Phase 5: User Story 3 — Ambiguous Identifier Disambiguation (Priority: P3)

**Goal**: When an identifier matches multiple comparably strong candidates, the holding is saved immediately with NEEDS_INPUT status. Candidates are persisted and shown on the holding detail page. The user can select the correct instrument; enrichment then resumes.

**Independent Test**: Add a holding with identifier "STO" (ambiguous — matches Storebrand ASA and other instruments). Holding saves immediately. Detail page shows a disambiguation card listing candidates with name/ticker/ISIN/exchange. Selecting one applies its data and re-queues enrichment.

- [X] T025 [US3] Write failing integration tests for NEEDS_INPUT status in tests/integration/enrichment/primary.test.ts: mock Euronext searchJSON to return two candidates with comparable scores (both partial name match, no ISIN/ticker exact match); call `runPrimaryEnrichment(profileId)`; assert holding enrichmentStatus = "NEEDS_INPUT"; assert two EnrichmentCandidate rows created in DB with correct assetProfileId; assert AssetProfile fields NOT updated (no partial data applied while awaiting user input); confirm tests fail before T026
- [X] T026 [US3] Extend src/lib/enrichment/primary.ts: in the "multiple" branch — when `shouldAutoSelect` returns null, persist all candidates to `prisma.enrichmentCandidate` (bulk create with assetProfileId, name, ticker, isin, exchange, instrumentType, sourceId, rawData, score), set all linked holdings to NEEDS_INPUT, return early (do NOT apply any data); make T025 tests pass
- [X] T027 [US3] Write failing integration tests for POST /api/enrichment/resolve in tests/integration/api/enrichment-resolve.test.ts: create a NEEDS_INPUT profile + two EnrichmentCandidate rows in test DB; POST `{assetProfileId, candidateId}` with a valid session; assert 202 response; assert candidate's identifying data applied to AssetProfile; assert all EnrichmentCandidate rows for the profile are deleted; assert holding enrichmentStatus = "PENDING"; assert enrichmentQueue.enqueue called for the profile; test 401 when unauthenticated; test 404 when candidateId doesn't belong to the assetProfileId; confirm tests fail before T028
- [X] T028 [US3] Implement src/app/api/enrichment/resolve/route.ts: auth check; validate body `{assetProfileId: string, candidateId: string}` with zod; load candidate + verify it belongs to the profile; parse candidate.rawData as Partial<AssetProfileUpdateData>; apply via mergeProfileFields with source="enrichment"; delete all EnrichmentCandidate rows for assetProfileId; set all linked Holding.enrichmentStatus to "PENDING"; enqueue primary enrichment via enrichmentQueue.enqueue; return 202; make T027 tests pass
- [X] T029 [US3] [P] Update src/components/ui/StatusBadge.tsx: add NEEDS_INPUT to the Status type union and statusConfig map with label "Needs Input" and distinct amber/orange style (e.g., `bg-orange-100 text-orange-800`)
- [X] T030 [US3] [P] Update src/app/(app)/holdings/[id]/page.tsx: extend the server-side data fetch to include `assetProfile: { include: { candidates: { orderBy: { score: "desc" } } } }` so candidates are available to the client component; map candidates to `EnrichmentCandidateData[]` and pass via HoldingWithProfile
- [X] T031 [US3] Update src/app/(app)/holdings/[id]/HoldingDetailClient.tsx: add state + transition for disambiguation resolution; when `holding.enrichmentStatus === "NEEDS_INPUT"` and `holding.candidates.length > 0`, render a disambiguation card below the position details with heading "Disambiguation Required", a description, and a list of candidates each showing name / ticker / ISIN / exchange with a "Select" button; on "Select": call POST /api/enrichment/resolve, update local enrichmentStatus to "PENDING", clear candidates, call router.refresh(); handle NEEDS_INPUT in the existing showUploadPrompt condition (do not show upload prompt when NEEDS_INPUT)

**Checkpoint**: Disambiguation flow working end-to-end. Ambiguous identifier → NEEDS_INPUT → user selects → re-enrichment triggers.

---

## Phase 6: User Story 4 — Multi-Source Fallback (Priority: P4)

**Goal**: When the primary source for an instrument type fails (network error or not found), the system tries the next source in priority order. For funds, this means Storebrand → Euronext fund list. All sources are retried once on transient errors before being skipped.

**Independent Test**: For a fund where Storebrand returns 404, the system successfully fetches basic fund data (name, ticker) from the Euronext fund list and marks the holding PARTIAL. A stock source that fails on the first attempt is retried once; if the retry succeeds, enrichment completes normally.

- [X] T032 [US4] Write failing integration test for fund source fallback in tests/integration/enrichment/primary.test.ts: mock Storebrand API to return 404; mock Euronext fund list POST to return a matching fund row; call `runPrimaryEnrichment(profileId)` on a FUND profile with a known ISIN; assert profile has name populated (from Euronext fund list); assert holding enrichmentStatus = "PARTIAL" (fund-specific fields absent from Euronext fund list); confirm test fails before T033
- [X] T033 [US4] Add Euronext fund list fallback source to src/lib/enrichment/sources/euronext.ts: export `euronextFundSource: DataSource` with id="euronext-fund", supportedTypes=["FUND"]; on fetch: POST `https://live.euronext.com/en/pd_es/data/funds?mics=WOMF` with form-encoded body (iDisplayLength=100, search by identifier); parse JSON aaData rows to find matching fund by name or ISIN; return "found" with name + ticker if match found, "not_found" otherwise; apply waitForRateLimit; update src/lib/enrichment/primary.ts SOURCES array to `[euronextSource, storebrandSource, euronextFundSource]`; make T032 tests pass
- [X] T034 [US4] Write failing integration test for retry-once on source error in tests/integration/enrichment/primary.test.ts: mock a source's fetch to throw a network error on the first call, return "found" on the second call; assert `runPrimaryEnrichment` called the source twice; assert profile enriched after the retry succeeds; confirm test fails before T035
- [X] T035 [US4] Add retry-once logic in src/lib/enrichment/primary.ts orchestration: within the source loop, catch "error" results where `retryable: true`; wait 1,000ms and call `source.fetch` a second time; if the retry also fails or returns retryable error, log the failure and continue to the next source; make T034 tests pass

**Checkpoint**: Multi-source fallback working. Transient failures retry once; persistent failures fall through to next source.

---

## Phase 7: User Story 5 — Web Search Fallback (Priority: P5)

**Goal**: When all direct source lookups fail, the system performs a web search using the instrument identifier plus context keywords. If the results point to a known data source, the system fetches and parses that page to fill the profile.

**Independent Test**: Add a holding where all registered sources return not_found; with `SERPER_API_KEY` set and mocked to return a result pointing to live.euronext.com, the system fetches that URL, parses it, and populates the profile. Without `SERPER_API_KEY`, the system reaches NOT_FOUND gracefully without errors.

- [X] T036 [US5] Write failing unit tests for `searchFallback` in tests/unit/enrichment/search-fallback.test.ts: mock global.fetch to return a Serper.dev response with organic results; verify the function calls `POST https://google.serper.dev/search` with the correct query and `X-API-KEY` header; verify it returns null when no known-source URL is in the results; verify it returns null (without throwing) when `SERPER_API_KEY` env var is not set; verify the search query format: `"{identifier}" stock ISIN` for stocks, `"{identifier}" fund Norway` for funds; confirm tests fail before T037
- [X] T037 [US5] Implement src/lib/enrichment/search-fallback.ts: export `searchFallback(identifier: IdentifierInfo, instrumentType: "STOCK" | "FUND"): Promise<Partial<AssetProfileUpdateData> | null>`; return null immediately if `process.env.SERPER_API_KEY` is not set; POST to `https://google.serper.dev/search` with JSON body `{q: "..."}` and `X-API-KEY` header; apply waitForRateLimit("https://google.serper.dev"); inspect `organic` results for URLs from known domains (`live.euronext.com`, `api.fund.storebrand.no`); if a known URL found, fetch and parse via the appropriate source module's parsing logic; return extracted data or null; make T036 tests pass
- [X] T038 [US5] Integrate web search fallback in src/lib/enrichment/primary.ts: after the source registry loop completes with no data found, if `SERPER_API_KEY` is set, call `searchFallback(identifier, instrumentType)`; if it returns data, apply via mergeProfileFields and continue to status determination; if null, proceed to NOT_FOUND
- [X] T039 [US5] Extend tests/integration/enrichment/primary.test.ts: add test where all sources return "not_found" and `SERPER_API_KEY` is undefined; assert holding enrichmentStatus = "NOT_FOUND" with no errors thrown; add test where all sources return "not_found" but `SERPER_API_KEY` is set and searchFallback returns mock data; assert profile enriched from fallback data

**Checkpoint**: Web search fallback integrated. Unknown instruments try web search last; missing API key degrades gracefully to NOT_FOUND.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Build verification, cleanup, and final validation across all user stories.

- [X] T040 Run `npm run build` (next build) and fix any TypeScript errors or Next.js build violations introduced by the new code; resolve any type errors in routes, server components, and client components
- [X] T041 [P] Run the full test suite: `npm test && npm run test:integration`; fix any remaining test failures not already addressed
- [X] T042 [P] Run E2E tests: `npm run build && npm run test:e2e`; verify the enrichment.spec.ts tests pass against the built application; fix any Playwright assertion or timing issues
- [X] T043 Update CLAUDE.md project status section: update Active Branch, Current Status, and What's Working to reflect the 007-primary-enrichment feature; note that primary enrichment is now operational with real Euronext + Storebrand sources, disambiguation, and web search fallback

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001–T004) — blocks all user story phases
- **US1 Stock Lookup (Phase 3)**: Depends on Phase 2 completion
- **US2 Fund Lookup (Phase 4)**: Depends on Phase 3 (primary.ts orchestration exists)
- **US3 Disambiguation (Phase 5)**: Depends on Phase 3 (primary.ts loop exists); T029/T030 can start after Phase 1
- **US4 Multi-Source Fallback (Phase 6)**: Depends on Phase 4 (both stock + fund sources exist)
- **US5 Web Search Fallback (Phase 7)**: Depends on Phase 6 (source loop is fully implemented)
- **Polish (Phase 8)**: Depends on all preceding phases

### User Story Dependencies

- **US1**: Can start after Phase 2 — no dependency on other user stories
- **US2**: Depends on US1 (primary.ts orchestration from T017 must exist)
- **US3**: Depends on US1 (primary.ts loop from T017 must exist); UI tasks T029–T031 depend on T004 (type changes)
- **US4**: Depends on US2 (both sources must be registered to test fallback)
- **US5**: Depends on US4 (complete source loop must exist to test last-resort fallback)

### Within Each User Story

1. Write failing test (confirm failure)
2. Implement to make test pass
3. Extend integration/E2E tests
4. Checkpoint before proceeding

### Parallel Opportunities Within Phases

**Phase 2**: T005→T006 (normalizer) is sequential; T007/T008, T009/T010, T011/T012 can each run in parallel with the other pairs
**Phase 5**: T025→T026, T027→T028, T029, T030 are all independent; T031 depends on T029+T030

---

## Parallel Examples

### Phase 2 — Foundational

```
# These test tasks can run in parallel:
T005: tests/unit/enrichment/normalizer.test.ts
T007: tests/unit/enrichment/rate-limiter.test.ts
T009: tests/unit/enrichment/cache.test.ts
T011: tests/unit/enrichment/candidates.test.ts

# Then these implementation tasks can run in parallel:
T006: src/lib/enrichment/normalizer.ts
T008: src/lib/enrichment/rate-limiter.ts
T010: src/lib/enrichment/cache.ts
T012: src/lib/enrichment/candidates.ts
```

### Phase 5 — Disambiguation

```
# These can run in parallel after T026 completes:
T027: tests/integration/api/enrichment-resolve.test.ts
T029: src/components/ui/StatusBadge.tsx
T030: src/app/(app)/holdings/[id]/page.tsx

# T028 and T031 run after their respective dependencies:
T028: src/app/api/enrichment/resolve/route.ts (after T027)
T031: src/app/(app)/holdings/[id]/HoldingDetailClient.tsx (after T029, T030)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T013) — required by all stories
3. Complete Phase 3: US1 Stock Lookup (T014–T019)
4. **STOP and VALIDATE**: Add Equinor by ISIN, verify profile populates, status = PARTIAL
5. `npm run build` passes, E2E test passes — ready for interim review

### Incremental Delivery

1. Setup + Foundational → infrastructure in place
2. US1 Stock Lookup → MVP: Euronext stocks work (PARTIAL expected for sector/industry)
3. US2 Fund Lookup → Storebrand funds work (COMPLETE expected)
4. US3 Disambiguation → Ambiguous identifiers handled gracefully
5. US4 Multi-Source Fallback → Increased coverage via source chaining
6. US5 Web Search Fallback → Maximum coverage via last-resort search

### Known Limitation: Sector and Industry for Stocks

The Euronext API does not return sector or industry data. Stock enrichment via Euronext will produce `PARTIAL` status (name, ticker, ISIN, exchange, country populated; sector and industry absent). This is accepted per constitution Principle V (YAGNI). The acceptance scenario from spec US1 that expects sector/industry will be partially satisfied — the identifying fields are correct; sector/industry can be added manually or via a future data source addition.

---

## Notes

- [P] = different files, no blocking dependencies — can run in parallel
- [USN] = maps to User Story N in spec.md for traceability
- TDD is mandatory (constitution §IV): confirm each test file FAILS before implementing
- `next build` must pass before the feature is considered complete (constitution §IV Build Verification)
- Playwright E2E tests must run against `next build && next start` in CI, not dev server
- `SERPER_API_KEY` is optional — app must function without it (graceful degradation to NOT_FOUND)
- External HTTP calls in tests must be mocked — never hit live Euronext or Storebrand in CI
