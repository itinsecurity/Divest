# Contributing to Divest

Thank you for your interest in contributing! This guide covers everything you need to get started.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

## Getting Started

### Prerequisites

- **Node.js 20+ LTS**
- **PostgreSQL** — or use SQLite for lightweight local dev (set `DATABASE_URL="file:./dev.db"` in `.env.local`)
- **Git**

### Local Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/<your-username>/divest.git
   cd divest
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment template and fill in local values:
   ```bash
   cp .env.example .env.local
   ```
   See [README.md](README.md#environment-variables) for a description of each variable.

4. Set up the database:
   ```bash
   npx prisma db push    # Apply schema
   npx prisma db seed    # Optional: load sample data
   ```

5. Run the test suite to verify your setup:
   ```bash
   npm test
   ```

6. Start the dev server:
   ```bash
   npm run dev           # http://localhost:3000
   ```

## How to Contribute

### Reporting Bugs

Use the [bug report issue template](.github/ISSUE_TEMPLATE/bug_report.yml). Include:
- A clear description of what went wrong
- Steps to reproduce
- Expected vs actual behaviour
- Your environment details

### Requesting Features

Use the [feature request issue template](.github/ISSUE_TEMPLATE/feature_request.yml).

### Submitting Pull Requests

1. Create a branch from `main` using the naming convention:
   - `feature/description-of-feature`
   - `bugfix/description-of-bug`
   - `chore/description-of-task`
   - `hotfix/critical-issue`

2. Make your changes. All new features require tests; all bug fixes require a regression test.

3. Ensure all checks pass before opening a PR:
   ```bash
   npm run typecheck    # No TypeScript errors
   npm run lint         # No ESLint errors
   npm test             # Unit tests pass
   npm run test:integration  # Integration tests pass
   ```

4. Push your branch and open a PR against `main`. Fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md).

5. PRs are merged by **squash merge**. The PR title becomes the squash commit message on `main`, so it must follow the Conventional Commits format below (e.g. `feat: add user preferences endpoint`).

## Commit Message Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short description

feat(api): add user preferences endpoint
fix(parser): handle empty input gracefully
docs: update installation instructions
chore: bump dependencies
refactor(core): extract validation logic
test(auth): add missing edge-case coverage
```

| Type | Purpose | SemVer impact |
|------|---------|---------------|
| `feat` | New feature | MINOR bump |
| `fix` | Bug fix | PATCH bump |
| `docs` | Documentation only | No bump |
| `chore` | Tooling, deps, build | No bump |
| `refactor` | Code restructure, no behaviour change | No bump |
| `test` | Adding or fixing tests | No bump |
| `ci` | CI/CD changes | No bump |
| `BREAKING CHANGE` | Footer or `!` after type | MAJOR bump |

## Running Tests

```bash
npm test                      # Unit tests (Vitest)
npm run test:watch            # Watch mode — primary TDD loop
npm run test:integration      # Integration tests (real SQLite DB)
npm run test:e2e              # E2E tests (Playwright)
```

Tests live under `tests/`:
- `tests/unit/` — unit tests for calculations, utilities, and components
- `tests/integration/` — server action tests against a real SQLite database
- `tests/e2e/` — Playwright end-to-end user flows

## Code Style

```bash
npm run lint        # ESLint (reports errors; fix with --fix flag)
npm run typecheck   # TypeScript strict type checking
```

The project uses ESLint with the Next.js config and TypeScript strict mode. There are no separate formatting rules — just keep your code consistent with the surrounding style.
