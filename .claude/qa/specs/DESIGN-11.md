---
id: DESIGN-11
title: Badge colors consistent active default inactive gray expired red
severity: low
source_files:
  - components/workflow/WorkflowList.tsx
  - components/workflow-config/ApiKeysTab.tsx
  - components/ui/badge.tsx
---

## What this tests
Verifies that status badges use a consistent color scheme: active workflows use the default (primary) badge, inactive workflows use the secondary (gray) badge, and expired API keys use the destructive (red) styling.

## Steps — workflow active/inactive badges on dashboard

1. Navigate to the workflow dashboard (`/workflow`)
2. Locate a workflow with `is_active = 1` — it shows a **Active** badge
3. Verify the badge uses `variant="default"` styling (primary background, primary-foreground text)
4. Locate a workflow with `is_active = 0` — it shows an **Inactive** badge
5. Verify the badge uses `variant="secondary"` styling (muted/gray background, secondary-foreground text)
6. Confirm the two badge styles are visually distinct

## Steps — expired API key badge

7. Navigate to Config → API Keys tab
8. Locate a key with an expiry date in the past — it shows an **Expired** label
9. Verify the expired label uses destructive (red) colors: `bg-destructive/15 text-destructive border-destructive/30`
10. Verify a non-expired active key does NOT show the Expired label

## Steps — disabled API key appearance

11. Disable an API key via the toggle — verify the key label shows `line-through` (strikethrough) with muted text color
12. This is distinct from the Expired badge — disabled keys show strikethrough text, expired keys show the red Expired badge; a key can be both disabled and expired

## Steps — node mode badges

13. On the canvas, inspect the Action badge on a List Manager node (add = green emerald, remove = rose):
    - `isAdd ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"`
14. Inspect the Access List mode badge (allow = green, deny = rose):
    - `isWhitelist ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"`
15. These node-level badges use explicit Tailwind colors, not the Badge component variants

## Expected result
- Workflow Active: `variant="default"` badge (primary background)
- Workflow Inactive: `variant="secondary"` badge (gray/muted background)
- Expired API key: custom `bg-destructive/15 text-destructive` label (red)
- Disabled key: strikethrough label, no badge
- Node action badges: emerald for affirmative (add/allow), rose for negative (remove/deny)

## Failure indicators
- Active and Inactive badges look the same (no visual distinction)
- Expired label is green or gray instead of red
- A non-expired key shows the Expired label

## Severity rationale
Low: badge color inconsistency reduces scanability but doesn't affect functionality.

## Source reference
`components/workflow/WorkflowList.tsx` line 80 (`variant={isActive ? "default" : "secondary"}`); `components/workflow-config/ApiKeysTab.tsx` lines 298-302 (Expired badge: `bg-destructive/15 text-destructive`), line 294 (disabled: `line-through`); `components/ui/badge.tsx` (variant definitions).
