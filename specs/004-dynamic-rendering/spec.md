# Feature Specification: Force Dynamic Page Rendering

**Feature Branch**: `004-dynamic-rendering`
**Created**: 2026-03-19
**Status**: Draft
**Input**: User description: "The app is failing build because a page is built before the database is available. Instead of reverting to a less secure database setup, the decision is to make sure the pages of this app are built dynamically on load, not statically during deployment."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Successful Deployment Without Database at Build Time (Priority: P1)

As the application owner, I want the application to build and deploy successfully even when no database is available during the build step, so that I can deploy to any environment without exposing database credentials or connections at build time.

**Why this priority**: This is the core problem — the application currently fails to build in deployment environments where the database is not yet available. Without this fix, the app cannot be deployed at all.

**Independent Test**: Can be fully tested by running the build process without any database connection configured and verifying it completes successfully.

**Acceptance Scenarios**:

1. **Given** the application is being built with no database connection available, **When** the build process runs, **Then** the build completes successfully without errors.
2. **Given** the application has been built without a database, **When** a user navigates to any page at runtime, **Then** the page loads correctly by fetching data from the database at request time.
3. **Given** the application is deployed and running with a database connection, **When** a user visits the holdings page, **Then** holdings data is fetched and displayed on each request (not served from a static build cache).

---

### User Story 2 - All Authenticated Pages Render Fresh Data (Priority: P2)

As a user viewing my portfolio or holdings, I want every page load to show the most current data from the database, so that I never see stale information from a cached static render.

**Why this priority**: Even if the build succeeds, pages that are statically rendered at build time would serve stale data. Since this is a financial data application, data freshness is critical.

**Independent Test**: Can be fully tested by modifying a holding in the database and immediately refreshing the page to confirm the updated data appears.

**Acceptance Scenarios**:

1. **Given** a holding has just been updated, **When** the user refreshes the holdings list page, **Then** the updated holding data is displayed immediately.
2. **Given** a new holding has been added, **When** the user navigates to the portfolio page, **Then** the spread analysis reflects the new holding without requiring a rebuild or redeployment.

---

### Edge Cases

- What happens if the database becomes temporarily unavailable at runtime? Pages should display appropriate error states rather than crashing, consistent with existing error handling behavior.
- What happens to the root redirect page (which does not access the database)? It should continue to work as before — a simple redirect does not require dynamic rendering but must not break during build.
- What happens to the login page? Authentication pages that do not access the database directly should continue to build and function normally.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All pages that access the database MUST be rendered dynamically at request time, not statically at build time.
- **FR-002**: The application MUST build successfully without any database connection available during the build step.
- **FR-003**: Pages that do not access the database (e.g., the root redirect page, the login page) MUST continue to function correctly and MAY remain statically rendered.
- **FR-004**: The existing data-fetching behavior on each page MUST be preserved — the same data that was fetched before MUST still be fetched, just at request time instead of build time.
- **FR-005**: The application's security posture MUST NOT be weakened — no database credentials or connections should be required or exposed at build time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The build process completes successfully with zero database-related errors when no database connection is configured at build time.
- **SC-002**: All existing pages load correctly at runtime and display current data from the database on every request.
- **SC-003**: All existing tests continue to pass after the change.
- **SC-004**: It has been verified that no pages that access the database are statically generated during the build process.

## Assumptions

- The database is never available at build time.
- The existing error handling in pages (e.g., displaying "Failed to load holdings" messages) is sufficient for runtime database errors.
- A small increase in request latency from dynamic rendering is acceptable given the single-user nature of the application.
- Pages behind the authenticated layout (`(app)` route group) are the primary targets, as they are the ones accessing the database.
