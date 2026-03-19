# Tasks: Force Dynamic Page Rendering

**Input**: Design documents from `/specs/004-dynamic-rendering/`
**Prerequisites**: plan.md (required) ✓, spec.md (required) ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Organization**: Tasks grouped by user story. This feature is a configuration-only change — 4 files, 1 export line each. Phases 1 and 2 are skipped: no new dependencies, no new files, no schema changes, no blocking prerequisites.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

---

## Phase 1: Setup

*Skipped — existing project, no new dependencies, files, or infrastructure required.*

---

## Phase 2: Foundational

*Skipped — all 4 implementation tasks are independent of each other; no blocking prerequisites.*

---

## Phase 3: User Story 1 — Successful Deployment Without Database at Build Time (Priority: P1) MVP

**Goal**: The application builds successfully when no database is available, by forcing all `(app)` route group files to render dynamically at request time.

**Independent Test**: Unset `DATABASE_URL` and run `npm run build`. Build must complete with zero errors and show `(app)` routes as dynamically rendered (`f` or `l` symbol) in build output.

### Implementation

- [x] T001 [P] [US1] Add `export const dynamic = 'force-dynamic'` after imports in `src/app/(app)/layout.tsx`
- [x] T002 [P] [US1] Add `export const dynamic = 'force-dynamic'` after imports in `src/app/(app)/holdings/page.tsx`
- [x] T003 [P] [US1] Add `export const dynamic = 'force-dynamic'` after imports in `src/app/(app)/holdings/[id]/page.tsx`
- [x] T004 [P] [US1] Add `export const dynamic = 'force-dynamic'` after imports in `src/app/(app)/portfolio/page.tsx`
- [x] T005 [US1] Verify build succeeds without database: unset `DATABASE_URL`, run `npm run build`, confirm zero errors and that `(app)` routes appear as dynamic (not static) in build output

**Checkpoint**: User Story 1 complete — application builds successfully with no database available.

---

## Phase 4: User Story 2 — All Authenticated Pages Render Fresh Data (Priority: P2)

**Goal**: Every page load in the `(app)` route group fetches current data from the database at request time; no stale cached data is ever served.

**Independent Test**: With the app running, modify a holding in the database directly, refresh `/holdings` — updated data must appear immediately without rebuild or redeploy.

### Implementation

- [x] T006 [US2] Create Playwright E2E test for dynamic data freshness in `tests/e2e/dynamic-rendering.spec.ts`: navigate to `/holdings`, record a holding value, update that holding via the API or database, navigate back to `/holdings`, assert the updated value is displayed without rebuild

**Checkpoint**: User Story 2 verified — `(app)` pages always render fresh data from the database on every request.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Confirm no regressions in type safety or existing tests after the configuration changes.

- [x] T007 [P] Run `npx tsc --noEmit` and confirm zero TypeScript errors (SC-003)
- [x] T008 [P] Run `npm run test` and confirm all existing unit and integration tests pass (SC-003)

---

## Dependencies & Execution Order

### Phase Dependencies

- **User Story 1 (Phase 3)**: No prerequisites — start immediately
- **User Story 2 (Phase 4)**: T006 depends on T001–T004 (same code changes deliver both stories)
- **Polish (Phase 5)**: T007, T008 depend on T001–T004 being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies — start immediately
- **User Story 2 (P2)**: Shares code changes with US1; T006 can begin after T001–T004 complete

### Within Each Phase

- T001, T002, T003, T004 are fully parallelizable (different files, no shared state)
- T005 depends on T001–T004 (requires all 4 changes before build test)
- T006 depends on T001–T004 (runtime behavior requires all changes in place)
- T007 and T008 can run in parallel (different toolchains)

---

## Parallel Example: User Story 1

```bash
# Run all 4 implementation tasks simultaneously (all different files):
Task: "Add force-dynamic to src/app/(app)/layout.tsx"
Task: "Add force-dynamic to src/app/(app)/holdings/page.tsx"
Task: "Add force-dynamic to src/app/(app)/holdings/[id]/page.tsx"
Task: "Add force-dynamic to src/app/(app)/portfolio/page.tsx"

# After all 4 complete:
Task: "Verify build succeeds without database (T005)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001–T004 in parallel (4 file changes)
2. Complete T005 (build verification without database)
3. **STOP and VALIDATE**: Build passes without database — MVP delivered

### Incremental Delivery

1. T001–T004 in parallel → All `(app)` files export `force-dynamic`
2. T005 → Build verification complete (US1 delivered)
3. T006 → E2E data freshness test (US2 delivered)
4. T007, T008 in parallel → Zero regressions confirmed (Polish complete)

---

## Notes

- [P] tasks can be executed simultaneously — they touch different files with no shared dependencies
- All 4 implementation tasks (T001–T004) deliver both user stories; they cannot be separated
- Total diff: 1 line added to each of 4 files (`export const dynamic = 'force-dynamic'`)
- Placement: add the export statement immediately after the last `import` statement in each file
- Do NOT add `force-dynamic` to files outside the `(app)` route group (see research.md R3 for rationale)
- See `specs/004-dynamic-rendering/quickstart.md` for manual verification steps
