# Tasks: Fix Input Field Text Contrast

**Input**: Design documents from `/specs/006-fix-input-contrast/`
**Prerequisites**: plan.md, spec.md, research.md, contracts/global-styles.md, quickstart.md

**Tests**: E2E test included — required by constitution (TDD: red-green-refactor) and explicitly mandated in plan.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Exact file paths are included in all descriptions

---

## Phase 1: Setup

*Not applicable — CSS-only bugfix on an existing project. No initialization required.*

---

## Phase 2: Foundational

*Not applicable — no blocking infrastructure prerequisites. US1 and US2 can proceed directly.*

---

## Phase 3: User Story 1 — Application-Wide Colour Scheme for Form Elements (Priority: P1)

**Goal**: Fix invisible form input text by removing the conflicting dark mode media query and adding defensive global form element styles per the global-styles contract.

**Independent Test**: Navigate to `/login` and `/holdings` with OS in dark mode — all form inputs must display dark, clearly readable text against white backgrounds without any per-component colour overrides.

### E2E Test for User Story 1 (TDD: write first, verify FAIL before implementing T002-T004)

- [X] T001 [US1] Write Playwright E2E regression test for form input contrast in tests/e2e/input-contrast.spec.ts — test must FAIL before the fix is applied

### Implementation for User Story 1

- [X] T002 [US1] Remove the `@media (prefers-color-scheme: dark)` block entirely from src/app/globals.css
- [X] T003 [US1] Add `color-scheme: light` to the `:root` rule in src/app/globals.css
- [X] T004 [US1] Add explicit `color: var(--foreground)` and `background-color: #ffffff` rules for `input, select, textarea` in src/app/globals.css

**Checkpoint**: Run `npm run test:e2e` — T001 test must now pass. Navigate to `/holdings` and `/login` with OS in dark mode — form inputs must show dark text on white backgrounds.

---

## Phase 4: User Story 2 — Consistent Contrast Across All UI Text (Priority: P2)

**Goal**: Audit all text-bearing component files and ensure every text element uses an explicit, contrast-safe Tailwind colour class per the approved palette in contracts/global-styles.md (no `text-gray-400` or lighter for readable text).

**Independent Test**: Navigate all pages (login, holdings list, holding detail, portfolio) — no text elements appear washed out or hard to read; all labels, headings, body text, table content, nav links, and button text are clearly readable.

### Implementation for User Story 2

- [X] T005 [P] [US2] Audit and fix text contrast in src/app/(auth)/login/LoginContent.tsx — verify all input labels, button text, and body copy use approved colour classes
- [X] T006 [P] [US2] Audit and fix text contrast in src/app/(app)/holdings/HoldingsClient.tsx — verify all table text, labels, headings, and button text use approved colour classes
- [X] T007 [P] [US2] Audit and fix text contrast in src/app/(app)/holdings/[id]/HoldingDetailClient.tsx — verify all inline edit labels, field values, and button text use approved colour classes
- [X] T008 [P] [US2] Audit and fix text contrast in src/components/ui/AccountFilter.tsx — verify select label and option text use approved colour classes
- [X] T009 [P] [US2] Audit and fix text contrast in src/app/(auth)/layout.tsx and src/app/(app)/layout.tsx — verify any layout-level text, nav links, and headings use approved colour classes

**Checkpoint**: Navigate all pages — all text is clearly readable; no colour class below `text-gray-500` is used on any readable text element.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T010 Run build to verify no TypeScript or CSS errors: `npm run build`
- [X] T011 Run full test suite and verify all tests pass: `npm test && npm run test:e2e`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 3 (US1)**: Write T001 E2E test first and verify it FAILS, then implement T002-T004 sequentially (all modify `globals.css`)
- **Phase 4 (US2)**: Can begin after T002-T004 are complete — the global fix provides the stable base that makes component-level overrides unnecessary; T005-T009 are fully parallel
- **Phase 5 (Polish)**: After all implementation tasks complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies — starts immediately
- **User Story 2 (P2)**: Independent of US1 but should follow it — audit results determine whether per-component fixes are needed beyond the global styles

### Within User Story 1

- T001 (E2E test) MUST be written and verified to FAIL before T002-T004 (TDD: red before green)
- T002, T003, T004 all modify `src/app/globals.css` — run sequentially in that order

### Parallel Opportunities

- T005, T006, T007, T008, T009 (US2 component audits) are fully parallel — different files, no shared dependencies

---

## Parallel Example: User Story 2

```bash
# All component audits can run simultaneously:
Task: T005 — Audit src/app/(auth)/login/LoginContent.tsx
Task: T006 — Audit src/app/(app)/holdings/HoldingsClient.tsx
Task: T007 — Audit src/app/(app)/holdings/[id]/HoldingDetailClient.tsx
Task: T008 — Audit src/components/ui/AccountFilter.tsx
Task: T009 — Audit src/app/(auth)/layout.tsx and src/app/(app)/layout.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: write E2E test (T001), verify it fails, then apply globals.css fix (T002-T004)
2. **STOP and VALIDATE**: Run `npm run test:e2e`, verify in dark mode OS that form inputs are readable
3. Deploy/demo if ready — the root cause is fixed

### Incremental Delivery

1. Complete US1 (globals.css fix) → test independently → validate form inputs readable in all modes
2. Complete US2 (component audit) → test independently → validate all text contrast across all pages
3. Polish: build + full test suite pass

---

## Notes

- [P] tasks = different files, no dependencies between them
- [Story] label maps each task to its user story for traceability
- **TDD requirement (constitution IV)**: T001 must be written and verified to FAIL before implementing T002-T004
- Contrast thresholds per contracts/global-styles.md: 4.5:1 normal text, 3:1 large text and placeholders
- **Do NOT use** `text-gray-400` or lighter for any readable text (contrast drops below 3:1)
- Commit after each task or logical group
