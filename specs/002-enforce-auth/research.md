# Research: Enforce Authentication (002-enforce-auth)

## 1. Auth.js v5 GitHub Provider Configuration

**Decision**: Import `GitHub` from `next-auth/providers/github`. No explicit constructor arguments required — Auth.js v5 auto-reads `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` from the environment.

**Implementation**:
```typescript
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt" },
  providers: [GitHub],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "github") {
        return String(profile?.id) === process.env.AUTH_GITHUB_OWNER_ID;
      }
      return false;
    },
  },
});
```

**Rationale**: Single-provider config; owner restriction enforced at `signIn` callback before session is created. When the callback returns `false`, Auth.js redirects to `/api/auth/error?error=AccessDenied`, which maps to the custom error page (`pages.error: "/login"`), presenting the error query param to the login page.

**Alternatives considered**:
- `authorized` callback in middleware: Fires after session creation, not before — would briefly create a session for unauthorized users then destroy it. Less correct.
- Separate middleware check: Would require duplicating the owner ID check. Single location in `auth.ts` is canonical.

---

## 2. Owner Identity Restriction

**Decision**: Compare `String(profile?.id)` (GitHub's numeric user ID) against `process.env.AUTH_GITHUB_OWNER_ID`.

**Rationale**: GitHub user IDs are stable and immutable. Username and email can change. Numeric ID is the authoritative identity anchor.

**Environment variable**: `AUTH_GITHUB_OWNER_ID` — obtain from `https://api.github.com/users/<username>` (`id` field) or `https://github.com/<username>.json`.

**Error flow**: `signIn` returning `false` → Auth.js redirects to `pages.error` → login page receives `?error=AccessDenied` → login page renders access-denied message.

---

## 3. E2E Testing Without Real OAuth

**Decision**: Generate a valid Auth.js v5 JWT session token in `global-setup.ts` using `@auth/core/jwt` `encode`, write it to `tests/e2e/.auth/user.json` as a Playwright storage state file, and load it via `storageState` in Playwright config.

**Implementation sketch**:
```typescript
// global-setup.ts (addition)
import { encode } from "@auth/core/jwt";

const sessionToken = await encode({
  salt: "authjs.session-token",
  secret: process.env.AUTH_SECRET ?? "e2e-test-secret-32-chars-minimum!!",
  token: {
    name: "E2E Test Owner",
    sub: process.env.AUTH_GITHUB_OWNER_ID ?? "99999999",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  },
});

// Write Playwright storage state
await fs.writeFile(
  "tests/e2e/.auth/user.json",
  JSON.stringify({
    cookies: [{
      name: "authjs.session-token",
      value: sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    }],
    origins: [],
  })
);
```

**Playwright config change**: Add a `storageState` project dependency pattern — authenticated tests use the generated state; unauthenticated tests get a clean context.

**Rationale**: No production code changes needed. The JWT is cryptographically valid (signed with `AUTH_SECRET`), so Auth.js accepts it as a real session. This is the Playwright-recommended approach for OAuth providers.

**Alternative considered**: Test-only API endpoint to create sessions — rejected (adds test-specific code to production bundle, violates Simplicity principle).

---

## 4. Login Page UX

**Decision**: Replace the username/password form with a single "Sign in with GitHub" button that calls `signIn("github")` from `next-auth/react` with no `redirect: false` override — let Auth.js handle the redirect chain.

**Access-denied state**: The login page reads the `?error` query param (from the URL when Auth.js redirects back after `signIn` returns `false`) and displays a "Access denied" message when `error === "AccessDenied"`.

**Rationale**: Simplest correct UI. No form state needed. The OAuth redirect is fully managed by Auth.js + GitHub.

---

## 5. `AuthProvider` Interface Update

**Decision**: Update `src/lib/auth/types.ts` — remove `credentials` parameter from `signIn` signature, as OAuth providers initiate via redirect rather than credential submission.

**Updated interface**:
```typescript
export interface AuthProvider {
  getSession(): Promise<{ user: { id: string; name?: string | null } } | null>;
  signIn(provider?: string): Promise<void>;
  signOut(): Promise<void>;
}
```

---

## 6. Dependency Changes

**Removed**:
- `bcryptjs` (runtime dependency) — no longer performing password hashing
- `@types/bcryptjs` (dev dependency)

**Added**: None — `next-auth` already bundles `@auth/core` (which provides GitHub provider and JWT encode/decode).
