# Feature Specification: Enforce Authentication

**Feature Branch**: `002-enforce-auth`
**Created**: 2026-03-15
**Status**: Draft
**Input**: User description: "The first deployment (v0.1.0) went through, but turns out to have a glaring problem: The application launches straight into an unauthenticated interface. The application must have authentication. No advanced user management is required, this is a single user application. But ability to log in before seeing any data, having complete mediation in the app, is necessary. Also, a possibility to log out is wanted."

## Clarifications

### Session 2026-03-15

- Q: How should the application handle credential storage and comparison — plain-text env var or bcrypt hash in env var? → A: Use an OAuth provider; the application does not manage users or cryptography itself. Authentication is delegated entirely to a configured OAuth provider via Auth.js. The application only enforces that the authenticated identity matches the single authorized owner.
- Q: Which OAuth provider should be used? → A: GitHub OAuth.
- Q: Should session duration be set to a specific value rather than "standard web application defaults"? → A: Leave as standard defaults (Auth.js default).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Login to Access Application (Priority: P1)

The user opens the application and is immediately presented with a login page rather than any portfolio data. After authenticating via the configured OAuth provider and being recognized as the authorized owner, the user is granted access to the full application and sees the main dashboard.

**Why this priority**: This is the core requirement — no data must be visible without authentication. Every other user story depends on this gate being in place.

**Independent Test**: Can be fully tested by navigating to the app URL, verifying the login page is shown instead of data, completing the OAuth provider flow as the authorized owner, and confirming the dashboard loads.

**Acceptance Scenarios**:

1. **Given** a user visits the application URL without a session, **When** the page loads, **Then** the user sees only a login page with a provider sign-in option — no portfolio data, holdings, or application navigation is visible.
2. **Given** a user on the login page, **When** they complete the OAuth provider flow as the authorized owner, **Then** they are redirected to the main application and all features are accessible.
3. **Given** a user who successfully authenticates with the OAuth provider but is not the authorized owner, **When** the application validates their identity, **Then** they are denied access and returned to the login page with a clear access-denied message.
4. **Given** a user who has not logged in, **When** they attempt to navigate directly to any application URL, **Then** they are redirected to the login page.

---

### User Story 2 - Complete Route Mediation (Priority: P2)

Every page and route in the application is protected. There is no path a user can take — bookmarks, direct URL entry, back-button navigation — that reveals application data without an active, valid session.

**Why this priority**: Without complete mediation, a user could bypass the login screen by guessing or bookmarking a specific URL. This story ensures the protection is comprehensive, not just cosmetic.

**Independent Test**: Can be fully tested by attempting to access all known application routes (dashboard, holdings list, holding detail, profile) without a session and confirming all redirect to login.

**Acceptance Scenarios**:

1. **Given** no active session, **When** the user navigates directly to `/holdings`, `/profile`, or any other app route, **Then** they are redirected to the login page with no data exposed.
2. **Given** an active session that has expired, **When** the user attempts to interact with the application, **Then** they are redirected to the login page rather than seeing an error or stale data.

---

### User Story 3 - Logout (Priority: P3)

The user can end their session from within the application. After logging out, they are returned to the login page and the session is invalidated — navigating back or refreshing does not restore access.

**Why this priority**: Session termination is a basic security hygiene requirement and a user expectation. Lower priority than P1/P2 because the app is still secure without it (sessions expire), but it provides user control.

**Independent Test**: Can be fully tested by logging in, clicking logout, confirming redirection to login page, then using the browser back button to confirm the application data is no longer accessible.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they click the logout control, **Then** their session is terminated and they are redirected to the login page.
2. **Given** a user who has just logged out, **When** they press the browser back button or navigate directly to an app URL, **Then** they are redirected to the login page rather than seeing the previously accessed page.
3. **Given** an authenticated user, **When** they can see the application, **Then** a logout control is visible and accessible without requiring extra navigation steps.

---

### Edge Cases

- What happens if the user cancels the OAuth flow without completing it? They are returned to the login page with no session established and no data exposed.
- What happens if a user successfully authenticates with the provider but is not the authorized owner? They are denied access and shown a clear access-denied message; no application data is visible.
- What happens if a user's session expires mid-session while they are active? They should be redirected to the login page on the next request, not shown a confusing error.
- What happens if the OAuth provider configuration (client ID, client secret, authorized owner identifier) is missing or malformed at startup? The application should fail to start or clearly indicate the misconfiguration rather than launching in an open state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST redirect all unauthenticated requests to the login page, regardless of the requested URL.
- **FR-002**: System MUST present a login page with an OAuth provider sign-in option as the sole entry point for unauthenticated users. The application does not render a username/password form.
- **FR-003**: System MUST delegate authentication entirely to GitHub OAuth via Auth.js. The application does not manage passwords or cryptographic operations.
- **FR-003a**: System MUST enforce a single authorized owner by validating the GitHub-returned user ID against a configured owner GitHub user ID stored in environment configuration. Users who authenticate with GitHub but do not match the authorized user ID MUST be denied access.
- **FR-004**: System MUST establish a persistent session upon successful login so the user remains authenticated across page loads and navigation within the same browser session.
- **FR-005**: System MUST display a clear access-denied message when a user successfully completes the OAuth flow but is not the authorized owner, and return them to the login page without exposing any application data.
- **FR-006**: System MUST provide a logout control visible to authenticated users at all times without requiring additional navigation.
- **FR-007**: System MUST fully invalidate the session on logout, ensuring subsequent requests to protected routes require re-authentication.
- **FR-008**: System MUST protect all application routes — there must be no unprotected path that exposes portfolio data, holdings, or user-specific information.
- **FR-009**: System MUST redirect the user to the originally requested URL (or the default landing page if no specific URL was requested) after successful login.

### Key Entities

- **Session**: Represents an authenticated user's active access grant. Has a start time, expiry time, and identity token. Expires after a period of inactivity or on explicit logout.
- **Authorized Owner Identity**: The owner's GitHub user ID that the application recognizes as the sole authorized user. Stored in environment configuration, not in the database. The application compares the GitHub OAuth-returned user ID against this value to grant or deny access.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every application route returns a redirect to the login page for unauthenticated requests — 0 routes expose data without a valid session.
- **SC-002**: The user can complete the login flow (page load → credential entry → dashboard access) in under 30 seconds under normal conditions.
- **SC-003**: After logging out, navigating to any previously accessible URL does not display application data — session invalidation is complete and immediate.
- **SC-004**: The login page is the sole entry point for users without a session — no application data leaks through page titles, metadata, error messages, or partial renders.

## Assumptions

- The application has a single authorized user (the owner). No registration, invitation, or multi-user support is needed.
- Authentication is delegated to GitHub OAuth via Auth.js. The application does not store passwords or perform cryptographic credential checks.
- The authorized owner's GitHub user ID and the GitHub OAuth app credentials (client ID, client secret) are configured via environment variables and are not changeable from within the application UI.
- Session duration follows standard web application defaults (e.g., expires after a period of inactivity or when the browser is closed), unless the user explicitly logs out.
- The login page itself is publicly accessible (it must be, to show the sign-in option), but contains no application data.
- Auth.js is already part of the technology stack and will be used as the session management and OAuth integration mechanism (this is an existing dependency, not a new introduction).
