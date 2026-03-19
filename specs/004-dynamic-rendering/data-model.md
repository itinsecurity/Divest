# Data Model: Force Dynamic Page Rendering

**Feature**: 004-dynamic-rendering | **Date**: 2026-03-19

## No Changes

This feature is a rendering configuration change only. No database schema modifications, no new entities, no changed relationships, no new validation rules, and no state transitions.

The existing data model (holdings, asset profiles, enrichment pipeline) is unaffected. All existing data-fetching functions (`getHoldings`, `createHolding`, `updateHolding`, `deleteHolding`) continue to work identically — they are simply invoked at request time instead of build time.
