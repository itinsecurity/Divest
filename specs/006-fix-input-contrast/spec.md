# Feature Specification: Fix Input Field Text Contrast

**Feature Branch**: `006-fix-input-contrast`
**Created**: 2026-03-21
**Status**: Draft
**Input**: User description: "User reports issues with colours. On the holdings page and 'Add holding' form, input fields are a light grey colour on white background, practically making text invisible. Review the colour scheme to fix this and to check that other functions don't have similar issues."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Application-Wide Colour Scheme for Form Elements (Priority: P1)

The application defines a consistent colour scheme for all form elements (inputs, selects, textareas) at the global level. Any page that renders a form element automatically inherits readable text colours without needing per-element or per-page colour overrides. A user typing into any form field anywhere in the application sees dark, clearly readable text against the field background.

**Why this priority**: The reported issue (invisible input text) stems from the absence of a global colour definition for form elements. Fixing this at the application level resolves the problem everywhere at once and prevents recurrence as new pages are added.

**Independent Test**: Can be verified by navigating to any page with form fields (holdings, holding detail, login) and confirming that text typed into inputs is clearly readable — without any page-specific styling having been applied.

**Acceptance Scenarios**:

1. **Given** the application defines a global colour scheme for form elements, **When** a user types into any input field on any page, **Then** the entered text appears in a dark colour with sufficient contrast against the field background.
2. **Given** the application defines a global colour scheme for form elements, **When** a new page with form fields is added in the future, **Then** those fields automatically inherit readable text colours without additional styling.
3. **Given** the global colour scheme is in place, **When** a user selects an option from any dropdown on any page, **Then** the selected text is clearly readable.

---

### User Story 2 - Consistent Contrast Across All UI Text (Priority: P2)

All text elements across the application — labels, headings, body text, table content, navigation links, and button text — maintain sufficient contrast ratios for comfortable reading. The colour scheme ensures consistency through global definitions rather than per-component overrides.

**Why this priority**: The input field issue may indicate a broader colour scheme gap. An audit ensures all text elements meet contrast standards and that the global scheme covers all element types.

**Independent Test**: Can be verified by navigating through all pages (login, holdings list, holding detail, portfolio) and confirming no text elements appear washed out or hard to read.

**Acceptance Scenarios**:

1. **Given** the application's global colour scheme, **When** a user views any page, **Then** all labels, headings, body text, and table content are clearly readable against their backgrounds.
2. **Given** the application's global colour scheme, **When** a user interacts with any button or link, **Then** the text maintains sufficient contrast in normal, hover, and focus states.

---

### Edge Cases

- What happens when a user views the application on different browsers (Chrome, Firefox, Safari, Edge)? The global colour scheme must produce consistent results across all major browsers.
- How do placeholder texts appear in empty input fields? Placeholders should be visually distinct (lighter) from entered text but still readable.
- What happens with disabled input fields? Disabled fields should be visually distinguishable but their content should still be readable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST define a global colour scheme for form elements (inputs, selects, textareas) that ensures user-entered text has a minimum contrast ratio of 4.5:1 against the field background (WCAG AA standard for normal text).
- **FR-002**: The global colour scheme MUST be inherited automatically by all current and future pages — no per-page or per-component colour overrides should be required for baseline readability.
- **FR-003**: Placeholder text in form fields MUST be visually distinguishable from entered text while remaining readable (minimum 3:1 contrast ratio).
- **FR-004**: All form field labels MUST maintain a minimum contrast ratio of 4.5:1 against their background.
- **FR-005**: All heading, body, navigation, and table text MUST maintain a minimum contrast ratio of 4.5:1 against their respective backgrounds.
- **FR-006**: Button text MUST maintain a minimum contrast ratio of 4.5:1 against the button background in normal, hover, and focus states.
- **FR-007**: The colour scheme MUST produce consistent results across Chrome, Firefox, Safari, and Edge.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All user-entered text in form fields is readable at a glance across every page — no user reports of "invisible" or "hard to read" text.
- **SC-002**: Every text element across all application pages meets WCAG AA contrast requirements (4.5:1 for normal text, 3:1 for large text).
- **SC-003**: Users can complete the "Add holding" workflow without struggling to read any form field content.
- **SC-004**: Adding a new page with standard form elements requires zero additional colour styling to achieve readable text.
- **SC-005**: No visual regressions are introduced — existing readable text elements remain unaffected.

## Assumptions

- The root cause is that form input/select elements lack a global text colour definition, causing them to inherit or default to a light gray that lacks contrast against white backgrounds.
- The fix should be applied at the global/application level (e.g., base stylesheet or theme) rather than as per-element overrides scattered across individual pages.
- The application currently targets light mode only (no dark mode support required for this fix).
- WCAG AA (4.5:1 contrast ratio) is the appropriate accessibility target for this application.
