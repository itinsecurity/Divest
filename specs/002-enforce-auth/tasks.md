# Tasks: Enforce Authentication

**Input**: Design documents from `/specs/002-enforce-auth/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/auth-api.md ✅, quickstart.md ✅

**Tests**: Included — TDD required per constitution (IV. Testing). Unit tests and E2E tests must be written and confirmed failing before their corresponding implementation tasks.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Remove obsolete credential dependencies and update environment configuration.

- [x] T001 Remove `bcryptjs` and `@types/bcryptjs` from `package.json` dependencies and devDependencies
- [x] T002 [P] Update `.env.example`: remove `AUTH_USERNAME` and `AUTH_PASSWORD_HASH_B64`; add `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_GITHUB_OWNER_ID`, and `AUTH_TRUST_HOST` with inline descriptions matching `quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core auth module rewrite that all user story implementation depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Replace `src/auth.ts`: swap Credentials provider for GitHub OAuth provider (`import GitHub from "next-auth/providers/github"`), add `signIn` callback that compares `String(profile?.id)` against `process.env.AUTH_GITHUB_OWNER_ID` and returns false for non-matching users or non-github providers, set `pages: { signIn: "/login", error: "/login" }` and `session: { strategy: "jwt" }`
- [x] T004 Update `src/lib/auth/types.ts`: remove `credentials` parameter from the `signIn` method on the `AuthProvider` interface; update signature to `signIn(provider?: string): Promise<void>`

**Checkpoint**: Core auth module updated — user story phases can begin

---

## Phase 3: User Story 1 — Login to Access Application (Priority: P1) 🎯 MVP

**Goal**: Unauthenticated users see only the login page; GitHub OAuth grants access to the authorized owner and denies all others with a clear access-denied message.

**Independent Test**: Navigate to the app URL without a session — confirm login page with "Sign in with GitHub" button appears and no portfolio data is visible. Complete GitHub OAuth as owner — confirm dashboard loads. Complete GitHub OAuth as non-owner — confirm access-denied message on login page.

### Tests for User Story 1

> **NOTE: Write these tests FIRST and verify they FAIL before implementing T007–T009**

- [x] T005 [P] [US1] Write unit tests for the `signIn` callback in `tests/unit/auth/auth.test.ts`: test that authorized owner ID returns `true`, non-matching GitHub user ID returns `false`, non-github provider returns `false`, and missing `AUTH_GITHUB_OWNER_ID` env var returns `false`
- [x] T006 [P] [US1] Write E2E smoke test in `tests/e2e/auth.spec.ts` (new file): unauthenticated visit to `/` redirects to `/login`; login page renders "Sign in with GitHub" button; no portfolio data or navigation is visible on the login page

### Implementation for User Story 1

- [x] T007 [US1] Replace `src/app/(auth)/login/page.tsx`: remove the username/password form, add a "Sign in with GitHub" button that calls `signIn("github")` from `next-auth/react`, and add a conditional access-denied error message rendered when the URL contains `?error=AccessDenied`
- [x] T008 [US1] Update `tests/e2e/global-setup.ts`: add JWT session token generation using `encode` from `@auth/core/jwt` with `salt: "authjs.session-token"`, `secret: process.env.AUTH_SECRET`, and a token payload containing `sub: process.env.AUTH_GITHUB_OWNER_ID`; write the result as a Playwright storage state JSON file to `tests/e2e/.auth/user.json` with an `authjs.session-token` cookie for `localhost`
- [x] T009 [US1] Update `playwright.config.ts`: configure the authenticated test project to use `storageState: 'tests/e2e/.auth/user.json'`; remove any bcrypt-related environment variable references from the Playwright config

**Checkpoint**: User Story 1 fully functional — login/redirect/access-denied flow testable end-to-end

---

## Phase 4: User Story 2 — Complete Route Mediation (Priority: P2)

**Goal**: Every application route redirects unauthenticated requests to `/login` — no path exposes portfolio data without a valid session.

**Independent Test**: Without a session, navigate directly to `/holdings`, `/profile`, and the dashboard root — all must redirect to `/login` with no data exposed.

### Tests for User Story 2

> **NOTE: Write these tests FIRST and verify they FAIL (or confirm middleware gaps exist) before T011**

- [x] T010 [P] [US2] Add unauthenticated route-protection tests to `tests/e2e/auth.spec.ts`: verify that GET requests to `/holdings`, `/profile`, and `/` without a session each result in a redirect to `/login`

### Implementation for User Story 2

- [x] T011 [US2] Review `src/middleware.ts` matcher regex: confirm it covers all `(app)` route group paths and correctly excludes `/api/auth/*`, `/_next/*`, and `/favicon.ico`; update the matcher pattern if any application routes are found to be unprotected

**Checkpoint**: User Story 2 complete — comprehensive route mediation verified end-to-end

---

## Phase 5: User Story 3 — Logout (Priority: P3)

**Goal**: Authenticated users can end their session from within the application; post-logout navigation does not restore access.

