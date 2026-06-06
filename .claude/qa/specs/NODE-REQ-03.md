---
id: NODE-REQ-03
title: List Manager node add/remove access list entries at runtime
severity: medium
source_files:
  - components/canvas/nodes/ListManagerNode.tsx
  - lib/nodes/list-manager.ts
---

## What this tests
Verifies that the List Manager node adds or removes entries from the workflow's access list at execution time, supports an action toggle (Add/Remove) and an entry type selector (Value/IP/CIDR/Header), and emits pass-through, success, and error output handles.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a List Manager node exists on the canvas
- The Debug panel is accessible and the node's `value` input is connected

## Steps — canvas configuration

1. Navigate to the canvas containing a List Manager node
2. Observe the node header: title **List Manager**, subtitle **modify access list at runtime**, violet ListPlus icon; a badge on the right shows **ADD** (green) or **REMOVE** (rose) reflecting the current action
3. In the **Action** section, verify a two-segment toggle: **add** (highlights green when selected) and **remove** (highlights rose when selected)
4. Click **remove** — the header badge updates to **REMOVE** in rose
5. Click **add** to revert
6. In the **Entry Type** section, verify a four-column grid: **Value** (sky when active), **IP** (violet), **CIDR** (amber), **Header** (emerald)
7. Click each type in turn and confirm the selected segment highlights in its respective color
8. Confirm the node has two left-side input handles: **value** (amber dot) and **action** (white/30 dot)
9. Confirm three right-side output handles: **value** (amber, labeled "pass-through"), **success** (emerald, labeled "boolean"), **error** (rose, labeled "string")
10. Connect something to the **action** input handle — observe the label "overrides toggle" appears next to the action row label

## Steps — execution

11. Set action to **add**, entry type to **Value**, connect a text value (e.g. `"blocked-user"`) to the `value` input
12. Open the Debug panel and run a test request
13. Expand the List Manager trace row: `value` output is `"blocked-user"` (pass-through), `success` output is `true`, `error` output is `""` (empty string)
14. Set action to **remove** and re-run with the same value — verify the entry is removed; `success` is `true`
15. Connect the `action` handle to a text node supplying `"remove"` — verify this overrides the toggle (action toggle becomes irrelevant); `success` is `true`
16. Disconnect the `value` input and re-run — expect an error: **List Manager node has no value input connected**
17. Keep `value` connected but supply an empty string — `success` is `false`, `error` is `"value is empty"`

## Expected result
- Action toggle switches between **add** (green) and **remove** (rose); updates header badge immediately
- Entry type selector highlights the selected type in its color
- Connected `action` handle overrides the toggle and shows "overrides toggle" label
- `value` output: original input value (pass-through)
- `success` output: `true` on successful add/remove, `false` on failure
- `error` output: empty string on success, error message string on failure
- Entry type defaults to `value` if not set

## Failure indicators
- Action badge in header does not update when toggle is clicked
- Entry type highlighting is absent or uses the wrong color
- `success` output is not boolean
- `error` output is undefined rather than an empty string on success
- `action` handle connection does not override the node toggle
- Empty value input causes an unhandled exception instead of returning `success: false`

## Severity rationale
Incorrect add/remove behavior silently corrupts the access list, causing incorrect allow/block decisions for future requests in the same session.

## Source reference
`components/canvas/nodes/ListManagerNode.tsx` lines 8-9 (action/entryType types), lines 18-23 (ENTRY_TYPE_META colors), lines 89-94 (header badge), lines 103-121 (action toggle), lines 127-145 (entry type grid), lines 160-163 (action override label); `lib/nodes/list-manager.ts` lines 20-27 (action resolution), lines 33-46 (add/remove execution), lines 48-57 (per-handle output).

## Notes
The `action` handle accepts the strings `"add"` or `"remove"` (case-insensitive after `.toLowerCase()`). Any other string value on the `action` handle is ignored and the toggle value is used instead.
