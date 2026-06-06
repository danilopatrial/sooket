---
id: CFG-ACL-07
title: Search and filter access list entries by value or label
severity: low
source_files:
  - components/workflow-config/AccessListTab.tsx
---

## What this tests
When entries exist, a search input appears above the list; typing filters entries across value, label, and rule_type fields (case-insensitive); non-matching groups are hidden.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Access List tab
- At least 3 entries exist across multiple types

## Steps
1. Observe the search bar appears above the entry list (with `Search` icon and placeholder "Search N entries…")
2. Type a partial value string (e.g. `192` to match IP entries)
3. Observe the list filters to show only matching entries; non-matching groups are hidden
4. Clear the search input — verify all entries reappear
5. Type a label string — verify entries matching the label are shown

## Expected result
- Search input is visible when `entries.length > 0`
- Filter is case-insensitive and matches against `entry.value`, `entry.label`, and `entry.rule_type`
- Groups with zero matching entries are hidden entirely
- Empty search query (`""`) shows all entries (no filter applied)
- When filtered results are empty: "No entries match '[query]'" message appears
- Search is client-side only (no API call on keystroke)

## Failure indicators
- Search input is absent when entries exist
- Typing in the search does not filter the list
- Groups with no matching entries remain visible (empty sections)
- The "No entries match" message does not appear when nothing matches

## Severity rationale
Search is a convenience feature for large access lists; its absence forces manual scanning, but does not break core functionality.

## Source reference
`components/workflow-config/AccessListTab.tsx` lines 62–71 — `filtered` memo: when `search.trim()` is empty returns `entries`; otherwise filters by `value`, `label`, `rule_type` case-insensitively. Lines 73–83 — `grouped` memo filters out groups with zero items. Lines 191–201 — search input shown only when `entries.length > 0`. Line 212–213 — "No entries match" message when `filtered.length === 0`.
