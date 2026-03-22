# Feature Specification: Live Primary Enrichment

**Feature Branch**: `007-primary-enrichment`
**Created**: 2026-03-21
**Status**: Draft
**Input**: User description: "Make the primary enrichment function operational. The enrichment system should look up real instrument data from public web sources when a user adds a holding, filling in the asset profile automatically."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unambiguous Stock Lookup (Priority: P1)

A user adds a holding by providing an identifier (ISIN, ticker, or company name) and selecting "stock" as the type. The system looks up the instrument from public web sources, finds a single clear match, and automatically fills in the asset profile fields (official name, ticker, ISIN, exchange, country, sector, industry). The holding status changes to "COMPLETE" and the user sees a fully populated profile.

**Why this priority**: This is the core value proposition. Without the ability to actually look up and fill in stock data, the enrichment system provides no value. The majority of user additions will be unambiguous single-match lookups.

**Independent Test**: Can be fully tested by adding a well-known European stock (e.g., "Equinor" or ISIN "NO0010096985") and verifying the profile is filled with correct data from a public source.

**Acceptance Scenarios**:

1. **Given** a user has no existing holding for Equinor, **When** the user adds a holding with identifier "Equinor" and type "stock," **Then** the system finds the instrument on a public source, fills in the profile (name: Equinor ASA, ticker: EQNR, ISIN: NO0010096985, exchange: Oslo Bors, country: Norway, sector and industry populated), and marks the holding as "COMPLETE."
2. **Given** a user adds a holding with ISIN "NO0010096985" and type "stock," **When** the enrichment runs, **Then** the system resolves the ISIN to the correct instrument and fills in the same profile fields.
3. **Given** a user adds a holding with ticker "EQNR" and type "stock," **When** the enrichment runs, **Then** the system resolves the ticker to the correct instrument and fills in the profile.

---

### User Story 2 - Unambiguous Fund Lookup (Priority: P2)

A user adds a holding by providing an identifier and selecting "fund" as the type. The system looks up the fund from public web sources, finds a single match, and fills in the fund-specific profile fields (fund name, fund manager, fund category, equity/bond percentages, sector weightings, geographic weightings). The holding status changes to "COMPLETE."

**Why this priority**: Funds are the second major asset type in the system. Users who invest in Norwegian funds (DNB, Storebrand, KLP, Nordnet) need profile enrichment just like stock holders. This story is slightly lower priority than stocks because fund data is more varied in structure across sources.

**Independent Test**: Can be fully tested by adding a well-known Norwegian fund (e.g., "DNB Norge Indeks") and verifying the fund profile is populated with correct data.

**Acceptance Scenarios**:

1. **Given** a user adds a holding with identifier "DNB Norge Indeks" and type "fund," **When** the enrichment runs, **Then** the system finds the fund on a public source, fills in the profile (fund name, fund manager: DNB Asset Management, fund category, portfolio weightings), and marks the holding as "COMPLETE."
2. **Given** a user adds a holding with a fund ISIN and type "fund," **When** the enrichment runs, **Then** the system resolves the ISIN and fills in fund-specific profile fields.

---

### User Story 3 - Ambiguous Identifier Disambiguation (Priority: P3)

A user adds a holding with an identifier that matches more than one instrument. The holding saves immediately and enrichment runs asynchronously in the background. When multiple candidates are found, the enrichment pauses and sets the holding to "NEEDS_INPUT" status. The disambiguation candidates are stored and displayed on the holding's detail page. The user can resolve the ambiguity at their convenience — the system does not block the add-holding flow. Once the user selects the correct instrument, enrichment resumes and fills in the profile.

**Why this priority**: Ambiguity handling prevents silent wrong-match errors that would erode user trust. However, most lookups are unambiguous, so this is a refinement on top of the core lookup functionality.

