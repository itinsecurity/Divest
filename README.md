# Divest

A personal investment portfolio tracker for Norwegian markets. Register holdings across brokerage accounts, enrich them with structured asset data automatically, and view your portfolio spread across stock/interest balance, sectors, and geography.

## Features

- **Holdings management** — add stocks and funds across named accounts (e.g. "Nordnet ASK", "DNB pensjonskonto"); edit amounts; track last-updated timestamps
- **Primary enrichment** — automatic background fetch from public sources (Euronext, Morningstar, company sites) using ISIN or ticker; shared profiles across holdings
- **AI secondary enrichment** — upload a PDF/image fund fact sheet when primary enrichment finds nothing; an AI agent extracts the data
- **Spread analysis** — stock/interest balance, sector breakdown, and geographic spread weighted by current NOK value; "Unclassified" bucket for holdings with missing data
- **Manual profile editing** — override any profile field; user-supplied fields are preserved across enrichment refreshes
- **Single-owner auth** — GitHub OAuth restricted to one numeric user ID; dev-mode credentials login for local work

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Database | PostgreSQL (prod) / SQLite (dev) via Prisma 7 |
| Styling | Tailwind CSS 4 |
| Charts | Recharts 3 |
| Auth | Auth.js v5 (GitHub OAuth + dev credentials) |
| Testing | Vitest + Testing Library (unit/integration), Playwright (E2E) |

## Prerequisites

- **Node.js 20+ LTS**
- **PostgreSQL** — or use SQLite for lightweight local dev (change `DATABASE_URL` in `.env.local`)
- **Git**

## Local Setup

```bash
# 1. Clone
git clone https://github.com/<your-username>/divest.git
cd divest

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local — see Environment Variables below

# 4. Set up database
npx prisma db push     # Apply schema
npx prisma db seed     # Optional: load sample data

# 5. Start dev server
npm run dev            # http://localhost:3000
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/divest"
# For SQLite: DATABASE_URL="file:./dev.db"

# Auth.js
AUTH_SECRET="run: openssl rand -base64 32"
AUTH_GITHUB_ID="your-github-oauth-app-client-id"
AUTH_GITHUB_SECRET="your-github-oauth-app-client-secret"
# Your numeric GitHub user ID — only this account can sign in:
# curl https://api.github.com/users/<username> | grep '"id"'
AUTH_GITHUB_OWNER_ID="your-numeric-github-user-id"
AUTH_TRUST_HOST="true"

# Dev-only credentials login (never set in production)
AUTH_USERNAME="admin"
AUTH_PASSWORD_HASH_B64=""   # base64(bcrypt(password)) — see .env.example

# AI enrichment provider
AI_PROVIDER="stub"          # "anthropic" | "openai" | "stub"
AI_API_KEY=""

NEXTAUTH_URL="http://localhost:3000"
```

## Commands

```bash
# Dev
npm run dev              # Start dev server
npm run build            # Production build
npm start                # Start production server

# Code quality
npm run lint             # ESLint
npm run typecheck        # TypeScript type-check (no emit)

# Tests
npm test                 # Unit tests (Vitest)
npm run test:watch       # Unit tests in watch mode
npm run test:integration # Integration tests (real SQLite)
npm run test:e2e         # E2E tests (Playwright)

# Database
npm run db:push          # Push Prisma schema to database
npm run db:seed          # Seed sample data
npm run db:studio        # Visual database browser
```

## Authentication Notes

- **Production**: Only one GitHub account is permitted — the numeric ID in `AUTH_GITHUB_OWNER_ID`. Any other account gets `AccessDenied`.
- **Development**: A username/password form is available at `/login` when `NODE_ENV=development` and the `AUTH_USERNAME` / `AUTH_PASSWORD_HASH_B64` variables are set.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to report bugs, request features, and submit pull requests.

## License

[MIT](LICENSE)
