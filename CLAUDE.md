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
`007-primary-enrichment` — Live Primary Enrichment

### Current Status
Feature `007-primary-enrichment` fully implemented (T001–T043, all 43 tasks). Application builds successfully. Ready for PR.

**What's working**: Live Euronext Oslo stock lookup (searchJSON API, ticker parsing, MIC→exchange mapping), Storebrand fund profile PDF extraction (unpdf, sector/geographic weightings), Euronext fund list fallback, web search fallback via Serper.dev (graceful no-op when SERPER_API_KEY unset), disambiguation (NEEDS_INPUT status, EnrichmentCandidate persistence, resolve endpoint, UI card), DB-backed enrichment cache (EnrichmentCache model, configurable TTL), per-host rate limiting, retry-once on transient errors, field source priority (user > enrichment > ai_extraction). 161 unit tests passing, integration tests run in CI. 0 TypeScript errors.

**Known limitation**: Euronext does not provide sector/industry for stocks; stock enrichment always results in PARTIAL status until a secondary enrichment document is uploaded.

### Known Issues
None currently.

## Recent Changes
- 007-primary-enrichment: Real HTTP enrichment sources (Euronext, Storebrand, Euronext fund list, Serper.dev fallback), disambiguation UI, resolve endpoint, EnrichmentCache + EnrichmentCandidate DB models
- 006-fix-input-contrast: CSS contrast fix — global form element styles, WCAG AA compliance

## Active Technologies
- TypeScript 5.6 / Node.js 24 + Next.js 16 (App Router), Prisma 7.5, cheerio 1.0, unpdf 1.4, zod 4 — all existing in `package.json`; no new runtime packages (007-primary-enrichment)
- PostgreSQL (production) / SQLite-compatible Prisma schema; 2 new models added (007-primary-enrichment)
