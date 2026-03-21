# User Flow — Divest

## Entry point

Every route under the app (`/`, `/holdings`, `/portfolio`) is protected by the
`(app)` layout, which checks for a valid session on every request.
The root `/` immediately redirects to `/holdings`.

```
User visits divest.sonot.fun
            │
            ▼
           /  (root)
            │
            │  immediate redirect
            ▼
        /holdings ◄────────────────────────────────────────────────────┐
            │                                                           │
            │  (app)/layout.tsx checks session                         │
            ├─────────────────────────────────────────────────────┐    │
            │                                                     │    │
    session EXISTS                                        no session   │
            │                                                     │    │
            ▼                                                     ▼    │
  ╔═══════════════════╗                                   /login page  │
  ║  Holdings list    ║                                        │        │
  ║  /holdings        ║                                        │        │
  ╚═══════════════════╝                          ┌─────────────┴──────────────────┐
            │                                    │                                │
       nav links                        User clicks                       User already
            │                        "Sign in with GitHub"                authenticated
            ├──────────────────┐              │                                  │
            │                  │              ▼                    redirect("/") ─┘
            ▼                  ▼       GitHub OAuth flow                  (new auth check
     /portfolio          /holdings/[id]       │                            in login page)
  ╔══════════════╗    ╔══════════════════╗    │
  ║  Portfolio   ║    ║  Holding detail  ║    ├── Auth.js signIn callback
  ║  spread view ║    ║  + edit profile  ║    │        │
  ╚══════════════╝    ╚══════════════════╝    │   profile.id matches
                                              │   AUTH_GITHUB_OWNER_ID?
                                              │
                              ┌───────────────┴───────────────┐
                              │                               │
                             YES                              NO
                              │                               │
                   session created                    AccessDenied error
                   redirect to /                              │
                        │                                     ▼
                        │                              /login?error=AccessDenied
                        ▼                            (red "not authorized" message)
                   /holdings ◄──────────────────────────────────┐
                 (logged in)                                      │
                        │                                         │
                  user clicks                                     │
                  "Sign Out"                                      │
                        │                                         │
                        ▼                                         │
               session destroyed                                  │
               redirect to /login ────────────────────────────────┘
                                              (back to login page, clean state)
```

## Summary table

| Scenario | Lands on | Result |
|---|---|---|
| Unauthenticated visit to any app route | `/login` | Login page |
| Authenticated visit to `/login` | `/` → `/holdings` | Redirected away |
| GitHub OAuth — correct account | `/` → `/holdings` | Logged in |
| GitHub OAuth — wrong account | `/login?error=AccessDenied` | Error shown |
| Authenticated user clicks Sign Out | `/login` | Logged out |

## Notes

- **Only one GitHub account is permitted** — the numeric user ID set in
  `AUTH_GITHUB_OWNER_ID`. Any other GitHub account gets `AccessDenied`.
- **Dev-only credentials login** — a username/password form is shown on
  `/login` only when `NODE_ENV=development` and `AUTH_USERNAME` /
  `AUTH_PASSWORD_HASH_B64` are set. Not available in production.
- **Deep links** — e.g. visiting `/portfolio` while unauthenticated redirects
  to `/login`. After login, you land on `/holdings` (not the original URL).
