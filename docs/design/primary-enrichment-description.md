# Primary Enrichment: Design Description

## What we have today

When a user adds a holding, they provide an identifier (a company name, ISIN code, or ticker symbol) and choose whether it is a stock or a fund. The system creates a skeleton asset profile and fires off a background "enrichment" step that is supposed to look up the real instrument and fill in the profile with details like official name, exchange, country, sector, industry, and (for funds) the fund manager, category, and portfolio weightings.

Today, that enrichment step is a shell. It goes through the motions — it has the right structure, it writes to the database, it tracks where each piece of data came from — but the actual lookup functions always come back empty-handed. Every new holding ends up marked "not found."

## What it needs to do

The enrichment system needs to become a real research assistant. Given whatever the user typed in, it should:

1. **Figure out what the user meant.** The identifier might be a formal ISIN code like `NO0010096985`, a ticker like `EQNR`, or a plain company name like `Equinor`. The system should be able to work with any of these starting points.

2. **Look up the instrument from public sources.** For equities listed on Euronext (which covers the Oslo Stock Exchange and other European exchanges), the Euronext website has structured pages with instrument details, market information, and company information. For funds, providers like Morningstar publish fund profiles with category, manager, and portfolio breakdown. The fund provider's own website (DNB, Storebrand, KLP, Nordnet, etc.) often has the same information. A general web search can also help locate the right page when the direct lookup doesn't work.

3. **Handle ambiguity.** If the identifier matches more than one instrument — say the user typed a name that could be two different companies — the system should not silently pick one. It should present the candidates back to the user and let them choose the right one. This is a change from the current fire-and-forget model: the enrichment result may need to come back as "here are your options" rather than "done."

4. **Try multiple sources in a sensible order.** Not every source will have every instrument. The system should have a prioritized list of places to look, and move down the list until it finds what it needs or runs out of options. For example:
   - If the user gave an ISIN for a stock, try Euronext first (it's the most structured source for European equities).
   - If the user gave a fund name that starts with "DNB," try the DNB fund pages first, then fall back to Morningstar.
   - If nothing specific matches, do a web search for the identifier plus context words like "stock" or "fund" to find the right page.

5. **Extract the right fields.** The asset profile has specific fields that need filling: name, ticker, ISIN, exchange, country, sector, industry (for stocks), and fund manager, fund category, equity/bond percentages, sector weightings, and geographic weightings (for funds). The enrichment logic needs to know which fields it's still missing and focus its lookups accordingly.

6. **Respect rate limits and be a good citizen.** These are public websites, not APIs we pay for. Requests should be spaced out (no more than one per second to any single host), and the system should present itself as a normal browser so it doesn't get blocked.

7. **Know when to stop.** If the system has checked its sources and still can't find the instrument, it should mark the profile as "not found" cleanly. This is the signal for secondary enrichment (the AI document-extraction pipeline) to potentially fill in data later when the user uploads a document. That secondary pipeline is a separate concern and stays as-is for now.

## How the user experiences this

**Happy path:** User adds "Equinor" as a stock. The system searches, finds it on Euronext (ISIN NO0010096985, ticker EQNR, Oslo Bors), and fills in the profile automatically. The holding shows up as "COMPLETE" within a few seconds.

**Ambiguous path:** User adds "Storebrand" as a stock. The system finds both Storebrand ASA (the listed company) and several Storebrand funds. It comes back and asks: "Did you mean Storebrand ASA (XOSL:STB) or one of these Storebrand funds?" The user picks one, and enrichment continues with that choice.

**Not-found path:** User adds something obscure that isn't on any of the sources. The holding is marked "not found." The user can still manually edit the profile fields or upload a document for secondary enrichment.

## What changes from the current design

- **Enrichment becomes multi-step.** Today it's fire-and-forget. With ambiguity handling, it may need to pause and wait for user input before continuing. This means the enrichment status might need a new state like "NEEDS_INPUT" alongside the existing PENDING / COMPLETE / PARTIAL / NOT_FOUND.

- **Multiple data sources.** Today there are two stub functions (one for Euronext, one for funds). The new design needs a source registry — an ordered list of lookup strategies the system can try, each knowing what kind of instruments and fields it can provide.

- **Web scraping.** The data sources are websites, not clean APIs. The system needs to fetch web pages and extract structured data from HTML. This means dealing with page structure that can change, handling request failures gracefully, and potentially caching results to avoid redundant lookups.

- **Browser-like requests.** The current code uses a custom User-Agent string. Real websites may block that. Requests should use a standard browser User-Agent (Chrome or Edge on Windows) and include typical browser headers.

## Scope boundaries

- **In scope:** Making primary enrichment actually find and fill in instrument data from public web sources, handling multiple sources, handling ambiguity.
- **Out of scope:** Secondary enrichment (AI document extraction) — leave the stub as-is. Real-time price updates — that's a separate feature. Paid API integrations — we only use freely available public web pages.

See the attached [Technical Reference](primary-enrichment-technical-reference.md) for specific URLs, data source details, field mappings, and current code structure.
