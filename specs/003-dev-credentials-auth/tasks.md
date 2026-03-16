# Tasks: Dev Credentials Authentication

**Input**: Design documents from `/specs/003-dev-credentials-auth/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/auth-providers.md ✓, quickstart.md ✓

**Tests**: Included — TDD approach explicitly required by research R6 and constitution IV.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Install the one new dependency and document environment variables.

- [X] T001 Add `bcryptjs` and `@types/bcryptjs` to dependencies in `package.json` (run `npm install bcryptjs @types/bcryptjs`)
- [X] T002 [P] Update `.env.example` to document `AUTH_USERNAME` and `AUTH_PASSWORD_HASH_B64` as dev-only variables (with a comment explaining base64-encoded bcrypt hash format) alongside existing production vars

---

## Phase 3: User Story 1 — Local Dev Login (Priority: P1) 🎯 MVP

**Goal**: A developer can sign in with username/password when running in development mode. The credentials provider is available in dev and omitted gracefully if env vars are missing.

**Independent Test**: Start dev server (`npm run dev`) with `AUTH_USERNAME` and `AUTH_PASSWORD_HASH_B64` set, navigate to `/login`, enter valid credentials, verify redirect to the application.

### Tests for User Story 1

> **Write these tests FIRST — ensure they FAIL before implementing T004 and T005**

- [X] T003 [US1] Add unit tests for the credentials `authorize()` callback in `tests/unit/auth/auth.test.ts`: cover valid credentials (returns user object), wrong password (returns null), wrong username (returns null), and missing env vars (provider omitted / returns null gracefully)

### Implementation for User Story 1

- [X] T004 [US1] Update `src/auth.ts` to conditionally include `Credentials` provider from `next-auth/providers/credentials` when `NODE_ENV === 'development'` and both `AUTH_USERNAME` and `AUTH_PASSWORD_HASH_B64` env vars are set; implement `authorize()` using `bcryptjs.compare` against the base64-decoded hash (depends on T001, T003)
- [X] T005 [US1] Update `src/app/(auth)/login/page.tsx` to render a username/password `<form>` that calls `signIn('credentials', ...)` when the page is served in development mode; pass `isDev` as a server-side prop using `process.env.NODE_ENV` (do not expose `NODE_ENV` via `NEXT_PUBLIC_*`) (depends on T004)

**Checkpoint**: At this point, credentials login works locally. Start dev server, log in with the configured username/password, verify access.

---

## Phase 4: User Story 2 — Production GitHub OAuth (Priority: P1)

**Goal**: In production, only GitHub OAuth is available; the credentials provider is never exposed regardless of environment variable presence.

**Independent Test**: Run `NODE_ENV=production npm run build && npm start`, navigate to `/login`, verify only the GitHub sign-in button is rendered and `/api/auth/callback/credentials` returns 404 or unauthorized.

### Tests for User Story 2

> **Write these tests FIRST — ensure they FAIL before implementing T007**

- [X] T006 [US2] Add unit tests for the `signIn` callback in `tests/unit/auth/auth.test.ts`: credentials provider allowed in development, credentials provider denied in production (any input), GitHub provider allowed when `profile.id === AUTH_GITHUB_OWNER_ID`, GitHub provider denied otherwise

### Implementation for User Story 2

- [X] T007 [US2] Update the `signIn` callback in `src/auth.ts` to permit the `credentials` provider when `NODE_ENV === 'development'` and deny it in production; the existing GitHub owner-ID gating logic must remain unchanged (depends on T004, T006)

**Checkpoint**: At this point, production mode shows GitHub OAuth only and credentials login is inaccessible.

---

## Phase 5: User Story 3 — Seamless Environment Switching (Priority: P2)

**Goal**: The auth mechanism switches automatically via `NODE_ENV` — no code changes needed to go from dev to production auth.

**Independent Test**: Confirm that the same codebase, started with `NODE_ENV=development`, shows credentials form and, started with `NODE_ENV=production` (after build), shows only GitHub button — without any source changes.

### Tests for User Story 3

- [X] T008 [US3] Add a Playwright E2E test in `tests/e2e/auth.spec.ts` for the full credentials login flow: navigate to `/login`, verify credentials form is visible, submit valid username/password, verify successful redirect to the application home page (depends on T005, T007)

**Checkpoint**: Full auth switching is verified automatically — dev uses credentials, production uses GitHub.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete implementation end-to-end.

- [X] T009 Run `next build` to confirm zero TypeScript errors introduced by this feature
- [X] T010 [P] Run the full test suite (`npx vitest run` for unit/integration, `npx playwright test` for E2E) and confirm all tests pass including the new ones

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; T001 and T002 run in parallel
- **US1 (Phase 3)**: Depends on T001 (bcryptjs installed) — T003 can start before T001 completes, T004 requires T001
- **US2 (Phase 4)**: Depends on T004 (credentials provider in auth.ts) for T007 to update the same callback correctly
- **US3 (Phase 5)**: Depends on T005 and T007 — the E2E test exercises the full integrated flow
- **Polish (Phase 6)**: Depends on all implementation tasks complete

### User Story Dependencies

- **US1**: After T001 installed — no dependency on US2 or US3
- **US2**: Shares `src/auth.ts` with US1 — implement after T004 to avoid merge conflicts
- **US3**: After US1 and US2 — the E2E test validates the combined behaviour

### Within Each User Story

- Tests MUST be written first and FAIL before implementation
- `authorize()` implementation (T004) before login page (T005)
- `authorize()` implementation (T004) before signIn callback update (T007)

### Parallel Opportunities

- T001 and T002 can run in parallel (different files)
- T003 (unit test for authorize) and T006 (unit test for signIn callback) can be written in parallel once T001 is done, as they add non-conflicting test blocks in the same file
- T009 and T010 can start in parallel once all implementation tasks are complete

---

## Parallel Example: Setup Phase

```bash
# Run these in parallel:
Task T001: npm install bcryptjs @types/bcryptjs  →  updates package.json + package-lock.json
Task T002: Edit .env.example                     →  no dependency on T001
```

## Parallel Example: Tests for US1 and US2

```bash
# Write tests concurrently (different describe blocks in same file):
Task T003: tests for authorize() callback
Task T006: tests for signIn() callback
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001, T002)
2. Complete Phase 3: US1 (T003 → T004 → T005)
3. **STOP and VALIDATE**: Start dev server, sign in with credentials, verify access
4. Ship if local dev unblocking is the only goal

### Incremental Delivery

1. Setup (T001–T002) → bcryptjs available
2. US1 (T003–T005) → dev login works → validate independently
3. US2 (T006–T007) → production safety verified → validate independently
4. US3 (T008) → automated E2E proof of env switching
5. Polish (T009–T010) → clean build, all tests green

---

## Notes

- [P] tasks = different files or non-conflicting edits, safe to parallelize
- `AUTH_PASSWORD_HASH_B64` is base64-encoded — always decode with `Buffer.from(hash, 'base64').toString('utf8')` before passing to `bcryptjs.compare`
- `process.env.NODE_ENV` is server-side only; never use `NEXT_PUBLIC_NODE_ENV` or expose it to client bundles
- No Prisma migration required — this feature is entirely env-var driven
- Commit after each checkpoint to isolate changes
