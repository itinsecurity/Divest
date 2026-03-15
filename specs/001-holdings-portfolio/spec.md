# Feature Specification: Holdings Registration and Portfolio Profile

**Feature Branch**: `001-holdings-portfolio`
**Created**: 2026-03-13
**Status**: Draft
**Input**: User description: "Holdings Registration and Portfolio Profile — register personal investment holdings (stocks and funds) within named accounts, with automatic asset profile enrichment and spread analysis views."

## Clarifications

### Session 2026-03-13

- Q: Should primary enrichment have a specific time SLA, or be modelled as async with no hard limit? → A: No hard time target — primary enrichment is async; completion is signalled by status update (no SLA).
- Q: What priority should the new AI secondary enrichment user story carry? → A: P2 — valuable but not blocking; primary enrichment satisfies the happy path.
- Q: How should the AI secondary enrichment success criterion be measured? → A: Outcome-only — at least 2 of the fund validation instruments reach "partial" or "complete" via secondary enrichment when primary returns no data; no time SLA.
- Q: For funds with partial sector/geographic weightings (e.g., sum to 70%), should the remaining 30% go to "Unclassified"? → A: Yes — remainder attributed to "Unclassified"; never silently drop or misattribute data.
- Q: Should stocks with missing sector/country data also route to "Unclassified" in sector/geographic views? → A: Yes — same principle applies consistently across all instrument types.
- C6 [HIGH]: Holdings need "last updated" timestamp to prevent silent data degradation. Amendments applied: FR-027 (timestamp), FR-025 (explicit price/value editing), US1 scenario 4 (price update workflow).
- Q: Should the system display a visual staleness warning when price/value hasn't been updated beyond a threshold? → A: No — the "last updated" timestamp is sufficient; staleness awareness is the user's responsibility.
- Q: For US2 primary enrichment, how should the system retrieve data from public sources? → A: System automatically fetches from a prioritized list of known public sources (euronext, morningstar, company site) based on ISIN/ticker — no user involvement.
- Q: How should US3 secondary enrichment be triggered now that it processes user-provided documents? → A: System prompts the user to upload a document when primary enrichment returns incomplete/no data; user can also upload proactively at any time.
- Q: What document formats should the system accept for upload? → A: PDF, images (PNG, JPG), plain text, CSV, and Markdown.
- Q: Should there be a file size limit on uploaded documents? → A: 5 MB per file.
- Q: How should SC-009 (secondary enrichment success criterion) be validated given the shift to document upload? → A: User must prepare test documents — validation requires user-provided reference documents for the 3 fund validation instruments; success = AI extracts data to reach "partial"/"complete" for at least 2 of 3.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register a Holding (Priority: P1)

The user adds a new investment holding by providing the instrument identifier (name, ticker, or ISIN), instrument type (stock or fund), account name, and amount. For stocks, the user enters the number of shares and price per share in NOK. For funds, the user enters the current holding value in NOK. The holding is saved immediately and available in the holdings list.

**Why this priority**: This is the foundational action — without the ability to register holdings, no other feature has data to operate on. It delivers immediate value by letting the user record their portfolio.

**Independent Test**: Can be fully tested by adding a stock holding and a fund holding, then verifying both appear in the holdings list with correct values.

**Acceptance Scenarios**:

1. **Given** the user is on the holdings page, **When** the user adds a stock holding with ticker "DNB", type "stock", account "Nordnet ASK", 100 shares at 200 NOK, **Then** the holding appears in the list with a current value of 20,000 NOK and enrichment status "pending".
2. **Given** the user is on the holdings page, **When** the user adds a fund holding with ISIN "NO0008001872", type "fund", account "DNB pensjonskonto", value 50,000 NOK, **Then** the holding appears in the list with the entered value and enrichment status "pending".
3. **Given** the user enters an instrument identifier, **When** the user does not provide a required field (e.g. missing account name), **Then** the system displays a validation message and does not save the holding.
4. **Given** an existing stock holding with 100 shares at 200 NOK (value 20,000 NOK), **When** the user updates the price per share to 220 NOK, **Then** the current value updates to 22,000 NOK and the "last updated" timestamp reflects the current date/time.

---

