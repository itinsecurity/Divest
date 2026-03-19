# Implementation Plan: Force Dynamic Page Rendering

**Branch**: `004-dynamic-rendering` | **Date**: 2026-03-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-dynamic-rendering/spec.md`

## Summary

The application fails `next build` when no database is available at build time because Next.js attempts to statically pre-render pages that call Prisma. The fix is to add `export const dynamic = 'force-dynamic'` to every page and layout in the authenticated `(app)` route group, ensuring they are rendered at request time instead of build time. This is a configuration-only change — no data fetching logic, UI, or data model changes.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 16.1.7 (App Router)
**Primary Dependencies**: Next.js, Prisma (with `@prisma/adapter-pg`), Auth.js (next-auth v5)
**Storage**: SQLite (local) / PostgreSQL (production) via Prisma
**Testing**: Vitest (unit + integration), Playwright (E2E), `next build` verification
**Target Platform**: Node.js server (self-hosted)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: N/A — single-user app; minor latency increase from dynamic rendering is acceptable per spec assumptions
**Constraints**: No database connection at build time; no weakening of security posture
**Scale/Scope**: 5 pages, 3 layouts — only 4 files in the `(app)` route group need modification

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Portability | PASS | No provider-specific changes. `force-dynamic` is standard Next.js API. |
| II. Tech Stack Discipline | PASS | No new dependencies or stack changes. |
| III. Security (NON-NEGOTIABLE) | PASS | This change *improves* security by eliminating the need for database credentials at build time. No secrets in code. |
| IV. Testing (NON-NEGOTIABLE) | PASS | Existing tests must continue passing. Build verification (`next build` without DB) is the primary acceptance test. E2E test for dynamic data freshness required. |
| V. Simplicity | PASS | Minimal change: one export line per file. No new abstractions, no caching model changes. |

**Pre-design gate: PASSED**

## Project Structure

### Documentation (this feature)

```text
specs/004-dynamic-rendering/
├── plan.md              # This file
├── research.md          # Phase 0: Next.js 16 dynamic rendering research
├── data-model.md        # Phase 1: No changes (configuration-only feature)
├── quickstart.md        # Phase 1: Verification guide
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (files to modify)

```text
src/app/(app)/
├── layout.tsx                    # ADD: export const dynamic = 'force-dynamic'
├── holdings/
│   ├── page.tsx                  # ADD: export const dynamic = 'force-dynamic'
│   └── [id]/
│       └── page.tsx              # ADD: export const dynamic = 'force-dynamic'
└── portfolio/
    └── page.tsx                  # ADD: export const dynamic = 'force-dynamic'
```

**Files NOT modified** (no database access):
- `src/app/page.tsx` — root redirect only
- `src/app/(auth)/login/page.tsx` — no DB access
- `src/app/(auth)/layout.tsx` — no DB access
- `src/app/layout.tsx` — root metadata only

**Structure Decision**: No new files or directories. This is a configuration-only change to 4 existing files in the `(app)` route group.

## Complexity Tracking

No constitution violations. No complexity justification needed.
