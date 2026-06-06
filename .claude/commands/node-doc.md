Generate documentation for the `$ARGUMENTS` node.

Before writing a single word of documentation, read these files:
- Find the node component in `components/canvas/nodes/` (match by name — e.g. "Router" → `RouterNode.tsx`)
- Read it completely — derive the Data interface, every handle (id, position, color), every configurable field, and all internal logic
- Read `components/canvas/nodes/registry.ts` — get the node type string, label, defaultData, and subtitle
- Search `lib/workflow-engine.ts` for the matching `case "<type>":` block and read the full execution logic
- If the node has supporting lib files (e.g. `lib/complexity/`), read those too

Then create `docs/nodes/<NodeName>.md` with exactly this structure:

---

# <Label> Node

> <One-sentence description of what this node does in a workflow>

---

## What it does

Two to four sentences explaining the node's purpose, when you'd use it, and how it fits into a workflow. Be concrete — describe the transformation or decision it performs, not just its name.

---

## Inputs & outputs

| Handle | Direction | Color | Description |
|--------|-----------|-------|-------------|
| `<id>` | Input / Output | color name | What value this carries and when it's active |

List every handle. For output handles that can be inactive (e.g. routing nodes), note the condition under which they fire.

---

## Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `<field>` | string / number / boolean / select | `<default>` | What it controls |

If the node has no configuration fields (only handles), write: *This node has no configuration fields.*

---

## Under the hood

Brief sentence explaining what the snippet shows.

```typescript
// Paste the relevant case block from lib/workflow-engine.ts verbatim.
// If the node has no engine entry (UI-only), paste the core logic from the component instead.
```

---

## Example use case

A concrete, named example: describe a realistic workflow (2–4 sentences) where this node solves a real problem. Name the nodes before and after it.

---

## Gotchas & edge cases

Bullet list. Include:
- Any short-circuit or early-return conditions
- What happens when an optional input is not connected
- Fallback behavior (defaults, pass-throughs)
- Any one-per-workflow constraints
- Known limitations or surprising behaviors derived from the source

---

Write the file to `docs/nodes/<NodeName>.md`. Create the `docs/nodes/` directory if it doesn't exist. Do not add anything beyond this structure.
