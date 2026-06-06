---
id: VARFIELD-02
title: Typing {{$node. triggers node reference autocomplete
severity: medium
source_files:
  - components/canvas/VarField.tsx
---

## What this tests
Inside a `{{ }}` expression block in a VarField, typing `$node.` followed by a partial node ID shows a dropdown of matching canvas nodes, each labeled with their node type.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- At least two non-input/output nodes exist on the canvas
- A node with a VarField that supports `{{ }}` syntax is present (e.g. Template String)

## Steps
1. Click into a VarField input
2. Type `{{$node.` — observe the suggestion dropdown
3. Type a few characters of a node ID — observe the list filters
4. Observe the label shown next to each suggestion

## Expected result
- Inside `{{ }}` block, `$node.` followed by a partial ID matches `PARTIAL_NODE_REF = /\{\{[^}]*\$node\.([A-Za-z0-9_-]*)$/`
- Dropdown appears showing node IDs that start with the typed partial
- Each suggestion row shows: `$node.` in sky-blue (`text-sky-400`), node ID in monospace, node type label in muted text on the right
- Active suggestion highlighted in sky (`bg-sky-600/25 text-sky-200`)
- Footer hint: "↑↓ · Enter insert · Esc dismiss"

## Failure indicators
- No dropdown appears after typing `{{$node.`
- Suggestions appear outside a `{{ }}` block (wrong trigger)
- Node type labels are absent from suggestion rows
- Filtering does not narrow the list as more characters are typed

## Severity rationale
Node reference autocomplete is the primary way to wire output from one node to another in template expressions; without it users must know exact node IDs.

## Source reference
`components/canvas/VarField.tsx` lines 12 — `PARTIAL_NODE_REF = /\{\{[^}]*\$node\.([A-Za-z0-9_-]*)$/`; lines 142–153 — `computeSuggestions()`: matches `PARTIAL_NODE_REF`, filters `workflowNodes` by `id.startsWith(partial)`, sets `suggestionMode="nodes"`; lines 336–357 — renders node suggestion buttons with `$node.` sky prefix and node label.
