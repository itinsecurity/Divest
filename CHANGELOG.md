# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/itinsecurity/Divest/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/itinsecurity/Divest/releases/tag/v0.1.0
