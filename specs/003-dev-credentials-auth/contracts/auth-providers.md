# Contract: Auth Provider Selection

**Branch**: `003-dev-credentials-auth` | **Date**: 2026-03-16

## Provider Availability by Environment

| Environment | Credentials Provider | GitHub OAuth Provider |
|-------------|---------------------|-----------------------|
| `development` (`npm run dev`) | Available (if `AUTH_USERNAME` + `AUTH_PASSWORD_HASH_B64` set) | Available (if `AUTH_GITHUB_ID` + `AUTH_GITHUB_SECRET` + `AUTH_GITHUB_OWNER_ID` set) |
| `production` (`npm run build && npm start`) | Never available | Required |
| `test` (vitest/playwright) | Available | Available (mocked via JWT injection) |

## Credentials Authorize Endpoint

**Path**: `/api/auth/callback/credentials` (handled by Auth.js internally)

**Input** (POST form data):
```
username: string
password: string
```

**Output**:
- Success: JWT session cookie set, redirect to `/`
- Failure: Redirect to `/login?error=CredentialsSignin`

## Login Page Behavior

| Environment | UI Rendered |
|-------------|-------------|
| `development` | Username/password form (credentials form may also show GitHub button if GitHub vars are set) |
| `production` | "Sign in with GitHub" button only |

## signIn Callback Rules

| Provider | Environment | Condition | Result |
|----------|-------------|-----------|--------|
| `credentials` | `development` | Valid username + password | Allow |
| `credentials` | `production` | Any | Deny |
| `github` | Any | `profile.id === AUTH_GITHUB_OWNER_ID` | Allow |
| `github` | Any | `profile.id !== AUTH_GITHUB_OWNER_ID` | Deny |
