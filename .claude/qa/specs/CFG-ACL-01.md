---
id: CFG-ACL-01
title: Access list entries load and display grouped by rule type
severity: medium
source_files:
  - components/workflow-config/AccessListTab.tsx
  - app/api/workflows/[slug]/access-list/route.ts
---

## What this tests
The Access List tab loads all entries from the API and renders them grouped by rule type (IP, CIDR, Header, Value) each with a colored type badge, with a search bar when entries exist.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Access List tab
- At least one access list entry exists of two or more different types

## Steps
1. Open the Access List config tab
2. Observe the entries section below the "Add Entry" form
3. Verify entries are grouped under colored type badges
4. Verify each group shows a count next to its badge

## Expected result
- Entries loaded via `GET /api/workflows/[slug]/access-list`
- Groups rendered in order: IP → CIDR → Header → Value (only non-empty groups shown)
- Each group header: colored `RuleTypeBadge` (`IP` violet, `CIDR` amber, `Header` emerald, `Value` sky) + entry count in muted text
- Each entry row: value in monospace, optional label in muted text, `Trash2` delete button
- A `Search` input appears when `entries.length > 0`, with placeholder `"Search N entries…"`
- Empty state: dashed box with `Shield` icon and "No entries yet"

## Failure indicators
- Entries do not load (blank list despite entries existing)
- Entries are not grouped (flat unsorted list)
- Type badges are missing or use incorrect colors
- Search bar is absent when entries exist
- Entry count next to group badge is missing

## Severity rationale
The access list is a security enforcement layer; if it cannot be viewed, admins cannot audit which values are allowed or blocked.

## Source reference
`components/workflow-config/AccessListTab.tsx` lines 17–22 — `RULE_TYPE_META` defines labels/colors for each type. Lines 73–83 — `grouped` memo groups filtered entries by type in order `["ip","cidr","header","value"]`. Lines 215–243 — renders grouped sections with `RuleTypeBadge`, count, and entry rows.