### User Story 2 - Primary Asset Profile Enrichment (Priority: P1)

After a holding is saved, the system automatically attempts to populate a structured asset profile for the underlying instrument by fetching data from a prioritized list of known public sources (live.euronext.com, morningstar.com, relevant company websites). The enrichment runs in the background and does not block the user. When complete, the holding's enrichment status updates to "complete", "partial", or "not found". If a profile already exists for the same instrument, the holding links to the existing profile without re-fetching.

**Why this priority**: Primary enrichment is tightly coupled to holding registration — it runs automatically and provides the data needed for all downstream analysis. Without it, spread views have nothing to display.

**Independent Test**: Can be tested by adding a well-known stock (e.g. DNB Bank ASA on Oslo Børs) and verifying that the asset profile is populated with company name, sector, country, and ISIN after enrichment completes.

**Acceptance Scenarios**:

1. **Given** a holding for a well-known Oslo Børs stock is saved, **When** primary enrichment completes, **Then** the linked asset profile contains the company name, exchange, ticker, ISIN, country, and sector/industry.
2. **Given** a holding for a Norwegian fund is saved, **When** primary enrichment completes with incomplete data, **Then** the profile contains the available fields and enrichment status is set to "partial".
3. **Given** a holding is saved for an instrument that already has an existing asset profile, **When** the system processes enrichment, **Then** it links to the existing profile and does not re-fetch data.
4. **Given** a holding for an instrument is saved and primary enrichment yields no data, **When** primary enrichment completes, **Then** the holding's status is set to "not found" and the user is prompted to upload a document for secondary enrichment (see User Story 3).

---

### User Story 3 - AI Secondary Enrichment via Document Upload (Priority: P2)

When primary enrichment returns incomplete or no results for a holding, the system prompts the user to upload a document (e.g., a Morningstar PDF profile, KID/fact sheet, or other instrument documentation). The user can also upload documents proactively at any time for any instrument. An AI agent processes the uploaded document to extract profile data. This process runs asynchronously in the background. The holding's enrichment status is updated once secondary enrichment completes.

**Why this priority**: Secondary enrichment improves coverage for smaller Norwegian funds and obscure instruments not covered by public sources. It is not blocking — primary enrichment satisfies the core data needs — but materially increases the quality of spread analysis for instruments most likely to have gaps. The document-upload approach avoids the difficulty of finding reliable public sources programmatically.

**Independent Test**: Can be tested by uploading a Morningstar PDF profile for a fund not found by primary enrichment and verifying that the AI agent extracts and populates at least some profile fields (status "partial") after processing.

**Acceptance Scenarios**:

1. **Given** a holding for a Norwegian fund has enrichment status "not found" after primary enrichment, **When** the user uploads a Morningstar PDF profile for that instrument and AI processing completes, **Then** the profile contains any available extracted fields (fund name, category, sector weightings, geographic weightings) and status updates to "partial" or "complete".
2. **Given** primary enrichment returns a partial profile for a fund (some fields missing), **When** the user uploads a document and AI processing completes, **Then** any additional fields extracted by the agent are merged into the existing profile without overwriting fields already populated by primary enrichment.
3. **Given** the user uploads a document that the AI agent cannot extract meaningful data from, **When** processing completes, **Then** the system notifies the user that no data could be extracted and the enrichment status remains unchanged.
4. **Given** a holding with a complete profile, **When** the user proactively uploads a document for that instrument, **Then** the AI agent processes it and merges any new fields not already present, without overwriting existing enrichment-sourced or user-supplied fields.

---

### User Story 4 - View Spread Analysis (Priority: P2)

The user can view three analysis views of their portfolio: (1) stock/interest balance showing the split between equity-type and bond/interest-type exposure, (2) sector spread showing allocation across industry sectors, and (3) geographic spread showing allocation across regions. All views weight holdings by current value in NOK. Holdings with incomplete enrichment are clearly indicated.

**Why this priority**: Spread analysis is the primary insight the user gains from registering holdings — it transforms raw data into actionable portfolio understanding. It depends on holdings and enrichment being in place first.

**Independent Test**: Can be tested by adding several holdings with complete profiles and verifying the spread views display correct proportions. For example, a 50/50 equity/bond portfolio should show an even stock/interest split.