**Independent Test**: Log in, click the logout control (visible without extra navigation), confirm redirect to `/login`, then use the browser back-button — confirm protected data is not accessible.

### Tests for User Story 3

> **NOTE: Write these tests FIRST and verify they FAIL before T013**

- [x] T012 [P] [US3] Add logout flow E2E test to `tests/e2e/auth.spec.ts`: using storageState (authenticated session), load a protected page, click the logout control, verify redirect to `/login`, then verify a subsequent direct navigation to `/holdings` redirects back to `/login`

### Implementation for User Story 3

- [x] T013 [US3] Add a logout button to the authenticated application shell in `src/app/(app)/layout.tsx` (or the closest shared nav/header component): the button calls `signOut()` from `next-auth/react`, is visible on every authenticated page without requiring additional navigation steps

**Checkpoint**: User Story 3 complete — all three stories independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Update dependent E2E test files to use the new auth mechanism, verify production build, and update changelog.

- [x] T014 [P] Update `tests/e2e/holdings.spec.ts`: replace any form-based login helpers or manual credential steps with storageState-based authentication (depends on `tests/e2e/.auth/user.json` generated in T008)
- [x] T015 [P] Update `tests/e2e/portfolio.spec.ts`: replace any form-based login helpers or manual credential steps with storageState-based authentication (depends on `tests/e2e/.auth/user.json` generated in T008)
- [x] T016 Run `npm run build` and confirm zero TypeScript errors, zero ESLint errors, and a clean production build output
- [x] T017 Update `CHANGELOG.md` under `[Unreleased]`: add entry for replacing Credentials provider with GitHub OAuth, enforcing single-owner identity check, removing `bcryptjs`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; T001 and T002 are parallel
- **Foundational (Phase 2)**: Depends on Phase 1; T003 before T004 (types.ts updated to match new auth.ts interface)
- **User Stories (Phase 3–5)**: All depend on Phase 2 completion
  - US1 (Phase 3): No cross-story dependencies
  - US2 (Phase 4): Independent of US1; middleware.ts has no dependency on login page changes
  - US3 (Phase 5): Independent of US1/US2; logout UI is self-contained
- **Polish (Phase 6)**: T014/T015 depend on T008 (storage state file); T016 depends on all stories complete

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2 — no cross-story dependencies
- **US2 (P2)**: Starts after Phase 2 — independent of US1; middleware already correct per plan (T011 is verification)
- **US3 (P3)**: Starts after Phase 2 — independent of US1/US2; logout UI is additive only

### Within Each User Story

- TDD order: tests written and confirmed failing → then implementation
- Phase 3: T005/T006 (write tests, verify fail) → T007 → T008 → T009
- Phase 4: T010 (write tests, verify fail) → T011
- Phase 5: T012 (write tests, verify fail) → T013

### Parallel Opportunities

- T001 ∥ T002 (Phase 1 — different files)
- T005 ∥ T006 (US1 tests — different files: unit vs E2E)
- T010 (US2 test) can be written in parallel with US1 implementation after Phase 2
- T012 (US3 test) can be written in parallel with US2 after Phase 2
- T014 ∥ T015 (Polish — different E2E spec files)

---

## Parallel Example: User Story 1 Test Writing

```bash
# After Phase 2 is complete, write both US1 tests in parallel:
Task T005: "Write unit tests for signIn callback in tests/unit/auth/auth.test.ts"
Task T006: "Write E2E smoke test in tests/e2e/auth.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T004)
3. Complete Phase 3: User Story 1 (T005–T009)
4. **STOP and VALIDATE**: Test login flow manually per `quickstart.md`
5. Application is auth-gated — shippable as MVP

### Incremental Delivery

1. Setup + Foundational → auth module updated (no bcrypt, GitHub provider wired)
2. US1 (Phase 3) → login/redirect/access-denied flow working → **MVP**
3. US2 (Phase 4) → route mediation confirmed comprehensive
4. US3 (Phase 5) → logout control added and working
5. Polish (Phase 6) → all existing E2E tests updated, build clean, changelog updated

### Parallel Team Strategy

With multiple developers (after Phase 2 is complete):
- Developer A: US1 (login page, global-setup, Playwright config)
- Developer B: US2 (middleware review, route mediation E2E)
- Developer C: US3 (logout UI, logout E2E)

---

## Notes

- `[P]` tasks operate on different files with no shared dependencies — safe to execute simultaneously
- TDD is mandatory per constitution (Principle IV): T005, T006, T010, T012 must be written and confirmed failing before their implementation tasks run
- `npm run build` (T016) is required per constitution before the feature is considered complete
- `tests/e2e/.auth/` is created at runtime by T008; add it to `.gitignore` if not already excluded
- Auth.js v5 auto-reads `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` from environment — no explicit constructor arguments needed in T003
- `AUTH_GITHUB_OWNER_ID` is a string in the environment; use `String(profile?.id)` for comparison to handle GitHub returning a numeric ID
