# Research: Dev Credentials Authentication

**Branch**: `003-dev-credentials-auth` | **Date**: 2026-03-16

## R1: Auth.js v5 Credentials Provider

**Decision**: Use `next-auth/providers/credentials` with `authorize()` callback that validates against env vars `AUTH_USERNAME` and `AUTH_PASSWORD_HASH_B64`.

**Rationale**: Auth.js v5 supports credentials provider natively. The project already uses JWT sessions (not database sessions), so credentials provider integrates without schema changes. Environment variables for dev credentials already exist in `.env.local`.

**Alternatives considered**:
- Database-backed user table: Overkill for single-user dev auth; would require migration and seed changes.
- Hardcoded dev bypass (skip auth entirely in dev): Violates constitution III (auth is prerequisite for all features) and wouldn't test auth flows locally.

## R2: Password Hashing Library

**Decision**: Use `bcryptjs` (pure JS implementation) for password hash verification.

**Rationale**: The existing `AUTH_PASSWORD_HASH_B64` value in `.env.local` is a base64-encoded bcrypt hash (`$2a$10$...`). `bcryptjs` is a pure JavaScript bcrypt implementation — no native compilation needed, works on all platforms (Windows, Linux, macOS) without build tools. The `bcrypt` npm package requires native compilation which can fail on some systems.

**Alternatives considered**:
- `bcrypt` (native): Requires node-gyp and C++ compiler; can fail on Windows or in CI without build tools.
- `argon2`: Better algorithm but would require re-hashing the existing password.
- Plain text comparison: Insecure, violates constitution III.

## R3: Environment-Based Provider Switching

**Decision**: Conditionally build the `providers` array in `src/auth.ts` based on `process.env.NODE_ENV`.

**Rationale**: Next.js sets `NODE_ENV=development` for `npm run dev` and `NODE_ENV=production` for `npm run build && npm start`. This is the standard, zero-config way to distinguish environments. The constitution requires auth configuration via environment variables.

**Alternatives considered**:
- Custom env var like `AUTH_MODE=credentials|github`: Adds unnecessary configuration; `NODE_ENV` already captures the distinction.
- Feature flag: Over-engineered for a dev-only concern.

## R4: Login Page Dual UI

**Decision**: The login page component checks a server-injected prop or environment indicator to render either a credentials form (dev) or GitHub button (production). Use a server component to pass the environment mode as a prop.

**Rationale**: `process.env.NODE_ENV` is available server-side. A server component wrapper can pass `isDev` to the client login form. This avoids exposing `NODE_ENV` to the client bundle directly.

**Alternatives considered**:
- Client-side `process.env.NEXT_PUBLIC_AUTH_MODE`: Exposes implementation detail to client; requires an additional env var.
- Two separate login pages with routing: Duplicates UI; harder to maintain.

## R5: signIn Callback Handling

**Decision**: Extend the existing `signIn` callback to allow credentials provider in development mode, while keeping GitHub owner-ID gating for production.

**Rationale**: The current callback rejects any non-GitHub provider. It needs to also accept `credentials` provider when `NODE_ENV === "development"`. The callback already has the right structure — just needs a conditional branch.

## R6: Test Strategy

**Decision**:
- Unit tests: Test the `authorize()` function and updated `signIn` callback logic.
- Integration tests: Already set up with `AUTH_USERNAME`/`AUTH_PASSWORD_HASH` env vars — add credentials flow tests.
- E2E tests: Add Playwright test for credentials login flow (dev mode).

**Rationale**: Constitution IV mandates TDD and E2E coverage for user-facing features. The existing test infrastructure already references credentials env vars, suggesting this was planned.
