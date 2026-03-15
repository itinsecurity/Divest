# Implementation Plan: Holdings Registration and Portfolio Profile

**Branch**: `001-holdings-portfolio` | **Date**: 2026-03-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-holdings-portfolio/spec.md`

## Summary

Register personal investment holdings (stocks and funds) within named accounts, with automatic asset profile enrichment from public sources and AI-assisted document extraction, and spread analysis views (stock/interest balance, sector, geographic). Built as a Next.js App Router application with Prisma ORM, using an in-process async enrichment pipeline and provider-abstracted AI extraction layer.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ LTS
**Primary Dependencies**: Next.js 15 (App Router), Prisma 6, Auth.js v5, Recharts 2, Tailwind CSS 4, Zod
**Storage**: SQLite (local development) / PostgreSQL (production) via Prisma
**Testing**: Vitest (unit/integration), Playwright (E2E), React Testing Library
**Target Platform**: Self-hosted Node.js server (any OS — local machine, VPS, home server)
**Project Type**: Web application (full-stack, server-rendered)
**Performance Goals**: Holdings list and spread views render within 2 seconds; holding creation within 3 seconds (per SC-001, SC-004)
**Constraints**: Single user, single currency (NOK), no real-time price feeds, self-hostable without vendor lock-in
**Scale/Scope**: Single user, ~100s of holdings, ~10s of asset profiles, 3 spread analysis views

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Portability | ✅ PASS | Self-hosted Node.js, no Vercel/provider-specific features. All infra in `divest-infra`. |
| II. Tech Stack Discipline | ✅ PASS | Uses canonical stack exactly: Next.js, TypeScript, Prisma, SQLite/Postgres, Tailwind, Recharts, Auth.js. AI provider behind abstraction layer. Auth provider behind abstraction layer. No additions. |
| III. Security | ✅ PASS | Auth.js prerequisite enforced via middleware. Secrets via env vars (`AUTH_USERNAME`, `AUTH_PASSWORD_HASH`, AI provider keys). No PII in logs. Input validation via Zod on all server actions and API routes. |
| IV. Testing | ✅ PASS | TDD with Vitest (watch mode for red-green-refactor). Real SQLite for integration tests (no mocks). Playwright for E2E covering async Server Components. Financial calculation logic fully covered. |
| V. Simplicity | ✅ PASS | In-process enrichment queue (no Redis/BullMQ). Native HTML tables (no table library). JSON field for source tracking (no separate metadata table). Credentials provider (no OAuth). |

**Gate result**: PASS — no violations. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-holdings-portfolio/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── server-actions.md
│   └── api-routes.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma            # Database schema
└── seed.ts                  # Dev seed data

src/
├── app/
│   ├── layout.tsx           # Root layout (providers, html shell)
│   ├── page.tsx             # Root redirect to /holdings
│   ├── (auth)/
│   │   ├── login/page.tsx   # Login page
│   │   └── layout.tsx       # Auth layout (no app shell)
│   ├── (app)/
│   │   ├── layout.tsx       # App shell (nav, sidebar)
│   │   ├── holdings/
│   │   │   ├── page.tsx     # Holdings list
│   │   │   └── [id]/page.tsx # Holding detail / edit
│   │   └── portfolio/
│   │       └── page.tsx     # Spread analysis views
│   └── api/
│       └── enrichment/
│           └── route.ts     # Async enrichment trigger endpoint
├── lib/
│   ├── db.ts                # Prisma client singleton
│   ├── auth/
│   │   ├── types.ts         # AuthProvider interface
│   │   ├── authjs.ts        # Auth.js implementation
│   │   └── index.ts         # Re-export active provider
│   ├── ai/
│   │   ├── types.ts         # AIProvider interface
│   │   └── index.ts         # Re-export active provider
│   └── enrichment/
│       ├── queue.ts         # In-process async queue
│       ├── primary.ts       # Public source fetching logic
│       ├── secondary.ts     # AI document extraction logic
│       └── types.ts         # Enrichment types
├── actions/
│   ├── holdings.ts          # Server actions: CRUD holdings
│   ├── profiles.ts          # Server actions: profile edit/refresh
│   └── upload.ts            # Server actions: document upload
├── components/
│   ├── ui/                  # Shared UI primitives (badges, buttons)
│   └── charts/              # Recharts wrappers (donut, bar)
├── types/
│   └── index.ts             # Shared TypeScript types
└── middleware.ts             # Auth.js route protection

tests/
├── unit/                    # Vitest unit tests (pure logic)
├── integration/             # Vitest integration tests (real SQLite)
└── e2e/                     # Playwright E2E tests
```

**Structure Decision**: Next.js App Router with route groups for auth/app separation. Shared logic in `lib/`, server actions in `actions/`, UI in `components/`. Tests in top-level `tests/` directory mirroring source structure. This is the simplest layout for a single-developer full-stack app.

## Constitution Check — Post-Design Re-evaluation

| Principle | Status | Post-Design Assessment |
|-----------|--------|----------------------|
| I. Portability | ✅ PASS | No Vercel-specific features. In-process queue avoids Redis dependency. Docker optional. |
| II. Tech Stack Discipline | ✅ PASS | All deps canonical or standard ecosystem (Vitest, Playwright, Zod, unpdf, cheerio). AI and auth behind abstraction interfaces. |
| III. Security | ✅ PASS | Auth.js middleware on all `(app)` routes. Zod on all inputs. Secrets via env vars. No PII in logs. |
| IV. Testing | ✅ PASS | TDD via Vitest watch. Real SQLite for integration. Financial calcs exhaustively covered. Playwright for E2E. |
| V. Simplicity | ✅ PASS | JSON field sources, in-process queue, credentials provider, HTML tables. No premature abstractions. |

**Post-design gate result**: PASS — no violations introduced during design.

## Complexity Tracking

No constitution violations to justify — all design decisions align with the five principles.
