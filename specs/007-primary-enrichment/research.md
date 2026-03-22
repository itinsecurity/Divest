# Research: Live Primary Enrichment

**Feature**: `007-primary-enrichment`
**Date**: 2026-03-22
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## 1. Euronext / Oslo Børs Stock Data

### Decision
Use `live.euronext.com` as the primary stock data source via two public endpoints: a JSON search/autocomplete endpoint and an HTML detail endpoint. No auth required; browser-like headers needed.

### Rationale
- Well-documented via the `cran/Euronext` R package (reverse-engineered, verified March 2026)
- Covers all XOSL (Oslo Børs main), MERK (Euronext Growth Oslo), and XOAS (Oslo Axess) instruments
- No authentication, no API key
- JSON search response provides ISIN, name, MIC, and embedded ticker in < 1 call

### Alternatives Considered
- Oslo Børs reference data files — require account/payment for full data
- Twelve Data API — freemium, 800 calls/day free; adds external API key dependency; rejected for now per YAGNI; can be added later if sector/industry coverage is needed

### Endpoints

**Step 1 — Search/autocomplete** (ISIN, ticker, or name → candidates):
```
GET https://live.euronext.com/en/instrumentSearch/searchJSON?q={identifier}
Headers:
  Accept: application/json, text/javascript, */*; q=0.01
  X-Requested-With: XMLHttpRequest    ← CRITICAL: gates JSON vs HTML response
  User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ...
```

Response: JSON array. Each element:
```json
{
  "value": "NO0010096985",   // ISIN
  "isin": "NO0010096985",
  "mic": "XOSL",
  "name": "EQUINOR",
  "label": "<span class=\"instrument-name\">EQUINOR</span><span class=\"instrument-symbol\">EQNR</span>",
  "link": "/en/product/equities/NO0010096985-XOSL"
}
```

Parse ticker from `label` HTML: extract content of `.instrument-symbol` span.
The last array element is always a "See all results" placeholder — exclude from processing.
Returns 5–8 candidates per query.

**Step 2 — Detail quote** (price/trading data for known DNA = ISIN-MIC):
```
GET https://live.euronext.com/en/intraday_chart/getDetailedQuoteAjax/{ISIN}-{MIC}/full
```
Response: HTML table (price, market cap, volume, 52-week range). Contains **no sector/industry/country** data.

### Critical Limitation: Sector and Industry
**Euronext endpoints do not return sector, industry, or country.** Country can be derived from the ISIN prefix (first 2 characters = ISO 3166-1 alpha-2 code). Sector and industry are **not** available from Euronext via any documented public endpoint.

**Impact on completeness**: Stock enrichment via Euronext will yield PARTIAL status (name, ticker, ISIN, exchange, country populated; sector and industry empty). To achieve COMPLETE for stocks with sector/industry, a web search fallback targeting a supplementary source (e.g., a company overview page) would be needed.

**Decision**: Accept PARTIAL for stock enrichment when sector/industry are unavailable. The spec (FR-016) allows this; the success criterion SC-001 ("80% of the time") applies to the overall profile being useful, not necessarily all fields being populated. Sector/industry can be filled manually or via a future source addition.

### ISIN-to-Country Mapping
```
ISIN prefix → Country
NO → Norway
SE → Sweden
DK → Denmark
FI → Finland
DE → Germany
GB → United Kingdom
US → United States
...
```
Map first 2 chars of ISIN to a country name. Covers the vast majority of XOSL-listed instruments.

### MIC-to-Exchange Mapping
```
XOSL → Oslo Bors
MERK → Euronext Growth Oslo
XOAS → Oslo Axess
```

### Rate Limits
No officially documented rate limit. `robots.txt` has `Crawl-delay` commented out. Community scrapers use 1–2 seconds between requests. **Implement 1 req/sec per host** (meets FR-011).

---

## 2. Norwegian Fund Data

### Decision
Use the **Storebrand document API** (`api.fund.storebrand.no`) as the primary fund source. It returns Morningstar-generated Fund Profile PDFs for any Norwegian ISIN — not limited to Storebrand funds. Parse PDFs using `unpdf` (already in project dependencies).

### Rationale
- Unauthenticated, no API key required
- Works for funds from DNB, Storebrand, KLP, Nordnet, and others since it proxies Morningstar
- `unpdf` is already a project dependency — no new package needed
- Covers fund name, manager, category, equity/bond %, sector and geographic weightings

### Alternatives Considered
- Morningstar official API — requires OAuth2 paid subscription; rejected
- Morningstar undocumented screener — fragile, session-based, no Node.js client; rejected
- DNB asset management (`dnbam.com`) — React SSR payload scraping; brittle; rejected
- Euronext fund list (`pd_es/data/funds?mics=WOMF`) — no sector/geo data; useful only for basic fund name/ticker lookup
- Nordnet External API v2 — requires auth challenge/response; no allocation data; rejected
- Finansportalen — withholds sector/geo data; rejected
- Oslo Børs OMFF feed — subscription-only; rejected

### Endpoints

**Fund Profile PDF** (works for any Norwegian ISIN):
```
GET https://api.fund.storebrand.no/open/funddata/document
  ?documentType=FUND_PROFILE
  &isin={ISIN}
  &languageCode=en-GB
  &market=NOR
```
Response: `application/pdf` — Morningstar-generated Fund Profile report.

