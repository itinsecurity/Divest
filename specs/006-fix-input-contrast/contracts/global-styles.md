# Contract: Global Styles — Form Element & Text Contrast

**Type**: CSS / UI Contract
**Date**: 2026-03-21

## Global CSS Rules (globals.css)

The following rules MUST be present in `src/app/globals.css` and MUST NOT be overridden by component-level styles unless a specific, justified exception is documented:

### 1. Light Mode Only

```css
:root {
  color-scheme: light;
  --background: #ffffff;
  --foreground: #171717;
}
```

No `@media (prefers-color-scheme: dark)` block. The application is light-mode only.

### 2. Form Element Base Styles

```css
input,
select,
textarea {
  color: var(--foreground);
  background-color: #ffffff;
}
```

All form elements MUST have explicit `color` and `background-color` — they MUST NOT rely solely on CSS inheritance.

### 3. Body Base

```css
body {
  background: var(--background);
  color: var(--foreground);
}
```

## Contrast Requirements (WCAG AA)

| Element Type | Minimum Contrast Ratio | Against |
|-------------|----------------------|---------|
| Normal text (body, labels, inputs) | 4.5:1 | Element background |
| Large text (headings >= 18px bold or 24px) | 3:1 | Element background |
| Placeholder text | 3:1 | Input background |
| Button text | 4.5:1 | Button background |
| Interactive states (hover, focus) | 4.5:1 | Element background |

## Tailwind Color Palette — Approved Usage

| Use Case | Approved Classes | Hex | Contrast on White |
|----------|-----------------|-----|-------------------|
| Primary text | `text-gray-900` | `#111827` | 18.4:1 |
| Input/body text | `text-foreground` or inherited `--foreground` | `#171717` | 17.9:1 |
| Labels, secondary text | `text-gray-700` | `#374151` | 9.1:1 |
| Navigation links | `text-gray-600` | `#4b5563` | 7.0:1 |
| Tertiary/caption text | `text-gray-500` | `#6b7280` | 4.6:1 |
| Placeholder text | Tailwind preflight 50% mix | ~`#8b8b8b` | ~3.5:1 |

**Do NOT use** `text-gray-400` or lighter for any readable text — contrast ratio drops below 3:1.
