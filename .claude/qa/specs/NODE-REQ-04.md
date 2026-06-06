---
id: NODE-REQ-04
title: Access List node enforces whitelist/blacklist with mode toggle
severity: high
source_files:
  - components/canvas/nodes/AccessListNode.tsx
  - lib/nodes/access-list.ts
---

## What this tests
Verifies that the Access List node checks its input value against the workflow's stored access list, routes traffic via `pass`/`block`/`match` handles, and correctly inverts logic when switching between whitelist and blacklist modes.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with an Access List node exists on the canvas
- The workflow has at least one access list entry configured (e.g. via the CFG-ACL tab or a List Manager node upstream)
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing an Access List node
2. Observe the node header: title **Access List**, subtitle **filter by stored values**, amber Shield icon; a badge on the right shows **ALLOW** (green) in whitelist mode or **DENY** (rose) in blacklist mode
3. In the **Mode** section, verify a two-segment toggle: **whitelist** (highlights green) and **blacklist** (highlights rose)
4. With **whitelist** selected, observe the output row descriptions: **pass** shows "in list", **block** shows "not in list"
5. Click **blacklist** — badge updates to **DENY** (rose); **pass** now shows "not in list", **block** now shows "in list"
6. Click **whitelist** to revert
7. Confirm one left-side input handle: **value** (amber dot)
8. Confirm three right-side output handles: **pass** (emerald), **block** (rose), **match** (sky)

## Steps — execution (whitelist mode)

9. Ensure the access list contains the entry `"allowed-value"`; set node mode to **whitelist**
10. Open the Debug panel; connect the `value` input to a text source; send a request with input `"allowed-value"`
11. Expand the Access List trace row:
    - `pass` handle: active, value = `"allowed-value"` (original input value)
    - `block` handle: `active: false`
    - `match` handle: `true`
12. Send a request with input `"unknown-value"` (not in the list):
    - `pass` handle: `active: false`
    - `block` handle: active, value = `"unknown-value"`
    - `match` handle: `false`

## Steps — execution (blacklist mode)

13. Switch node to **blacklist** mode
14. Send a request with input `"allowed-value"` (which IS in the list):
    - `pass` handle: `active: false` (blacklist: in list → blocked)
    - `block` handle: active, value = `"allowed-value"`
    - `match` handle: `true`
15. Send a request with input `"unknown-value"`:
    - `pass` handle: active, value = `"unknown-value"` (blacklist: not in list → passes)
    - `block` handle: `active: false`
    - `match` handle: `false`
16. Disconnect the `input` handle and re-run — expect error: **Access List node has no input connected**

## Expected result
- Mode toggle updates header badge: whitelist → **ALLOW** (green), blacklist → **DENY** (rose)
- Output row descriptions update dynamically with mode
- Whitelist: `pass` when value is in list; `block` when not in list
- Blacklist: `pass` when value is NOT in list; `block` when value is in list
- `match` always returns boolean (true if value is in list regardless of mode)
- `pass` and `block` pass the **original input value** through when active; return `active: false` when inactive
- Comparison is case-insensitive (both input and list values are lowercased before comparison)

## Failure indicators
- Mode badge does not update when toggle is clicked
- `pass` and `block` output row descriptions do not change with mode
- `match` returns a non-boolean value
- Only one of `pass`/`block` never fires (both always `active: false`)
- Case-sensitive match causes misses for entries that differ only in case
- Input disconnected does not throw the expected error

## Severity rationale
Access control bypass (value incorrectly passing through the `pass` handle) is a security issue; incorrect blocking disrupts legitimate traffic.

## Source reference
`components/canvas/nodes/AccessListNode.tsx` lines 8 (AccessListMode type), lines 68-73 (header badge), lines 83-99 (mode toggle), lines 113-124 (pass/block descriptions by mode); `lib/nodes/access-list.ts` lines 13-14 (case-insensitive comparison), lines 18-26 (pass/block/match result construction), lines 32-34 (per-handle routing).

## Notes
The access list used for comparison (`ctx.getAccessList()`) reflects the workflow's stored access list entries — the same set managed via the CFG-ACL tab and modified at runtime by the List Manager node. Entries added by a List Manager node earlier in the same request are visible to a downstream Access List node within that request.
