# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-03-18

### Added
- Dev credentials login provider for development/testing environments

### Changed
- **BREAKING**: Dev credentials login provider changes the authentication mechanism; existing deployments must update their auth configuration
- Next.js bumped to v16
- Zod bumped to v4
- Recharts bumped to v3
- `@types/bcryptjs` bumped to v3
- `actions/checkout` bumped to v6 in CI workflows
- CodeQL: use security-extended query pack, exclude tests folder and experimental queries
- CI workflow: add explicit permissions to all jobs

## [0.2.1] - 2026-03-16

### Fixed
- Add `postinstall: prisma generate` so Prisma client types are generated before `next build` in CI environments
- Exclude `prisma/` from Next.js TypeScript compilation (seed.ts is a standalone script, not part of the app)

## [0.2.0] - 2026-03-16

### Added
- GitHub OAuth authentication: login page replaced with "Sign in with GitHub" button
- Single-owner access enforcement via `AUTH_GITHUB_OWNER_ID` environment variable
- Logout button in the application nav bar, visible on every authenticated page
- E2E tests for authentication: unauthenticated redirects, route protection, logout flow
- Unit tests for the `signIn` callback (authorized owner, non-matching ID, wrong provider, missing env var)

### Changed
- Auth.js Credentials provider replaced with GitHub OAuth provider
- E2E test authentication now uses pre-generated Auth.js JWT session tokens (Playwright storage state) — no GitHub OAuth app required for testing
- Migrated Prisma to driver adapter pattern for PostgreSQL support
- Switched default database provider from SQLite to PostgreSQL

### Removed
- `bcryptjs` dependency removed
- `AUTH_USERNAME` and `AUTH_PASSWORD_HASH_B64` environment variables removed

## [0.1.0] - 2026-03-15

### Added
- Holdings registration and portfolio profile (full CRUD)
- Primary enrichment queue with Euronext and fund fetcher architecture (stubbed)
- AI secondary enrichment pipeline behind abstraction layer (stubbed)
- Spread analysis: stock/interest rate, sector, geographic
- Portfolio profile with manual field editing and refresh
- Auth.js credentials authentication
- Prisma schema with SQLite (local) / Postgres (production) support
- Seed data for development
- CI pipeline: typecheck, lint, build, unit tests, integration tests, E2E tests
- Initial repository setup with open-source infrastructure (MIT License, contributing guide, code of conduct, issue templates, PR template)
- GitHub Actions release workflow with divest-infra dispatch
- Dependabot for automated dependency updates

[Unreleased]: https://github.com/itinsecurity/Divest/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/itinsecurity/Divest/compare/v0.2.1...v1.0.0
[0.2.1]: https://github.com/itinsecurity/Divest/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/itinsecurity/Divest/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/itinsecurity/Divest/releases/tag/v0.1.0
