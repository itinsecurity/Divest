# Contributing to Divest

Thank you for your interest in contributing! This guide covers everything you need to get started.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

## Getting Started

### Prerequisites

> _Tech stack prerequisites will be documented here once the stack is finalised._

### Local Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/<your-username>/divest.git
   cd divest
   ```

2. Install dependencies:
   > _Installation instructions will be added here._

3. Copy the environment template and fill in local values:
   ```bash
   cp .env.example .env
   ```

4. Run the test suite to verify your setup:
   > _Test command will be added here._

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

2. Make your changes. All new features require tests; all bug fixes require a regression test.

3. Ensure the test suite passes and your code is formatted.

4. Push your branch and open a PR against `main`. Fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md).

5. PRs are merged by **squash merge** — keep the squash commit message clear and descriptive.

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

> _Test commands will be documented here once the tech stack is set._

## Code Style

> _Linting and formatting commands will be documented here once the tech stack is set._
