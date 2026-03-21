# Quickstart: Fix Input Field Text Contrast

**Feature Branch**: `006-fix-input-contrast`

## What Changed

Global colour scheme fix to ensure all form inputs, selects, textareas, and text elements have sufficient contrast for readability. Removes an accidental dark mode media query from the Next.js starter template that caused light-gray text on white backgrounds when the user's OS was in dark mode.

## How to Verify

### 1. Quick Visual Check

```bash
npm run dev
```

1. Navigate to `/login` — type into username and password fields; text should be dark and clearly readable
2. Navigate to `/holdings` — click "Add Holding"; fill in all form fields; all typed text should be clearly visible
3. Click any holding → detail page; edit fields inline; text should be readable during editing
4. Check all pages: holdings list, holding detail, portfolio — no washed-out or hard-to-read text anywhere

### 2. Dark Mode System Setting Test

1. Set your OS to dark mode (Windows: Settings > Personalization > Colors > Dark)
2. Reload the application
3. Verify the application still renders with light backgrounds and dark text — no inversion, no invisible text

### 3. Browser Cross-Check

Verify the above in Chrome, Firefox, Safari (macOS), and Edge. All should render identically.

### 4. Build Verification

```bash
npm run build
```

Must complete without errors.

### 5. Tests

```bash
npm test
npm run test:e2e
```

All existing tests must pass. New regression tests should verify form input contrast.