**Acceptance Scenarios**:

1. **Given** the user has a stock holding worth 50,000 NOK and a bond fund holding worth 50,000 NOK (both fully enriched), **When** the user views the stock/interest balance, **Then** the view shows approximately 50% equity and 50% interest.
2. **Given** the user has a combination fund with a 60/40 equity/bond split and a value of 100,000 NOK, **When** the user views the stock/interest balance, **Then** 60,000 NOK is attributed to equity and 40,000 NOK to interest.
3. **Given** the user has holdings across multiple accounts, **When** the user filters by a specific account, **Then** only holdings in that account are reflected in the spread views.
4. **Given** some holdings have enrichment status "partial" or "not found", **When** the user views any spread analysis, **Then** those holdings are visually indicated with a note that figures may be incomplete.
5. **Given** a combination fund worth 80,000 NOK has no equity/bond split data, **When** the user views the stock/interest balance, **Then** the fund's 80,000 NOK is shown in an "Unclassified" bucket, separate from the equity and interest totals.
6. **Given** a fund has sector weightings that sum to 70%, **When** the user views the sector spread, **Then** 70% of the fund's value is distributed across the known sectors and 30% is attributed to "Unclassified".

---

### User Story 5 - Manually Edit Asset Profile Fields (Priority: P3)

The user can manually edit any field in an asset profile to correct or supplement data that enrichment could not find or got wrong. Manually edited fields are flagged as "user-supplied" and visually distinguished. These fields are preserved during subsequent enrichment refreshes.

**Why this priority**: Manual editing provides a safety net for enrichment gaps, which are expected for smaller Norwegian funds. It depends on profiles existing first but is not required for the core portfolio viewing experience.

**Independent Test**: Can be tested by editing a sector weighting on a fund profile, triggering a refresh, and verifying the manually edited field is preserved while other fields are updated.

**Acceptance Scenarios**:

1. **Given** a fund has a profile with sector weightings from enrichment, **When** the user edits the "Technology" sector weighting to 35%, **Then** the field is saved and visually marked as "user-supplied".
2. **Given** a profile field has been manually edited, **When** the user triggers a profile refresh, **Then** the manually edited field retains its user-supplied value while other fields are updated from the enrichment source.
3. **Given** a holding has status "not found", **When** the user manually creates profile data for it, **Then** the profile is saved and the holding links to the new profile.

---

### User Story 6 - Refresh Asset Profile (Priority: P3)

The user can trigger a manual re-fetch for any asset profile. This re-runs the full enrichment process and overwrites stored profile fields with freshly retrieved data, except for fields the user has manually edited.

**Why this priority**: Refresh addresses data staleness but is not needed for initial use. It shares priority with manual editing as both are profile management capabilities.

**Independent Test**: Can be tested by modifying test data behind the enrichment source, triggering a refresh, and verifying updated fields appear while user-supplied fields are preserved.

**Acceptance Scenarios**:

1. **Given** an asset profile was enriched previously, **When** the user triggers a refresh, **Then** the enrichment process runs again and non-user-supplied fields are updated with current data.
2. **Given** a profile has one field manually edited and one field from enrichment, **When** the user triggers a refresh, **Then** the enrichment-sourced field is updated and the user-supplied field is unchanged.

---

### Edge Cases

