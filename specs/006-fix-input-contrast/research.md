# Research: Fix Input Field Text Contrast

**Feature Branch**: `006-fix-input-contrast`
**Date**: 2026-03-21

## Root Cause Analysis

### Finding: Dark Mode Media Query Conflicts with Hardcoded Light Backgrounds

The `globals.css` file contains a `@media (prefers-color-scheme: dark)` block inherited from the Next.js starter template:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}
```

When a user's OS is in dark mode, `--foreground` becomes `#ededed` (light gray). However, the application's component classes use hardcoded light-mode Tailwind colors throughout:

- `bg-white` and `bg-gray-50` for backgrounds
- No explicit text color classes on form inputs (they rely on `color: inherit` from Tailwind v4 preflight)

**Result**: Inputs inherit `#ededed` text color on `#ffffff` backgrounds — contrast ratio ~1.17:1 (effectively invisible).

### Tailwind v4 Preflight Behavior (Verified)

Tailwind v4's `preflight.css` (line 248) sets form elements to:

```css
button, input, select, optgroup, textarea, ::file-selector-button {
  color: inherit;
  background-color: transparent;
}
```

This means form inputs always inherit their text color from the DOM parent chain. Since no intermediate element sets an explicit color, inputs inherit `body`'s `color: var(--foreground)` — which is light gray in dark mode.

### Contrast Audit of Existing Text Colors

| Element | Color Class | Hex | On Background | Contrast Ratio | WCAG AA |
|---------|-------------|-----|---------------|----------------|---------|
| Body text (light) | `--foreground` | `#171717` | `#ffffff` | 17.9:1 | Pass |
| Body text (dark) | `--foreground` | `#ededed` | `#ffffff` | **1.17:1** | **FAIL** |
| Labels | `text-gray-700` | `#374151` | `#ffffff` | 9.1:1 | Pass |
| Headings | `text-gray-900` | `#111827` | `#ffffff` | 18.4:1 | Pass |
| Nav links | `text-gray-600` | `#4b5563` | `#ffffff` | 7.0:1 | Pass |
| Secondary text | `text-gray-500` | `#6b7280` | `#ffffff` | 4.6:1 | Pass |
| Select text | `text-gray-700` | `#374151` | `#ffffff` | 9.1:1 | Pass |
| Placeholder (preflight) | 50% of `currentcolor` | varies | `#ffffff` | varies | Depends |
| Inputs (no class) | inherited | `#171717` or `#ededed` | `#ffffff` | 17.9:1 or **1.17:1** | Conditional |

**Key finding**: All hardcoded Tailwind color classes pass WCAG AA. The only failure is the inherited `--foreground` variable in dark mode, which affects inputs, body text, and any element without an explicit text color class.

## Decisions

### Decision 1: Remove Dark Mode Media Query

**Decision**: Delete the `@media (prefers-color-scheme: dark)` block from `globals.css`.

**Rationale**: The application targets light mode only (spec assumption). The dark mode CSS variables were inherited from the Next.js starter template and conflict with the hardcoded light-mode component classes. Removing the media query eliminates the root cause.

**Alternatives considered**:
- Add `color-scheme: light` to `:root` — would tell browsers to use light theme but doesn't remove the conflicting CSS variables
- Add explicit `text-gray-900` to every form input — treats the symptom, not the cause; fragile against new inputs
- Implement full dark mode — out of scope, not requested, violates YAGNI

### Decision 2: Add Defensive Global Form Element Styles

**Decision**: Add explicit `color` and `background-color` styles for `input`, `select`, and `textarea` in `globals.css` as a defense-in-depth measure.

**Rationale**: Even after removing the dark mode query, form elements relying solely on CSS inheritance for their text color is fragile — any parent element that changes `color` could break input readability. An explicit global style ensures form elements always have readable text, regardless of the inheritance chain.

**Alternatives considered**:
- Add `text-foreground` or `text-gray-900` Tailwind classes to every input — scattered, error-prone, violates FR-002 (automatic inheritance)
- Use `@tailwindcss/forms` plugin — adds unnecessary dependency for what is a simple CSS rule; violates constitution II (no stack additions)

### Decision 3: Add `color-scheme: light` Declaration

**Decision**: Add `color-scheme: light` to the `:root` rule to tell browsers the application only supports light mode.

**Rationale**: This is the standard CSS mechanism to inform browsers that only a light color scheme is supported. It prevents browser-level dark mode adaptations (e.g., dark scrollbars, dark form control chrome) that could conflict with the app's light design.

### Decision 4: Audit and Fix Text Contrast Across All Components

**Decision**: Audit all text elements across all pages and ensure they use explicit, contrast-safe Tailwind color classes rather than relying on inheritance.

**Rationale**: The root cause (dark mode media query) broke inputs because they lacked explicit colors. An audit ensures all text elements are resilient to future CSS changes and meet WCAG AA requirements (FR-005, FR-006).

## Technology Notes

### Tailwind v4 `@theme inline` and CSS Variables

The project uses Tailwind v4's `@theme inline` directive to expose CSS variables as Tailwind theme values. The `--color-foreground` theme variable maps to `var(--foreground)`, making `text-foreground` available as a Tailwind utility class. After removing the dark mode query, `text-foreground` will reliably resolve to `#171717`.

### Placeholder Styling in Tailwind v4

Tailwind v4 preflight sets placeholder color to `color-mix(in oklab, currentcolor 50%, transparent)` — 50% opacity of the current text color. With `--foreground: #171717`, this produces a mid-gray that meets the 3:1 placeholder contrast requirement (FR-003). No additional placeholder styling is needed.
