# Quickstart: Dev Credentials Authentication

**Branch**: `003-dev-credentials-auth` | **Date**: 2026-03-16

## What This Feature Does

Adds a username/password login for local development so developers can use the app without configuring GitHub OAuth. Production continues to use GitHub OAuth exclusively.

## Files to Modify

| File | Change |
|------|--------|
| `src/auth.ts` | Add credentials provider (dev only), update signIn callback |
| `src/app/(auth)/login/page.tsx` | Add credentials form for dev mode |
| `.env.example` | Document dev-only credential vars |
| `package.json` | Add `bcryptjs` dependency |

## Files to Create

| File | Purpose |
|------|---------|
| None | No new files needed — all changes fit in existing files |

## Tests to Write/Update

| File | Change |
|------|--------|
| `tests/unit/auth/auth.test.ts` | Add tests for credentials authorize logic and updated signIn callback |
| `tests/e2e/auth.spec.ts` | Add test for credentials login flow |

## Key Implementation Notes

1. **bcryptjs** (pure JS) over **bcrypt** (native) — avoids node-gyp build issues
2. `AUTH_PASSWORD_HASH_B64` is base64-encoded — decode before passing to bcrypt.compare
3. The login page needs the environment mode passed from a server component — `process.env.NODE_ENV` is not available client-side
4. The existing E2E global setup already generates JWT tokens directly — credentials E2E tests can use the same approach or test the actual form submission
5. No Prisma migration needed