- What happens when the user adds two holdings for the same instrument in different accounts? The system links both to the same shared asset profile.
- What happens when enrichment is in progress and the user navigates to spread views? Holdings with pending enrichment are shown with a "pending" indicator and excluded from (or clearly marked in) spread calculations.
- What happens when a fund's sector or geographic weightings do not sum to 100%? The known weightings are applied proportionally and the unaccounted remainder is attributed to "Unclassified".
- What happens when the user enters an ISIN that matches an existing profile but with a different instrument type? The system uses the existing profile's type as authoritative and alerts the user of the mismatch.
- What happens when all holdings in a portfolio have status "not found"? Spread views display a message indicating that no enrichment data is available and analysis cannot be shown.
- What happens when the user edits a shared profile? The edit affects all holdings linked to that profile, and the user is informed of this before saving.
- What happens when the user uploads a file exceeding 5 MB or in an unsupported format? The system rejects the upload immediately with a clear validation message indicating the size limit or accepted formats.
- What happens when a stock has no sector or country data from enrichment? The stock's full value is attributed to "Unclassified" in sector and/or geographic views — the same principle as funds: never silently drop or misattribute.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow the user to add a holding by providing: instrument identifier (name, ticker, or ISIN), instrument type (stock or fund), account name, and amount (shares + price per share for stocks; current value in NOK for funds).
- **FR-002**: System MUST derive the current value for stock holdings as number of shares × price per share.
- **FR-003**: System MUST save the holding immediately upon submission, without waiting for enrichment to complete.
- **FR-004**: System MUST trigger asset profile enrichment asynchronously after a holding is saved.
- **FR-005**: System MUST check for an existing asset profile (matched by ISIN or ticker) before initiating enrichment. If a match exists, the holding MUST link to the existing profile without re-fetching.
- **FR-006**: System MUST attempt primary enrichment by automatically fetching data from a prioritized list of known, publicly available sources — including live.euronext.com, morningstar.com, and relevant company websites — using ISIN-based lookup with fallback to ticker/name search.
- **FR-007**: System MUST prompt the user to upload a document when primary enrichment returns incomplete or no results. The user MUST also be able to upload documents proactively for any instrument at any time. Accepted formats: PDF, images (PNG, JPG), plain text, CSV, and Markdown. Maximum file size: 5 MB per upload. An AI agent MUST process uploaded documents (e.g., Morningstar PDF profiles, KID/fact sheets, or other instrument documentation) to extract profile data. Extracted fields MUST be merged into the existing profile without overwriting fields already populated by primary enrichment or marked as user-supplied.
- **FR-008**: System MUST store asset profiles independently of holdings, identified by ISIN (preferred) or ticker, so the same profile can be shared across multiple holdings.
- **FR-009**: System MUST store an enrichment status flag on each holding: "complete", "partial", or "not found".
- **FR-010**: System MUST support stock profiles with fields: full company name, exchange, ticker symbol, ISIN, country of primary listing/incorporation, sector, and industry (GICS classification preferred).
- **FR-011**: System MUST support fund profiles with fields: full fund name, fund manager/family, ISIN, fund category (equity, bond/interest, or combination), equity/bond percentage split, sector weightings (percentage breakdown), and geographic/regional weightings (percentage breakdown).
- **FR-012**: All asset profile fields MUST be optional — if a field cannot be populated, it is left blank.
- **FR-013**: System MUST allow the user to manually edit any field in an asset profile. Manually edited fields MUST be flagged as "user-supplied".
- **FR-014**: System MUST preserve user-supplied fields during enrichment refreshes — a refresh MUST NOT overwrite manually edited values.
- **FR-015**: System MUST allow the user to trigger a manual re-fetch (refresh) for any asset profile.
- **FR-016**: System MUST provide a stock/interest balance view showing the total portfolio split between equity-type and bond/interest-type exposure, weighted by current NOK value.
- **FR-017**: System MUST provide a sector spread view showing portfolio allocation across industry sectors, weighted by current NOK value.
- **FR-018**: System MUST provide a geographic spread view showing portfolio allocation across regions, weighted by current NOK value.
- **FR-019**: In spread views, for individual stocks, the full holding value MUST be attributed to the stock's single sector and country/region. For funds with complete weightings, sector and geographic weightings from the profile MUST be applied proportionally. For any holding or fund where the required classification data is missing, the unclassifiable portion MUST be attributed to an "Unclassified" bucket — never silently dropped or misattributed.
- **FR-020**: In spread views, for combination funds, the equity/bond split from the asset profile MUST be used to apportion the holding's value between equity and interest. If the equity/bond split is not available, the fund's full value MUST be excluded from the stock/interest calculation and shown in an "Unclassified" bucket.
- **FR-021**: System MUST clearly indicate holdings with "partial" or "not found" enrichment status in all spread views, with a note that figures may be incomplete. The "Unclassified" bucket MUST be visible whenever any holding value cannot be fully attributed.
- **FR-026**: In sector and geographic spread views, when a fund's weightings sum to less than 100%, the unaccounted remainder of the holding's value MUST be attributed to "Unclassified" rather than normalized or silently omitted.
- **FR-022**: System MUST allow holdings to be filtered or grouped by account in all views.
- **FR-023**: System MUST visually distinguish any holding or profile field marked as user-supplied (manually edited).
- **FR-024**: System MUST allow the user to delete a holding.
- **FR-025**: System MUST allow the user to edit holding details: account name, and amount fields (shares, price per share for stocks; current value for funds).
- **FR-027**: System MUST store and display a "last updated" timestamp on each holding, automatically set when the holding is created and updated whenever the user edits the holding's price/value fields.