**Independent Test**: Can be tested by adding an identifier known to match multiple instruments (e.g., "Storebrand" which could be the listed company or several funds) and verifying the system saves the holding immediately and presents options on the detail page rather than blocking.

**Acceptance Scenarios**:

1. **Given** a user adds a holding with identifier "Storebrand" and type "stock," **When** the enrichment finds multiple comparably strong candidate instruments (e.g., Storebrand ASA and Storebrand funds with no single clear best match), **Then** the holding is saved immediately with "NEEDS_INPUT" status and the candidates are stored for display on the holding detail page.
5. **Given** a user adds a holding with identifier "EQNR" and type "stock," **When** the enrichment finds one exact ticker match and several weak partial-name matches, **Then** the system auto-selects the exact ticker match and completes enrichment without triggering disambiguation.
2. **Given** a holding is in "NEEDS_INPUT" status with stored candidates, **When** the user views the holding detail page, **Then** the candidates are displayed with distinguishing details (name, exchange/ticker, type) and the user can select one.
3. **Given** the user selects a candidate on the holding detail page, **When** the selection is confirmed, **Then** enrichment resumes with the selected instrument, fills in the profile, and updates the status to "COMPLETE" or "PARTIAL."
4. **Given** a holding is in "NEEDS_INPUT" status, **When** the user does not act, **Then** the holding remains in "NEEDS_INPUT" status indefinitely until the user resolves it — no timeout or automatic selection occurs.

---

### User Story 4 - Multi-Source Fallback (Priority: P4)

When the primary data source for a given identifier does not have the instrument, the system automatically tries the next source in a prioritized list. The user does not need to know which source was used; they simply see a completed profile or a "not found" result after all sources have been exhausted.

**Why this priority**: Coverage across multiple sources increases the success rate of enrichment. However, the system is still useful with a single source per instrument type, making this an enhancement to reliability rather than core functionality.

**Independent Test**: Can be tested by adding an instrument that is not available on the first-priority source but is available on a fallback source, and verifying the profile is still filled.

**Acceptance Scenarios**:

1. **Given** a user adds a stock that is not found on the first-priority source, **When** the enrichment runs, **Then** the system tries the next source in priority order and fills in the profile if found.
2. **Given** a user adds a fund that is not found on the fund provider's own pages, **When** the enrichment runs, **Then** the system falls back to an aggregator source (e.g., Morningstar) and fills in the profile if found.
3. **Given** all sources have been tried and none contain the instrument, **When** the enrichment completes, **Then** the holding is marked "NOT_FOUND" and the user can still manually edit fields or use secondary enrichment.

---

### User Story 5 - Web Search Fallback (Priority: P5)

When direct source lookups fail, the system performs a general web search using the identifier plus contextual terms (e.g., "stock," "fund," "ISIN") to locate a relevant page. If a relevant result is found on a known source, the system extracts data from that page.

**Why this priority**: This is the final safety net that maximizes coverage for unusual or less common instruments. It depends on the direct lookup infrastructure being in place first.

**Independent Test**: Can be tested by adding an instrument with a non-standard identifier that direct lookups miss, and verifying the web search locates and extracts the correct data.

**Acceptance Scenarios**:

1. **Given** a user adds a holding with an identifier that direct source lookups cannot resolve, **When** the enrichment runs, **Then** the system performs a web search for the identifier with context keywords.
2. **Given** the web search returns a result on a known data source, **When** the system processes the result, **Then** it extracts profile data from the linked page and fills in the profile.
3. **Given** the web search returns no useful results, **When** the enrichment completes, **Then** the holding is marked "NOT_FOUND."

---

### Edge Cases

