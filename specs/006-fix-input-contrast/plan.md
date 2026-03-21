# Implementation Plan: Fix Input Field Text Contrast

**Branch**: `006-fix-input-contrast` | **Date**: 2026-03-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-fix-input-contrast/spec.md`

## Summary

Fix invisible form input text caused by an accidental dark mode CSS media query from the Next.js starter template. When a user's OS is in dark mode, `--foreground` becomes `#ededed` (light gray) while component backgrounds remain hardcoded white — producing ~1.17:1 contrast ratio (effectively invisible text). The fix removes the dark mode media query, adds defensive global form element styles, declares `color-scheme: light`, and audits all text elements for WCAG AA compliance.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 15 (App Router)
**Primary Dependencies**: Tailwind CSS v4.0.0 (via `@tailwindcss/postcss`), no `tailwind.config` file (v4 defaults)
**Storage**: N/A (no data model changes)
**Testing**: Vitest (unit), Playwright (E2E per constitution)
**Target Platform**: Web — Chrome, Firefox, Safari, Edge
**Project Type**: Web application (Next.js)
**Performance Goals**: N/A (CSS-only change)
**Constraints**: WCAG AA minimum 4.5:1 contrast ratio for normal text, 3:1 for large text and placeholders
**Scale/Scope**: 1 global CSS file + 4 component files with form elements

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Portability | PASS | No provider-specific changes |
| II. Tech Stack Discipline | PASS | Using existing Tailwind CSS; no new dependencies |
| III. Security | PASS | No security implications — CSS-only change |
| IV. Testing — TDD | PASS | Bug fix requires regression test before fix (red-green-refactor) |
| IV. Testing — Build Verification | PASS | `next build` required before implementation complete |
| IV. Testing — E2E Coverage | PASS | Playwright test required for form input contrast |
| V. Simplicity | PASS | Global CSS fix is the simplest approach; no per-component overrides |

**Post-Phase 1 Re-check**: All gates still pass. No design decisions introduce complexity violations.

## Project Structure

### Documentation (this feature)

```text
specs/006-fix-input-contrast/
├── plan.md              # This file
├── research.md          # Root cause analysis, contrast audit, decisions
├── data-model.md        # N/A (CSS-only fix, no data changes)
├── quickstart.md        # Verification steps
├── contracts/
│   └── global-styles.md # CSS contract: colour scheme rules, WCAG requirements
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── globals.css                           # PRIMARY: global colour scheme fix
│   ├── layout.tsx                            # Root layout (imports globals.css)
│   ├── (auth)/
│   │   ├── layout.tsx                        # Auth layout — audit text contrast
│   │   └── login/
│   │       └── LoginContent.tsx              # Login form — audit input contrast
│   └── (app)/
│       ├── layout.tsx                        # App layout — audit nav/text contrast
│       └── holdings/
│           ├── HoldingsClient.tsx            # Holdings list + Add Holding form
│           └── [id]/
│               └── HoldingDetailClient.tsx   # Holding detail + inline edit forms
└── components/
    └── ui/
        └── AccountFilter.tsx                 # Account filter select dropdown

tests/
├── unit/                                     # Contrast utility tests (if needed)
└── e2e/                                      # Playwright regression tests
```

**Structure Decision**: Existing Next.js App Router structure. Changes are limited to `globals.css` (primary fix) and 4 component files (audit/explicit color classes). No new directories or structural changes needed.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
