# Data Model: Enforce Authentication (002-enforce-auth)

## Database Changes

**None.** This feature introduces no new Prisma models or migrations. Authentication is entirely handled via:
- GitHub OAuth (delegated to provider)
- Auth.js JWT session cookies (stateless, no server-side session table)
- Environment configuration (owner identity stored outside the database)

---

## Logical Entities

These entities exist at runtime but have no database representation.

### Session

Represents an active authenticated user's access grant.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `sub` | `string` | GitHub OAuth `profile.id` | Numeric GitHub user ID, stored as string |
| `name` | `string \| null` | GitHub OAuth `profile.name` | Display name shown in nav header |
| `email` | `string \| null` | GitHub OAuth `profile.email` | Not used by application logic |
| `iat` | `number` | Auth.js | Issued-at timestamp (Unix seconds) |
| `exp` | `number` | Auth.js | Expiry timestamp (Unix seconds); Auth.js default applies |

Persisted as a signed JWT in the `authjs.session-token` httpOnly cookie. Validated by Auth.js middleware on every request.

### Authorized Owner Identity

Represents the single authorized user. Not a runtime object — resolved at startup from environment.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `AUTH_GITHUB_OWNER_ID` | `string` | Environment variable | GitHub numeric user ID; compared against `profile.id` in `signIn` callback |

---

## Environment Configuration Contract

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | ✅ | Random secret used to sign session JWTs. Min 32 chars. |
| `AUTH_GITHUB_ID` | ✅ | GitHub OAuth App client ID |
| `AUTH_GITHUB_SECRET` | ✅ | GitHub OAuth App client secret |
| `AUTH_GITHUB_OWNER_ID` | ✅ | GitHub numeric user ID of the authorized owner |
| `NEXTAUTH_URL` | ✅ (prod) | Canonical application URL; required for OAuth callback in production |

**Removed variables** (from previous Credentials provider):
- `AUTH_USERNAME` — no longer needed
- `AUTH_PASSWORD_HASH_B64` — no longer needed

---

## State Transitions

```
Unauthenticated
    │
    ▼  visits any app route
Redirected to /login (middleware)
    │
    ▼  clicks "Sign in with GitHub"
GitHub OAuth flow (external)
    │
    ├─► GitHub user ID ≠ AUTH_GITHUB_OWNER_ID
    │       │
    │       ▼  signIn callback returns false
    │   /login?error=AccessDenied  ──► Unauthenticated
    │
    └─► GitHub user ID = AUTH_GITHUB_OWNER_ID
            │
            ▼  signIn callback returns true
        Session created (JWT cookie set)
            │
            ▼
        Authenticated ──► redirected to originally requested URL
            │
            │  session expires OR user clicks logout
            ▼
        Unauthenticated
```
