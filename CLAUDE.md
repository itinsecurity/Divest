# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Communication Style

**Be concise**: Avoid repetitive announcements. Don't say "I will now..." then "Now writing..." then "Completed...". Just do the work and report results once.

**No pre-edit diffs**: If you have permission to edit a file, make the edit directly. Don't show the user what you're about to change - just do it and report the result.

## Project Governance

Project principles, development standards, workflow rules, security requirements, testing requirements, and quality gates are governed by `.specify/memory/constitution.md`. **Read it before making any development decisions.**

## Feature Development

All feature development uses the speckit workflow. Use `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, and `/speckit.implement` commands in sequence. See the constitution for full workflow details.

## GitHub Integration

Use `gh` CLI for all GitHub operations:
- Create PRs: `gh pr create`
- Check PR status: `gh pr status`
- View issues: `gh issue list`
- Trigger workflows: `gh workflow run`

**Branch naming**:
- `feature/description-of-feature`
- `bugfix/description-of-bug`
- `chore/description-of-task`
- `hotfix/critical-issue`

**PR title format**: Conventional Commits — `type(scope): description` (e.g. `feat: add login`, `fix(auth): handle timeout`). The PR title becomes the squash commit message on `main`.

## Release Process

Use the `/release` command to guide through versioning, changelog update, tagging, and push. GitHub Actions handles release creation and deployment dispatch to divest-infra automatically.

## Project Status

*This section will be updated as the project develops.*

### Active Branch
`001-holdings-portfolio` — Holdings Registration and Portfolio Profile

### Current Status
Feature `001-holdings-portfolio` fully implemented (T001–T060, all 60 tasks). Application is runnable. Ready for PR.

**What's working**: Full holdings CRUD, primary enrichment queue (stub fetchers), AI secondary enrichment pipeline (stub AI provider), spread analysis (stock/interest, sector, geographic), manual profile field editing (user-supplied tracking), profile refresh, Auth.js credentials auth, Prisma schema + migrations, seed data. 88 unit tests + 31 integration tests passing, 0 TypeScript errors. CI updated with real lint/test/typecheck jobs.

### Known Issues
None currently.

## Recent Changes
- 006-fix-input-contrast: CSS contrast fix — global form element styles, WCAG AA compliance
