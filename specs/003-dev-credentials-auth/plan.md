# Implementation Plan: Dev Credentials Authentication

**Branch**: `003-dev-credentials-auth` | **Date**: 2026-03-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-dev-credentials-auth/spec.md`

## Summary

Add a credentials-based login (username/password) for local development while keeping GitHub OAuth as the sole production auth method. The provider selection is automatic based on `NODE_ENV`. This unblocks local development without requiring GitHub OAuth App setup.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22+
**Primary Dependencies**: Next.js 15 (App Router), Auth.js v5 (next-auth 5.0.0-beta.30), bcryptjs (new)
**Storage**: SQLite (dev) / PostgreSQL (prod) via Prisma — no schema changes for this feature
**Testing**: Vitest (unit/integration), Playwright (E2E)
**Target Platform**: Web application (Node.js server, browser client)
**Project Type**: Web service (Next.js full-stack)
**Performance Goals**: N/A — auth login is not performance-critical
**Constraints**: Credentials provider must never be available in production
**Scale/Scope**: Single-user application; 4 files modified, 0 new files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Portability | PASS | No provider-specific infrastructure; env-var driven |
| II. Tech Stack Discipline | PASS | Auth.js is canonical stack; bcryptjs is a utility dependency, not a stack addition. Constitution explicitly requires auth provider abstraction via env vars — this feature implements that for dev mode |
| III. Security | PASS | Credentials provider restricted to `NODE_ENV=development`; passwords verified via bcrypt hash; secrets remain in env vars; no credentials in repo |
| IV. Testing | PASS | TDD approach: unit tests for authorize/callback logic, E2E test for credentials login flow, `next build` verification |
| V. Simplicity | PASS | Minimal changes to existing files; no new abstractions; provider switching via single `NODE_ENV` check |

**Post-Phase 1 re-check**: All gates still pass. No new entities, no schema changes, no added complexity layers.

## Project Structure

### Documentation (this feature)

```text
specs/003-dev-credentials-auth/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: research decisions
├── data-model.md        # Phase 1: data model (env-var based, no DB changes)
├── quickstart.md        # Phase 1: implementation quickstart
├── contracts/
│   └── auth-providers.md  # Phase 1: provider selection contract
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── auth.ts                          # Modified: add credentials provider, update signIn callback
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx             # Modified: add credentials form for dev mode
│   └── api/
│       └── auth/[...nextauth]/
│           └── route.ts             # Unchanged (re-exports handlers)
└── middleware.ts                    # Unchanged

tests/
├── unit/
│   └── auth/
│       └── auth.test.ts             # Modified: add credentials provider tests
└── e2e/
    └── auth.spec.ts                 # Modified: add credentials login E2E test

.env.example                         # Modified: document dev credential vars
package.json                         # Modified: add bcryptjs dependency
```

**Structure Decision**: Existing Next.js App Router structure. All changes fit within existing files — no new source files needed.