### Key Entities

- **Holding**: The user's personal position in an instrument within a named account. Stores instrument identifier, instrument type (stock/fund), account name, amount details (shares + price or value), a reference to an Asset Profile (nullable), enrichment status (complete/partial/not found), and a "last updated" timestamp (set on creation, updated on price/value edits). Current value is derived for stocks (shares × price) or stored directly for funds.
- **Asset Profile**: Properties of a financial instrument, independent of any holding. Identified by ISIN (preferred) or ticker. Type-specific fields: for stocks (company name, exchange, ticker, ISIN, country, sector, industry); for funds (fund name, manager, ISIN, category, equity/bond split, sector weightings, geographic weightings). Each field tracks whether it is enrichment-sourced or user-supplied.
- **Account**: A free-text label grouping holdings (e.g. "DNB pensjonskonto", "Nordnet ASK"). Not a separate managed entity — it is a string attribute on holdings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: User can register a new holding (stock or fund) and see it in their holdings list within 3 seconds of submission.
- **SC-002**: Primary enrichment runs asynchronously with no hard time SLA. Completion is signalled by the holding's enrichment status updating from "pending" to "complete", "partial", or "not found" — the user is never blocked waiting for it.
- **SC-003**: At least 3 of the 4 validation instruments resolve with "complete" or "partial" status: DNB Bank ASA (stock), DNB Europa Indeks A (fund), Schroder ISF Frontier Markets (fund), Arctic Return Class A (fund).
- **SC-004**: Spread analysis views (stock/interest balance, sector, geographic) render correctly and reflect all enriched holdings within 2 seconds of page load.
- **SC-005**: User can manually edit any profile field and see the change reflected immediately, with the field clearly marked as user-supplied.
- **SC-006**: A manual profile refresh updates enrichment-sourced fields while preserving all user-supplied fields with 100% reliability.
- **SC-007**: Holdings can be filtered by account across all views, and the spread analysis updates to reflect only the filtered subset.
- **SC-008**: Holdings with incomplete or missing enrichment data are clearly indicated in all views so the user always understands data completeness.
- **SC-009**: When primary enrichment yields no data, the user uploads reference documents (e.g., Morningstar PDF profiles) for the 3 fund validation instruments (DNB Europa Indeks A, Schroder ISF Frontier Markets, Arctic Return Class A). AI secondary enrichment resolves at least 2 of the 3 to "partial" or "complete" status. No time SLA — this is an outcome-only target. Test documents are user-prepared.

## Assumptions

- The user is a single authenticated user (per constitution requirement — auth is a prerequisite for all features).
- Currency is NOK throughout; no multi-currency support is needed.
- "Point-in-time snapshot" means the user manually updates prices/values — there is no automatic price feed or historical tracking.
- Account names are free-text with no validation beyond non-empty — the user manages their own naming conventions.
- The predefined sector categories follow GICS or a simplified equivalent (e.g. Technology, Financials, Energy, Healthcare, Consumer, Industrials, Materials, Utilities, Real Estate, Communication Services).
- The predefined geographic regions are: Norway, Nordics, Europe ex-Norway, North America, Asia-Pacific, Emerging Markets, Frontier Markets, Global/Other.
- Primary enrichment fetches from publicly available sources (live.euronext.com, morningstar.com, company websites) rather than a paid financial data API — chosen for reliability and public availability of Norwegian instrument data.
- Secondary enrichment via AI agent processes user-uploaded documents (e.g., Morningstar PDFs, KID/fact sheets) — results depend on document quality and the AI agent's extraction accuracy. This is a best-effort capability.
- Deleting a holding does not delete a shared asset profile if other holdings still reference it.