- What happens when a public data source is temporarily unavailable (server error, timeout)? The system should retry once, then skip that source and continue to the next. The failure should be logged but not block other sources.
- What happens when a data source changes its page structure? Extraction may return incomplete data. The system should fill in whatever fields it can extract and mark the holding as "PARTIAL" rather than failing entirely.
- What happens when the user provides an identifier in a non-standard format (extra spaces, mixed case, special characters)? The system should normalize the identifier before lookup (trim whitespace, handle case-insensitivity).
- What happens when the same holding is added twice? The existing holding's enrichment status should be respected; the system should not re-enrich an already "COMPLETE" holding unless the user explicitly requests a refresh.
- What happens when a rate limit is hit on a data source? The system should back off and retry after a delay, or skip to the next source. It must not flood any single host with rapid requests.

## Clarifications

### Session 2026-03-22

- Q: Should disambiguation be synchronous (blocking the add flow) or asynchronous (save immediately, resolve later)? → A: Asynchronous/non-blocking. Holding saves immediately with NEEDS_INPUT status; candidates displayed on the holding detail page for later resolution.
- Q: When multiple candidates are found, should the system always ask the user or auto-select obvious matches? → A: Smart auto-select. Auto-select if one candidate is clearly stronger (e.g., exact ISIN/ticker match); only trigger disambiguation when multiple candidates are comparably strong.
- Q: Should the system cache scraped data from public web sources to avoid redundant fetches? → A: Yes, time-based cache with configurable expiry (e.g., 24 hours). Stale instrument metadata is acceptable since it changes infrequently.
- Q: What threshold determines COMPLETE vs PARTIAL enrichment status? → A: All defined profile fields must be populated for COMPLETE. Any missing field means PARTIAL.
- Q: Should users see source-level progress detail during enrichment, or just the status? → A: Status only. Users see the enrichment status label (PENDING/COMPLETE/PARTIAL/NEEDS_INPUT/NOT_FOUND) with no per-source detail in the UI. Source provenance is logged internally.
- Q: After primary enrichment results in PARTIAL or NOT_FOUND, should secondary enrichment be triggered? → A: No. Secondary enrichment is never triggered by primary enrichment outcomes. Primary's terminal status (COMPLETE/PARTIAL/NOT_FOUND) stands on its own. Secondary enrichment is entirely out of scope for this feature.
- Q: Can users manually retry primary enrichment for PARTIAL or NOT_FOUND holdings? → A: Yes. Users can trigger a re-enrichment for PARTIAL and NOT_FOUND holdings to retry primary sources.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept stock identifiers in three formats: ISIN codes, ticker symbols, and company/instrument names.
- **FR-002**: System MUST accept fund identifiers in three formats: ISIN codes, fund names, and fund provider plus fund name combinations.
- **FR-003**: System MUST look up stock instruments from at least one public web source covering European equities (specifically Euronext-listed instruments including Oslo Stock Exchange).
- **FR-004**: System MUST look up fund instruments from at least one public web source providing fund profiles with category, manager, and portfolio breakdown data.
- **FR-005**: System MUST fill in stock profile fields upon successful lookup: official name, ticker, ISIN, exchange, country, sector, and industry.
- **FR-006**: System MUST fill in fund profile fields upon successful lookup: fund name, fund manager, fund category, equity/bond percentages, sector weightings, and geographic weightings.
- **FR-007**: System MUST maintain a prioritized registry of data sources, trying each in order until a match is found or all sources are exhausted.
- **FR-008**: System MUST detect when an identifier matches multiple instruments, save the holding immediately, store the candidates, and set the holding to "NEEDS_INPUT" status — the add-holding flow is never blocked by disambiguation. When one candidate is clearly stronger than others (e.g., exact ISIN or ticker match vs. partial name overlap), the system MUST auto-select the strong match and continue enrichment without disambiguation. Disambiguation is only triggered when multiple candidates are comparably strong.
- **FR-009**: System MUST support a "NEEDS_INPUT" enrichment status for holdings awaiting user disambiguation, in addition to the existing PENDING, COMPLETE, PARTIAL, and NOT_FOUND statuses. Disambiguation candidates MUST be persisted and displayed on the holding detail page for resolution at the user's convenience.
- **FR-010**: System MUST normalize user-provided identifiers before lookup (trim whitespace, handle case variations).
- **FR-011**: System MUST rate-limit requests to any single host to no more than one request per second.
- **FR-012**: System MUST use browser-like request headers (standard User-Agent, typical browser headers) when fetching public web pages.
- **FR-013**: System MUST perform a general web search as a last-resort fallback when direct source lookups fail.
- **FR-014**: System MUST mark a holding as "NOT_FOUND" when all sources have been tried and none contain the instrument. Primary enrichment MUST NOT trigger secondary enrichment under any circumstance — PARTIAL and NOT_FOUND are terminal states for the primary pipeline.
- **FR-015**: System MUST handle source unavailability gracefully: retry once on failure, then skip to the next source without blocking the enrichment process.
- **FR-016**: System MUST mark a holding as "COMPLETE" only when all defined profile fields for that instrument type are populated. If any profile field is missing after all sources have been tried, the holding MUST be marked "PARTIAL."
- **FR-017**: System MUST log which data source provided each piece of profile data (data provenance tracking). This provenance data is internal only — the user-facing UI displays only the enrichment status label, not source-level details.
- **FR-018**: System MUST NOT re-enrich a holding that is already "COMPLETE" unless the user explicitly requests a refresh. For holdings in "PARTIAL" or "NOT_FOUND" status, the user MUST be able to manually trigger a re-enrichment to retry primary sources.
- **FR-019**: System MUST cache data fetched from public web sources with a configurable time-based expiry (default 24 hours). Subsequent lookups for the same instrument within the cache window MUST use cached data instead of re-fetching.
- **FR-020**: System MUST serve cached results to avoid redundant fetches when multiple holdings resolve to the same source page within the cache window.

