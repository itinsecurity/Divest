# Primary Enrichment: Technical Reference

Companion to [primary-enrichment-description.md](primary-enrichment-description.md). Contains URLs, data source specifics, field mappings, and current code pointers.

---

## 1. Data Sources

### 1a. Euronext (equities)

Euronext operates the Oslo Stock Exchange (XOSL) and other European exchanges. Their website has structured instrument pages.

| Resource | URL pattern | Notes |
|----------|-------------|-------|
| Equities directory | `https://live.euronext.com/nb/products/equities/list` | Browsable/searchable list of all listed equities |
| Instrument main page | `https://live.euronext.com/nb/product/equities/{ISIN}-{MIC}` | Default view shows price/trading data. MIC is the market identifier (e.g. XOSL for Oslo) |
| Market information tab | `.../{ISIN}-{MIC}/market-information` | Trading details, instrument identifiers |
| Company information tab | `.../{ISIN}-{MIC}/company-information` | Sector, industry, country, description |
| IPO tab | `.../{ISIN}-{MIC}/ipo` | IPO history |

**Example:** Wallenius Wilhelmsen — `https://live.euronext.com/nb/product/equities/BMG9156K1018-XOSL`

**Lookup strategies:**
- If we have an ISIN, construct the URL directly (need to discover the MIC, or try known ones: XOSL, XAMS, XBRU, XLIS, XPAR, XDUB, XMIL)
- If we have a ticker or name, use the equities directory search
- The search/directory page may offer a JSON or HTML-fragment endpoint for autocomplete/filtering

**Fields available:** name, ticker, ISIN, exchange/MIC, country, sector, industry

### 1b. Morningstar (funds and equities)

Morningstar publishes fund profiles with detailed portfolio information.

| Resource | URL pattern | Notes |
|----------|-------------|-------|
| Fund quote page | `https://global.morningstar.com/en-nd/investments/funds/{morningstar_id}/quote` | Overview with category, manager, ratings |
| Search | General web search: `morningstar <fund name>` | No known direct search API; web search is the entry point |

**Fields available:** name, fund manager, fund category, equity/bond percentages, sector weightings, geographic weightings

### 1c. Fund provider websites (Norwegian market)

Fund names commonly start with the provider's name, which is a useful heuristic for choosing where to look first.

| Provider | Website | Heuristic |
|----------|---------|-----------|
| DNB | `dnb.no/fondskalkulator` | Fund name starts with "DNB" |
| Storebrand | `storebrand.no/privat/sparing` | Fund name starts with "Storebrand" |
| KLP | `klp.no/fond` | Fund name starts with "KLP" |
| Nordnet | `nordnet.no/markedet/fondslister` | General fund marketplace, carries many providers |
| VFF (Verdipapirfondenes Forening) | `vff.no` | Norwegian fund industry association, fund database |

**Fields available (varies by provider):** name, ISIN, fund manager, fund category, equity/bond split, top holdings, sector/geographic breakdown

### 1d. General web search (fallback)

When direct lookups fail, a web search with the identifier plus context terms ("stock exchange," "fund," "ISIN") can locate the right page on any of the above sources or on other financial sites.

---

## 2. Asset Profile Fields to Populate

| Field | Stocks | Funds | Source priority |
|-------|--------|-------|-----------------|
| `name` | Yes | Yes | All sources |
| `ticker` | Yes | — | Euronext |
| `isin` | Yes | Yes | Euronext, Morningstar, provider sites |
| `exchange` | Yes | — | Euronext |
| `country` | Yes | — | Euronext (company-information tab) |
| `sector` | Yes | — | Euronext (company-information tab) |
| `industry` | Yes | — | Euronext (company-information tab) |
| `fundManager` | — | Yes | Morningstar, provider sites |
| `fundCategory` | — | Yes | Morningstar, provider sites (EQUITY / BOND / COMBINATION) |
| `equityPct` | — | Yes | Morningstar, provider sites |
| `bondPct` | — | Yes | Morningstar, provider sites |
| `sectorWeightings` | — | Yes | Morningstar, provider sites (JSON object: sector name -> percentage) |
| `geographicWeightings` | — | Yes | Morningstar, provider sites (JSON object: region/country -> percentage) |

---

## 3. Current Code Structure

| File | Purpose | Current state |
|------|---------|---------------|
| `src/lib/enrichment/primary.ts` | Main enrichment orchestrator | Has structure, but `fetchFromEuronext()` always returns null (line 51), `fetchFundData()` is empty (line 66) |
| `src/lib/enrichment/queue.ts` | In-process queue with deduplication | Functional; calls `runPrimaryEnrichment()` |
| `src/lib/enrichment/types.ts` | Field merge logic with source priority | Functional; handles user > enrichment > ai_extraction priority |
| `src/lib/enrichment/secondary.ts` | AI document extraction | Stub (leave as-is) |
| `src/actions/holdings.ts` | Server action for creating holdings | Fires enrichment via HTTP POST, fire-and-forget (line 192) |
| `src/lib/schemas/holdings.ts` | Zod validation for holding input | `instrumentIdentifier` is a free-text string field |
| `prisma/schema.prisma` | Database schema | `Holding.enrichmentStatus` is a string, currently: PENDING / COMPLETE / PARTIAL / NOT_FOUND |

**Enrichment flow today:**
1. User submits holding form (identifier + type + account + value data)
2. `createHolding()` creates an AssetProfile stub and a Holding, then fires HTTP POST to `/api/enrichment`
3. The API route calls `enrichmentQueue.enqueue(profileId, "primary")`
4. Queue calls `runPrimaryEnrichment(profileId)`, which calls `fetchFromEuronext()` / `fetchFundData()` — both return null
5. Holding is marked NOT_FOUND

---

## 4. HTTP Request Considerations

- **User-Agent:** Use a realistic browser UA string, e.g. `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0`
- **Rate limiting:** Max 1 request per second per host
- **Timeouts:** 10 seconds per request (already configured in current code)
- **Headers:** Include `Accept`, `Accept-Language` (nb,en), `Referer` where appropriate
- **Error handling:** Network failures, HTTP errors, and parsing failures should all result in graceful fallback to next source, not hard errors

---

## 5. Enrichment Status Values

Current enum (string field on Holding):
- `PENDING` — enrichment not yet attempted
- `COMPLETE` — all relevant fields populated
- `PARTIAL` — some fields populated
- `NOT_FOUND` — no data found from any source

Proposed addition:
- `NEEDS_INPUT` — multiple candidates found, user must disambiguate before enrichment can continue

---

## 6. Source Priority Order (proposed)

### For stocks:
1. Euronext (direct ISIN or ticker lookup)
2. Euronext (directory search by name)
3. Web search (identifier + "stock" / "equity" / "exchange")
4. Company website (if found via search)

### For funds:
1. Provider website (if fund name starts with a known provider)
2. Morningstar (search by fund name)
3. Nordnet / VFF fund directory
4. Web search (identifier + "fund" / "fond")
