<!--
SYNC IMPACT REPORT
Version change: 1.0.0 → 1.1.0
Modified principles: IV. Testing — added Build Verification and E2E Coverage sub-requirements
Added sections: None (expanded existing section)
Removed sections: None
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check gate references constitution; no structural change needed (build/E2E gates are constitution-level, not template-level)
  ✅ .specify/templates/spec-template.md — no constitution-specific references; no change needed
  ✅ .specify/templates/tasks-template.md — no structural change needed; tasks already support test phases and checkpoints
Follow-up TODOs: None
-->

# Divest Constitution

## Core Principles

### I. Portability

Divest MUST be self-hostable without any dependency on a specific hosting provider.
No provider-specific SDK calls, environment assumptions, or infrastructure code belong in this
repository. All deployment configuration and infrastructure-as-code live in `divest-infra`.

**Rationale**: The app is personal tooling for a single owner. It must run anywhere the owner
chooses to host it — local machine, VPS, home server — without vendor lock-in.

### II. Tech Stack Discipline

The canonical stack is: **Next.js (App Router), TypeScript, Prisma, SQLite (local) /
Postgres (production), Tailwind, Recharts, Auth.js**.

AI provider integrations must sit behind an abstraction layer — no hardcoded dependency on any specific provider. Auth provider is likewise abstracted — no hardcoded dependency on any specific auth provider; configuration is entirely via environment variables. No stack additions or substitutions without a constitution amendment.

**Rationale**: A stable, explicit stack eliminates decision fatigue and keeps the codebase
comprehensible for a single-developer project.

### III. Security (NON-NEGOTIABLE)

Authentication is a prerequisite for all features. Nothing ships without auth in place.

- Secrets MUST be supplied via environment variables. No secret values in the repository.
- No financial data or personally identifiable information (PII) in logs.
- All API routes MUST validate and sanitise inputs before processing.
- Code MUST follow secure coding practices (OWASP Top 10 as baseline).

These are hard constraints, not trade-offs. Any PR that weakens these requirements MUST be
rejected.

**Rationale**: Divest handles personal financial data. Lax security is unacceptable regardless of
single-user scope.

### IV. Testing (NON-NEGOTIABLE)

TDD is mandatory across the codebase. Tests MUST be written and approved before implementation
begins. Strict red → green → refactor cycle enforced.

What constitutes adequate test coverage varies by layer:
- **Financial calculation logic**: Tests MUST cover all paths, edge cases, and boundary conditions.
- **UI work**: Tests MUST cover critical user journeys; exhaustive coverage of every render state
  is not required.
- **Bug fixes**: Every bug fix MUST be accompanied by a regression test that reproduces the
  defect before the fix is applied.

#### Build Verification

A passing test suite that does not verify the application boots and serves real requests provides
no deployment confidence. All features MUST pass `next build` before the implementation phase is
considered complete. Type checking (`tsc`) is not a substitute — it does not enforce
framework-level constraints such as Server Component rules, route validation, or build-time
optimizations.

#### E2E Coverage

Every user-facing feature MUST have at least one Playwright test covering the happy path before
the PR is mergeable. A stub that always passes is worse than no test, because it creates the
illusion of coverage. E2E tests MUST run in CI against a built application
(`next build && next start`), not a dev server.

**Rationale**: TDD keeps implementation honest and produces a safety net that matters most for
financial logic, where a silent error has real consequences. The standard for *what* to test is
calibrated by risk, not relaxed as a default. Build verification and E2E tests close the gap
between "tests pass" and "the application actually works" — without them, passing CI provides
false confidence.

### V. Simplicity

YAGNI. No premature abstraction. Every layer of complexity MUST be justified by a concrete,
present need — not a hypothetical future requirement.

When a simple approach exists, it MUST be chosen over an elaborate one unless the simple approach
provably cannot meet current requirements.

**Rationale**: This is a single-developer, single-user project. Complexity has a direct cost in
maintenance burden with no team to distribute it.

## Development Workflow

- Branch naming and PR process: follow `CLAUDE.md` and `CONTRIBUTING.md`.
- PR titles follow **Conventional Commits** format and become the squash commit message on `main`.
- In any ambiguous situation, this constitution is authoritative over other project documents.

## Governance

This constitution supersedes all other project conventions. Amendments require:

1. A clear rationale tied to current project needs.
2. A version increment according to the policy below.
3. Propagation to dependent templates (Sync Impact Report process in `/speckit.constitution`).

**Versioning policy**:
- MAJOR: Backward-incompatible removal or redefinition of an existing principle.
- MINOR: New principle or section added; material expansion of existing guidance.
- PATCH: Clarifications, wording, typo fixes, non-semantic refinements.

Compliance is reviewed at every PR via the Constitution Check gate in `plan.md`. Use `CLAUDE.md`
for runtime development guidance.

**Version**: 1.1.0 | **Ratified**: 2026-03-12 | **Last Amended**: 2026-03-14