### Key Entities

- **Data Source**: A public web source that can be queried for instrument data. Has a name, priority order, supported instrument types (stock/fund), and the set of profile fields it can provide.
- **Enrichment Candidate**: A potential instrument match returned by a data source lookup. Contains enough identifying information (name, ticker/ISIN, exchange, type) for the user to distinguish between candidates.
- **Enrichment Status**: The state of a holding's enrichment process. One of: PENDING (queued for lookup), NEEDS_INPUT (awaiting user disambiguation), COMPLETE (all key fields filled), PARTIAL (some fields filled), NOT_FOUND (no match after all sources tried).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When a user adds a well-known European stock by name, ticker, or ISIN, the system fills in the asset profile with correct data at least 80% of the time without manual intervention.
- **SC-002**: When a user adds a well-known Norwegian fund by name or ISIN, the system fills in the fund profile with correct data at least 70% of the time without manual intervention.
- **SC-003**: Enrichment for an unambiguous holding completes within 30 seconds of the user adding it.
- **SC-004**: When an identifier matches multiple instruments, the system presents disambiguation options 100% of the time rather than silently choosing.
- **SC-005**: The system respects rate limits and does not send more than one request per second to any single host.
- **SC-006**: When no source has the instrument, the holding is marked "NOT_FOUND" within 60 seconds rather than hanging indefinitely.

## Assumptions

- The existing enrichment infrastructure (background job triggering, database writes, status tracking, data provenance) remains in place and is extended rather than replaced.
- Euronext is the primary source for European equities. Norwegian fund providers (DNB, Storebrand, KLP, Nordnet) and Morningstar are primary sources for funds.
- Public web sources do not require authentication or paid access.
- The web search fallback uses a general-purpose search engine or search API.
- Rate limiting at one request per second per host is sufficient to avoid being blocked by public sources.
- Page structure of public sources may change over time; the system is expected to degrade gracefully (PARTIAL results) rather than fail completely when this happens.
- Secondary enrichment (AI document extraction) is entirely out of scope. Primary enrichment never triggers secondary enrichment — the two pipelines are fully independent.
- Real-time price data is out of scope.
