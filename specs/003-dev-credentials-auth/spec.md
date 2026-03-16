# Feature Specification: Dev Credentials Authentication

**Feature Branch**: `003-dev-credentials-auth`
**Created**: 2026-03-16
**Status**: Draft
**Input**: User description: "Conditionally include a credentials provider for local development while keeping GitHub OAuth for production. Currently auth only configures GitHub OAuth, so local dev without GitHub credentials fails."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Local Dev Login (Priority: P1)

A developer clones the repo, runs `npm install` and `npm run dev`, and can sign in to the application using a username and password without needing to configure any external OAuth provider. The credentials provider is only available in development mode.

**Why this priority**: Without this, developers cannot use the application locally at all. The current GitHub OAuth-only setup requires external credentials that may not be available, blocking all local development and testing.

**Independent Test**: Start the dev server, navigate to the login page, enter the configured dev username and password, and verify access to the application.

**Acceptance Scenarios**:

1. **Given** the application is running in development mode with `AUTH_USERNAME` and `AUTH_PASSWORD_HASH_B64` set, **When** a developer visits the login page, **Then** a username/password form is displayed.
2. **Given** the login form is displayed, **When** the developer enters valid credentials, **Then** they are authenticated and redirected to the application.
3. **Given** the login form is displayed, **When** the developer enters invalid credentials, **Then** an error message is shown and access is denied.

---

### User Story 2 - Production GitHub OAuth (Priority: P1)

In production, the application authenticates users exclusively via GitHub OAuth, restricting access to a single authorized owner. The credentials provider is not available in production.

**Why this priority**: Equal priority to US1 — production authentication must remain secure and unchanged. GitHub OAuth with owner-ID gating is the production auth mechanism and must not be weakened.

**Independent Test**: Deploy the application in production mode and verify that only GitHub OAuth sign-in is available, and only the authorized GitHub user can access the application.

**Acceptance Scenarios**:

1. **Given** the application is running in production mode, **When** a user visits the login page, **Then** only the "Sign in with GitHub" button is displayed (no username/password form).
2. **Given** a user clicks "Sign in with GitHub" in production, **When** they authenticate with the authorized GitHub account, **Then** they are granted access.
3. **Given** a user clicks "Sign in with GitHub" in production, **When** they authenticate with an unauthorized GitHub account, **Then** access is denied with a clear message.

---

### User Story 3 - Seamless Environment Switching (Priority: P2)

The authentication mechanism switches automatically based on the runtime environment. Developers do not need to modify code or toggle feature flags to switch between dev and production auth modes.

**Why this priority**: Reduces friction and eliminates the risk of accidentally deploying with dev credentials enabled.

**Independent Test**: Verify that starting the app with `NODE_ENV=development` shows credentials login, and with `NODE_ENV=production` shows only GitHub OAuth, without any code changes.

**Acceptance Scenarios**:

1. **Given** the same codebase, **When** `NODE_ENV` is `development`, **Then** the credentials provider is available alongside or instead of GitHub OAuth.
2. **Given** the same codebase, **When** `NODE_ENV` is `production`, **Then** only GitHub OAuth is available.

---

### Edge Cases

- What happens when `AUTH_USERNAME` or `AUTH_PASSWORD_HASH_B64` is not set in development? The credentials provider should either be omitted gracefully or show a helpful error message.
- What happens if someone sets `NODE_ENV=development` in a production deployment? The credentials provider would become available — this is an operational concern, not an application concern. Documentation should warn against this.
- What happens when both GitHub OAuth credentials and dev credentials are configured in development? Both providers should be available, giving the developer choice.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST offer a credentials-based login (username/password) when running in development mode.
- **FR-002**: The system MUST offer only GitHub OAuth login when running in production mode.
- **FR-003**: The credentials provider MUST validate against environment-configured username and password hash values (`AUTH_USERNAME`, `AUTH_PASSWORD_HASH_B64`).
- **FR-004**: The login page MUST display the appropriate sign-in UI based on the current environment — a username/password form for development, a GitHub button for production.
- **FR-005**: The system MUST not expose the credentials provider in production under any circumstance controlled by the application.
- **FR-006**: The system MUST handle missing dev credential environment variables gracefully (omit the provider rather than crash).
- **FR-007**: Environment variable documentation (`.env.example`) MUST clearly document which variables are needed for each environment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can clone the repo, configure only `AUTH_USERNAME` and `AUTH_PASSWORD_HASH_B64`, and successfully log in within 2 minutes of starting the dev server.
- **SC-002**: In production mode, the credentials login form is never rendered and the credentials provider endpoint is not available.
- **SC-003**: Existing authentication tests continue to pass without modification, or are updated to cover the new dual-provider behavior.
- **SC-004**: Zero code changes are required to switch between development and production authentication — environment variables and `NODE_ENV` control behavior entirely.

## Assumptions

- `NODE_ENV` is the standard mechanism for distinguishing development from production. Next.js sets this automatically (`development` for `npm run dev`, `production` for `npm run build && npm start`).
- Password hashing uses bcrypt (consistent with the existing `AUTH_PASSWORD_HASH_B64` value format in `.env.local`).
- The single-user restriction in production (GitHub owner ID check) remains unchanged.
- Dev credentials auth does not need the same security hardening as production (e.g., rate limiting, account lockout) since it is only for local development.
