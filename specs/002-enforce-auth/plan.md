# Implementation Plan: Enforce Authentication

**Branch**: `002-enforce-auth` | **Date**: 2026-03-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-enforce-auth/spec.md`

## Summary

Replace the existing Credentials provider (username/password + bcrypt hash in env var) with GitHub OAuth via Auth.js v5. Authentication is delegated entirely to GitHub; the application enforces single-owner access by comparing the GitHub-returned user ID against `AUTH_GITHUB_OWNER_ID` in environment configuration. The login page is simplified to a single "Sign in with GitHub" button. `bcryptjs` is removed as a dependency. E2E tests bypass the OAuth flow via pre-generated Auth.js JWT session tokens injected as Playwright storage state.

## Technical Context

**Language/Version**: TypeScript 5.6, Node.js 22, Next.js 15.2 (App Router)
**Primary Dependencies**: `next-auth` 5.0.0-beta.30, GitHub OAuth provider (bundled in next-auth), `@auth/core/jwt` (bundled)
**Storage**: SQLite (dev) / PostgreSQL (prod) via Prisma — **no schema changes** for this feature
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Self-hosted web application (Node.js server)
**Performance Goals**: Login flow < 30s (SC-002); OAuth redirect latency is provider-dependent and outside application control
**Constraints**: No secrets in repo; single authorized GitHub user ID; `AUTH_TRUST_HOST=true` required when behind a reverse proxy
**Scale/Scope**: Single-user application; no concurrent session concerns

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Portability | ✅ PASS | No provider-specific SDK beyond Auth.js (canonical stack). `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_GITHUB_OWNER_ID` are env-var-configured. No hosting assumptions. |
| II. Tech Stack Discipline | ✅ PASS | Auth.js is the canonical auth mechanism. GitHub provider is accessed via the existing `src/lib/auth/` abstraction layer. No new stack additions. `bcryptjs` removed (no longer needed). |
| III. Security | ✅ PASS | No secrets in repo. Auth enforced at middleware for all routes. Owner identity check in `signIn` callback prevents unauthorized GitHub accounts from creating sessions. Session cookie is httpOnly + signed JWT. |
| IV. Testing | ✅ PASS | TDD required: unit tests for `signIn` callback and login page written before implementation. E2E covers login happy path (redirect → GitHub flow mock → dashboard) and unauthenticated redirect. `next build` required before feature is considered complete. |
| V. Simplicity | ✅ PASS | Replaces bcrypt management with OAuth delegation — net reduction in complexity. No new abstractions. YAGNI: no multi-provider support, no session database. |

**Post-design re-check**: No violations introduced by Phase 1 design. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/002-enforce-auth/
├── plan.md              # This file
├── research.md          # Phase 0 output ✅
├── data-model.md        # Phase 1 output ✅
├── quickstart.md        # Phase 1 output ✅
├── contracts/
│   └── auth-api.md      # Phase 1 output ✅
└── tasks.md             # Phase 2 output (/speckit.tasks — not created by /speckit.plan)
```

### Source Code Changes

```text
src/
├── auth.ts                          # REPLACE: Credentials → GitHub provider + signIn callback
├── middleware.ts                    # NO CHANGE: already correct
├── lib/
│   └── auth/
│       ├── types.ts                 # UPDATE: remove credentials param from signIn signature
│       ├── authjs.ts                # NO CHANGE
│       └── index.ts                 # NO CHANGE
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx             # REPLACE: form → GitHub sign-in button + error display
│   └── (app)/
│       └── layout.tsx               # NO CHANGE: already checks auth() and redirects

tests/
├── unit/
│   └── auth/
│       └── auth.test.ts             # NEW: signIn callback unit tests
└── e2e/
    ├── global-setup.ts              # UPDATE: generate JWT session token + write storageState
    ├── holdings.spec.ts             # UPDATE: replace form-based login helper
    └── portfolio.spec.ts            # UPDATE: replace form-based login helper

playwright.config.ts                 # UPDATE: storageState, remove bcrypt env vars
.env.example                         # UPDATE: replace auth vars
package.json                         # UPDATE: remove bcryptjs + @types/bcryptjs
```

**Structure Decision**: Single Next.js project (App Router). All auth changes are within existing directories — no new src directories required. The `src/lib/auth/` abstraction layer is preserved and updated, satisfying Constitution Principle II.

## Complexity Tracking

> No constitution violations — table not required.
