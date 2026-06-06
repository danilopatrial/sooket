---
id: DESIGN-01
title: Color palette consistent across all pages dark theme globally applied
severity: low
source_files:
  - app/layout.tsx
---

## What this tests
Verifies that the dark theme is applied globally to all pages via the `dark` class on the `<html>` element, and that background, foreground, and accent colors are consistent across the dashboard, canvas, config, and account pages.

## Prerequisites
- App is running at http://localhost:3000
- Browser with visual inspection capability

## Steps — dark theme applied globally

1. Open any page: `http://localhost:3000/workflow`
2. Open browser DevTools → Elements tab
3. Inspect the `<html>` element — verify it has the `dark` class applied (not dynamically toggled; hardcoded in `RootLayout`)
4. Verify there is no light/dark mode toggle in the UI — the app is always dark

## Steps — background color consistency

5. Navigate to the **workflow dashboard** (`/workflow`)
6. Note the page background color (should be very dark, near-black — `bg-background` using the dark theme token)
7. Navigate to a **canvas editor** (`/workflow/<slug>`)
8. Verify the background color is the same dark tone as the dashboard
9. Navigate to **Config** (`/workflow/<slug>/config`) and **Account** (`/account`)
10. Verify background color is consistent across all four pages

## Steps — text color consistency

11. On each page, verify body text uses the same foreground color (white/near-white against the dark background)
12. Muted text (secondary labels, hints) should use a consistent reduced-opacity white/gray

## Steps — font consistency

13. Verify all pages use **Geist Sans** for body/heading text and **Geist Mono** for code, node labels, and monospace values
14. Inspect DevTools → Computed styles on a paragraph element — font-family should include "Geist"

## Expected result
- `<html class="... dark ...">` is always present (dark theme hardcoded, no toggle)
- `bg-background` and `text-foreground` on `<body>` — consistent dark background and light text on every page
- No page deviates to a light background
- Font: Geist Sans for UI text, Geist Mono for code/labels

## Failure indicators
- Any page renders with a white background (dark class not applied)
- Inconsistent dark shades between pages (one is lighter or darker than others)
- Body font is a system fallback (Geist not loaded)
- Dark/light toggle exists and switching to light mode reveals unstyled content

## Severity rationale
Low: visual inconsistency degrades user experience but doesn't affect functionality.

## Source reference
`app/layout.tsx` line 25 (`className="... dark ..."` on `<html>` — hardcoded dark mode), line 27 (`bg-background text-foreground` on `<body>`), lines 6-13 (Geist Sans and Geist Mono loaded globally).

## Notes
The dark class is applied unconditionally — there is no `useTheme` toggle. Color tokens (`--background`, `--foreground`, etc.) are defined in `globals.css` using CSS custom properties. The `antialiased` class on `<html>` ensures consistent font rendering across platforms.
