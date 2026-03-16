# Data Model: Dev Credentials Authentication

**Branch**: `003-dev-credentials-auth` | **Date**: 2026-03-16

## Overview

This feature does not introduce new database entities. Authentication credentials are environment-based (single-user, no user table needed).

## Configuration Entities (Environment Variables)

### Dev Credentials Config

| Variable | Purpose | Required In |
|----------|---------|-------------|
| `AUTH_USERNAME` | Dev login username | Development only |
| `AUTH_PASSWORD_HASH_B64` | Base64-encoded bcrypt hash of dev password | Development only |
| `AUTH_SECRET` | JWT signing secret | All environments |

### Production Auth Config

| Variable | Purpose | Required In |
|----------|---------|-------------|
| `AUTH_GITHUB_ID` | GitHub OAuth App client ID | Production only |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App client secret | Production only |
| `AUTH_GITHUB_OWNER_ID` | Numeric GitHub user ID for access control | Production only |
| `AUTH_SECRET` | JWT signing secret | All environments |
| `AUTH_TRUST_HOST` | Trust proxy host header | Production (behind proxy) |

## State Transitions

```
Unauthenticated → Login Page → [Dev: credentials form / Prod: GitHub OAuth] → JWT issued → Authenticated
Authenticated → Sign Out → JWT cleared → Unauthenticated
```

## No Schema Changes

No Prisma migration required. The existing schema (`AssetProfile`, `Holding`) is unaffected.