Content extracted via `unpdf`: fund name, Morningstar category (maps to fundCategory), fund manager, asset allocation (equity %, bond %), sector weightings (Morningstar 11-sector taxonomy), geographic weightings.

**Euronext Fund List** (basic name/ticker, fallback only):
```
POST https://live.euronext.com/en/pd_es/data/funds?mics=WOMF
Body (form-encoded): iDisplayLength=100&iDisplayStart=0&sSortField=name&...
```
Returns 2,389 Oslo-listed funds. Useful as a name-lookup fallback if the Storebrand API fails.

### Fund Profile PDF Parsing
The Morningstar Fund Profile PDF has a consistent template. Key data locations (extracted as text):
- Fund name: first heading line
- Morningstar Category: labeled field "Category"
- Management company: labeled field "Fund company" or "Management company"
- Asset allocation: table with rows "Equity", "Bond", "Cash" and percentage values
- Sector weightings: table with Morningstar sector names and % values
- Geographic exposure: table with country/region names and % values

PDF text extraction with `unpdf` returns a flat string. Use regex patterns on the extracted text to locate each field. The template is consistent across providers since all PDFs are generated by Morningstar's XSL formatter.

---

## 3. Web Search Fallback

### Decision
Use **Serper.dev** as the web search fallback API (FR-013). API key stored in `SERPER_API_KEY` environment variable.

### Rationale
- 2,500 free queries with no credit card required — sufficient for months of personal use
- Simple `POST https://google.serper.dev/search` with JSON body; no SDK needed
- Google-quality results; `organic` array gives `title`, `link`, `snippet` directly
- Pay-as-you-go at $1/1,000 if free allocation is exhausted
- No browser dependency — works in Next.js API routes and server actions

### Alternatives Considered
- Brave Search API — removed free tier in early 2026; requires credit card from day one; rejected
- Google Custom Search JSON API — 100 queries/day free; setup requires GCP project + cx ID; viable secondary option if Serper.dev is unavailable
- DuckDuckGo Instant Answer API — not a web search API; returns knowledge panel data only; rejected
- `duck-duck-scrape` npm — unmaintained, scraping-based, fragile; rejected
- SerpAPI — only 250/month free; expensive paid tier; rejected

### Endpoint
```typescript
POST https://google.serper.dev/search
Headers:
  X-API-KEY: {SERPER_API_KEY}
  Content-Type: application/json
Body: { "q": "{identifier} {type} ISIN" }

Response:
{
  "organic": [
    { "title": "...", "link": "...", "snippet": "...", "position": 1 }
  ]
}
```

### Graceful Degradation
If `SERPER_API_KEY` is not set, skip the web search fallback silently and proceed to NOT_FOUND. This allows the app to run in development without requiring a search API key.

---

## 4. Cache Design

### Decision
DB-backed cache using a new `EnrichmentCache` Prisma model. Key = normalized identifier + instrument type. TTL configurable via `ENRICHMENT_CACHE_TTL_HOURS` env var (default: 24).

### Rationale
- Reuses existing Prisma/Postgres infrastructure — no new package needed
- Survives server restarts (unlike in-memory cache)
- Single-user app: cache table will remain small
- Configurable TTL satisfies FR-019

### Cache Key
`{normalizedIdentifier}:{instrumentType}` — e.g., `NO0010096985:STOCK` or `dnb-norge-indeks:FUND`

---

## 5. Rate Limiting

### Decision
In-process per-host timestamp map. Before each HTTP request to a given host, check elapsed time since last request. If < 1,000ms, await the remainder. Module-level singleton.

### Rationale
- No new package needed (plain `Date.now()` + `setTimeout`)
- Single-instance Node.js server: in-process is sufficient
- Satisfies FR-011 (≤1 req/sec per host)

---

## 6. Disambiguation Logic

### Decision
Smart auto-select threshold:
- **Auto-select** if one candidate has an exact ISIN or ticker match (case-insensitive) and no other candidate has the same
- **Auto-select** if exactly one candidate exists
- **Trigger NEEDS_INPUT** when 2+ candidates have comparable match scores (no exact-match differentiator)

### Match Scoring
```
Exact ISIN match:     100 points
Exact ticker match:    80 points
Exact name match:      60 points
Partial name match:    20 points
```
If the top candidate scores 40+ points more than the second, auto-select. Otherwise trigger disambiguation.

---

## 7. Identifier Normalization

### Decision
- Trim leading/trailing whitespace
- Collapse internal whitespace runs to single space
- Uppercase ISIN candidates (ISIN regex: `/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/`)
- Strip non-alphanumeric chars from ticker candidates (preserve `.` for ISINs)
- Detect type: ISIN if matches ISIN regex after uppercasing; otherwise name/ticker (pass through as-is for search)

---

## Summary: Source Registry Priority

| Priority | Source | Instrument Type | Fields Returned |
|----------|--------|----------------|----------------|
| 1 | Euronext searchJSON | STOCK | name, ticker, ISIN, exchange, country |
| 2 | Storebrand document API | FUND | name, manager, category, equityPct, bondPct, sectorWeightings, geographicWeightings |
| 3 | Euronext fund list | FUND | name, ticker (fallback if Storebrand fails) |
| 4 | Web search (Serper.dev) | STOCK, FUND | link to instrument page (then fetch + parse target page) |

**Sector/industry for stocks**: Not available from Euronext. Result will be PARTIAL. Accepted per constitution Principle V (YAGNI — don't add a second stock source until there is a proven gap).
