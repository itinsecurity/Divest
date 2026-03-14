# Quickstart: Holdings Registration and Portfolio Profile

**Feature Branch**: `001-holdings-portfolio`
**Date**: 2026-03-13

---

## Prerequisites

- Node.js 20+ LTS
- Docker (for local PostgreSQL) or SQLite for lightweight dev
- Git

## Setup

```bash
# Clone and switch to feature branch
git clone <repo-url> && cd divest
git checkout 001-holdings-portfolio

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your values (see Environment Variables below)

# Set up database
npx prisma generate
npx prisma db push        # Apply schema to local database
npx prisma db seed         # Optional: seed with sample data

# Run development server
npm run dev
```

## Environment Variables

```bash
# Database
DATABASE_URL="file:./dev.db"                    # SQLite for local dev
# DATABASE_URL="postgresql://user:pass@localhost:5432/divest"  # Postgres

# Auth (required — constitution Principle III)
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_USERNAME="your-username"
AUTH_PASSWORD_HASH="bcrypt-hash-of-your-password"

# AI Provider (required for secondary enrichment)
AI_PROVIDER="anthropic"                         # or "openai", etc.
AI_API_KEY="your-api-key"

# Optional
NODE_ENV="development"
```

## Key Commands

```bash
# Development
npm run dev                    # Start dev server (http://localhost:3000)
npm run build                  # Production build
npm start                      # Start production server

# Database
npx prisma studio             # Visual database browser
npx prisma db push             # Push schema changes to database
npx prisma generate            # Regenerate Prisma client

# Testing (TDD workflow)
npm run test                   # Run all Vitest tests
npm run test:watch             # Watch mode (primary TDD loop)
npm run test:integration       # Integration tests with real SQLite
npm run test:e2e               # Playwright E2E tests

# Code quality
npm run lint                   # ESLint
npm run typecheck              # TypeScript type checking
```

## Architecture Overview

```
User adds holding → Server action saves to DB → Fire-and-forget enrichment trigger
                                                      │
                                    ┌─────────────────┴─────────────────┐
                                    │                                   │
                              Primary enrichment               User uploads document
                           (Euronext, fund companies)           (PDF, image, etc.)
                                    │                                   │
                                    └─────────┬─────────────────────────┘
                                              │
                                    AssetProfile updated
                                    EnrichmentStatus set
                                              │
                                    Spread analysis views
                                    (stock/interest, sector, geographic)
```

## Testing Strategy

**TDD is mandatory** (constitution Principle IV). For every piece of implementation:

1. Write the test first (red)
2. Implement the minimum code to pass (green)
3. Refactor while keeping tests green

```bash
# Start the TDD loop
npm run test:watch

# Tests auto-re-run on file save
# Financial calculation tests: tests/unit/spread/
# Server action tests: tests/integration/actions/
# E2E user flows: tests/e2e/
```

## User Flows

### 1. Register a Holding
- Navigate to `/holdings`
- Click "Add Holding"
- Enter instrument identifier, type, account, and amount
- Holding appears immediately; enrichment runs in background

### 2. View Enrichment Results
- Holding status badge updates: pending → complete/partial/not found
- Click holding to see linked asset profile with populated fields

### 3. Upload Document (Secondary Enrichment)
- If enrichment returns "partial" or "not found", system prompts for document upload
- Upload a PDF/image (e.g., Morningstar fund profile)
- AI extracts profile data; status updates when complete

### 4. View Portfolio Spread
- Navigate to `/portfolio`
- See stock/interest balance, sector spread, geographic spread
- Filter by account to focus on specific positions
- "Unclassified" bucket shows holdings with missing data

### 5. Edit Profile / Refresh
- Click any profile field to edit manually (marked as "user-supplied")
- Click "Refresh" to re-run enrichment (user-supplied fields preserved)
