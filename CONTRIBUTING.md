# Contributing to Sooket

Thank you for considering a contribution. This guide covers how to run the project locally, the node contribution pattern, and the code conventions we enforce.

---

## Contributor License Agreement (CLA)

Before your first contribution can be merged, you'll be asked to sign the [Sooket CLA](CLA.md). When you open a pull request, an automated bot (CLA Assistant) checks whether you've signed; if not, it posts a comment with a one-click way to sign right in the PR. Merging is blocked until that's done.

Why we ask: Sooket is [source-available under FSL-1.1-MIT](LICENSE.md), and we may later offer commercial or hosted versions. The CLA grants us the rights needed to include your contribution in those offerings (and to relicense it, e.g. to MIT as the FSL provides). It does **not** take away your own rights to your code — you keep full ownership and can use your contribution however you like.

---

## Running the project locally

**Requirements:** Node.js 22+ (uses the built-in `node:sqlite` API).

```bash
git clone https://github.com/your-org/sooket.git
cd sooket
npm run setup      # handles the sharp/Node 26 binary issue automatically
cp .env.example .env.local          # or create .env.local manually
# Set ENCRYPTION_SECRET=<random-32+-char-string> in .env.local
npm run dev                          # http://localhost:3000
```

> **Why `npm run setup` instead of plain `npm install`?**
> `@huggingface/transformers` depends on `sharp`, which has no prebuilt binary for Node 26+ yet. `npm run setup` installs with `--ignore-scripts` (skipping the failing native build) then runs `npm rebuild --ignore-scripts sharp` so every other native package (onnxruntime-node, etc.) gets its binary normally. On Node 22, a plain `npm install` also works.

### Running tests

```bash
npm test                # run all tests once
npm run test:watch      # interactive watch mode
npm test -- AnthropicNode   # run a single test file by name
```

### Lint

```bash
npm run lint
```

Always run lint before opening a PR. TypeScript type-checking is part of `npm run build`.

---

## Adding a new node

Nodes have two halves: an **execution layer** (server-only) and a **canvas component** (client UI).

### 1. Execution logic — `lib/nodes/my-node.ts`

```typescript
import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";

class MyNode implements INodeExecutor {
  async execute(node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext): Promise<EvalResult> {
    const inputSrc = ctx.inputFor(null);
    if (!inputSrc) throw new Error("MyNode has no input connected");
    const input = await ctx.evalInput(inputSrc);
    // ... transform input.value ...
    return { value: result, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new MyNode();
```

Register it in `lib/nodes/registry.ts`:

```typescript
import { execute as myNode } from "./my-node";
// ...
"my-node": { 1: myNode },
```

### 2. Canvas component — `components/canvas/nodes/MyNode.tsx`

- Use `"use client"` at the top.
- Accept `{ data, selected }: NodeProps` (from `@xyflow/react`).
- Call `data.onChange?.(patch)` to update fields.
- Use `Handle` components for inputs/outputs.
- Export as `memo(MyNodeComponent)`.

### 3. Canvas registry — `components/canvas/nodes/registry.ts`

Add a `NodeDef` entry:

```typescript
{
  type: "my-node",
  component: MyNode,
  label: "My Node",
  sub: "Short description",
  color: "bg-sky-500",
  icon: SomeLucideIcon,
  category: "logic",   // ai | request | external | format | logic | transform | static
  defaultData: { myField: "" },
  primaryInput: "input",    // handle ID used for auto-insertion; null if source-only
  primaryOutput: "output",  // handle ID; null if multiple outputs
},
```

### 4. Write a test — `__tests__/nodes/MyNode.test.tsx`

Mock all external dependencies (network, DB, crypto). See existing tests for patterns.

---

## Code conventions

- **No `any` type.** Use `unknown` and narrow with type guards.
- **No `as` casts in production code.** Casts are allowed in test files only.
- **No comments that restate the code.** Only add a comment when the *why* is non-obvious.
- **Node data interfaces** — define a `MyNodeData` interface in the canvas component file and keep the executor cast consistent with it.
- **Shared workflow types** live in `lib/workflow-types.ts`. Node-specific data interfaces belong in the node's own file.
- Keep `lib/workflow-engine.ts` and `lib/nodes/registry.ts` in sync when adding a node.

---

## Security note — Custom Code node

The Custom Code node executes arbitrary JavaScript on the server with full Node.js privileges. **The Sooket UI must be network-restricted (firewall, VPN, or localhost-only binding) before exposing it to untrusted users.** See `README.md` for guidance.

---

## Pull request checklist

- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` compiles cleanly
- [ ] `npm test` passes for affected node tests
- [ ] New node has a corresponding test in `__tests__/nodes/`
- [ ] No `any` types introduced
- [ ] `defaultData` in registry matches the executor's data cast
