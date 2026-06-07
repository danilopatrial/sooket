# AGENTS.md

This file provides guidance on how to work with the Sooket repository.

## Project Overview

Sooket is a visual API middleware platform written in TypeScript. It lets users
build workflow pipelines on a React Flow canvas and expose them as API
endpoints. The stack is a Next.js 15 frontend with a local SQLite backend.
It is designed to run locally on the user's own server — no cloud deployment,
no authentication required.

## Git Commits

### Branch Policy

**All AI agent work happens on the `dev` branch.** The `main` branch is for
public access and must stay bug-free; it is **forbidden** for AI agents.

- Before modifying any file, verify you are on `dev` (`git branch --show-current`).
  If not, switch to it (`git checkout dev`) before making changes.
- Before committing, confirm again you are on `dev` — never commit to `main`.
- The only exception: when the user **explicitly** asks for a task related to
  `main`, you may operate on `main` for that task.

After completing any task that modifies files, commit the changes using this template:

```
<type>(<scope>): <short summary>

<body — what changed and why, omit if obvious>
```

**Types:** `feat` · `fix` · `refactor` · `test` · `chore` · `docs`

**Scope:** the area changed, e.g. `workflow-engine`, `anthropic-node`, `api`, `db`, `canvas`, `crypto`

**Rules:**
- Subject line ≤ 72 chars, imperative mood ("add", not "added")
- Body only when the why is non-obvious
- Stage specific files — never `git add -A` blindly
- Always run `npm run lint` before committing; fix any errors first

**Examples:**
```
feat(workflow-engine): add retry backoff for HTTP request node
fix(crypto): handle missing IV in legacy ciphertext format
refactor(canvas): extract edge insertion logic into helper
test(anthropic-node): cover streaming error path
```

## General Guidelines

- Always use npm (not pnpm or yarn)
- There is no authentication — local-only mode, all login/register pages redirect
  to `/workflow`
- Only one `anthropic` node is allowed per workflow (enforced in
  `WorkflowCanvas.tsx`)
- Setting `is_active=true` on a workflow deactivates all other workflows
  (enforced in the PATCH handler)
- This is NOT the Next.js you know — APIs, conventions, and file structure may
  differ from training data. Read the relevant guide in
  `node_modules/next/dist/docs/` before writing any code. Heed deprecation
  notices.

## Essential Commands

### Development

**Next.js frontend** (runs on `localhost:3000`):
```bash
npm run dev
```

**Standalone execution server** (optional, runs on `localhost:3001`):
```bash
npm run execution-server
```

The execution server (`server/`) runs the workflow engine in a separate Node.js process,
sharing the same SQLite file as Next.js (WAL mode allows concurrent access). Environment
variables: `EXECUTION_PORT` (default `3001`), `SOOKET_HOST` (default `127.0.0.1`),
`ENCRYPTION_SECRET`, `ENCRYPTION_SALT` (must match the Next.js process), `SOOKET_DATA_DIR`.

### Building
```bash
npm run build                                    # Next.js production build
```

### Testing
```bash
npm test                                         # Run all tests (vitest)
npm run test:watch                               # Watch mode
```

Tests live in `__tests__/`. Run a specific node test:
```bash
npm test -- AnthropicNode
```

### Code Quality
```bash
npm run lint                                     # ESLint
```

Always run lint before committing. Typecheck is part of `npm run build`.

## Architecture Overview

Single-process app: a Next.js frontend + local SQLite backend, running entirely
on the user's own machine or server.

### Data flow
1. Users build workflow pipelines on the React Flow canvas at `/workflow/[slug]`
2. Workflows are stored as JSON (`nodes`, `edges` arrays) in local SQLite
   (`data/sooket.db`)
3. Callers hit `POST /api/v1/chat` with an `sk-wf-*` API key
4. The route resolves the key → workflow → executes the node graph via
   `lib/workflow-engine.ts` → returns the result

### Next.js (`/app`)
- **Canvas**: `WorkflowCanvas.tsx` wraps React Flow. Nodes receive an
  `onChange` callback through their `data` prop so edits update React state
  without custom event systems.
- Route groups: `(main)` for the dashboard, `workflow/` for the canvas editor,
  `workflow-config/` for settings panels.

### Encryption
- `lib/crypto.ts` implements AES-GCM + PBKDF2 for storing provider keys and
  customer variables
- Key derivation: salt from `ENCRYPTION_SALT` (falls back to `"sooket-salt"` when
  unset/empty — set it to a deployment-unique value), 100,000 PBKDF2 iterations,
  SHA-256. The salt resolver `getEncryptionSalt()` lives in `lib/crypto.ts` and is
  reused by `lib/nodes/utils.ts` so encrypt and decrypt always agree
- Ciphertext format: 12-byte IV prepended to ciphertext, encoded as lowercase
  hex

## API Routes

| Route | Methods | Purpose |
|---|---|---|
| `/api/v1/chat` | POST, OPTIONS | Workflow execution (live API, CORS enabled); GET returns `{ ok, local }` health probe |
| `/api/webhooks/[slug]` | POST, GET, PUT, PATCH, OPTIONS | Webhook execution endpoint — token-gated, non-JSON bodies wrapped as `{ body }` |
| `/api/workflows` | POST | Create workflow (returns `{ slug }`) |
| `/api/workflows/[slug]` | PATCH, DELETE | Update name/nodes/edges/is_active; delete (active workflow cannot be deleted) |
| `/api/workflows/[slug]/debug` | POST | Sandbox test run — same as `/api/v1/chat` but for a specific slug, persists to logs |
| `/api/workflows/[slug]/logs` | GET | Last 20 request logs with per-node execution snapshots |
| `/api/workflows/[slug]/executions` | GET | Paginated execution history (default limit 50, max 200) |
| `/api/workflows/[slug]/versions` | GET, POST | List saved versions; POST `{ versionId }` restores a previous snapshot |
| `/api/workflows/[slug]/presets` | GET, POST | Saved sandbox test payloads |
| `/api/workflows/[slug]/presets/[id]` | DELETE | Remove a saved preset |
| `/api/workflows/[slug]/api-keys` | GET, POST | List/create per-workflow API keys (`sk-wf-*`, with scopes/rate-limit/expiry) |
| `/api/workflows/[slug]/api-keys/[id]` | PATCH, DELETE | Update or delete a specific API key (cannot delete the last active key) |
| `/api/workflows/[slug]/api-keys/[id]/stats` | GET | 30-day usage stats for a specific API key (zero-filled daily buckets) |
| `/api/workflows/[slug]/provider-keys` | POST, DELETE | Per-workflow encrypted provider keys |
| `/api/workflows/[slug]/access-list` | GET, POST, DELETE | Per-workflow IP/value allowlist/blocklist entries |
| `/api/workflows/[slug]/variables` | GET, POST, DELETE | Per-workflow customer variables (UPPER_SNAKE_CASE names, AES-encrypted values) |
| `/api/workflows/[slug]/credentials` | GET, POST, DELETE | Per-workflow credential assignments (node_id → credential) |
| `/api/provider-keys` | POST, DELETE | Global encrypted provider keys |
| `/api/credentials` | GET, POST, DELETE | Global named+typed encrypted credentials |
| `/api/variables` | GET, POST, DELETE | Global customer variables (UPPER_SNAKE_CASE names, AES-encrypted values) |
| `/api/account/api-key` | POST | Generate/retrieve the instance-level `sk-mw-*` management key |
| `/api/admin/backup` | GET | Download the SQLite database file (management-key gated via `Authorization: Bearer sk-mw-*`) |
| `/api/binary/[id]` | GET | Serve stored binary data by reference ID |
| `/api/health` | GET | Server health/uptime check (`{ status, uptime, timestamp }`) |
| `/api/complexity` | POST | Internal route used by the Complexity Score node canvas preview |

## Database

Local SQLite via Node.js built-in `node:sqlite`. File at `data/sooket.db`
(auto-created). Location overridable via `SOOKET_DATA_DIR` env var. The
singleton connection lives in `lib/db/index.ts`. Schema changes are applied as
ordered migrations: numbered files in `lib/db/migrations/` (e.g.
`012-workflow-webhook-token.ts`) run via `lib/db/run-migrations.ts` on startup,
with applied migrations tracked by name in the `schema_migrations` table. Add a
new numbered migration file rather than editing earlier ones or running raw
`ALTER TABLE` against the live DB.

| Table | Purpose |
|---|---|
| `workflows` | nodes/edges JSON, slug, api_key, is_active flag; also holds `webhook_token`, `pin_data`, `static_data`, `error_workflow_id` |
| `workflow_api_keys` | Per-workflow `sk-wf-*` keys with scopes, rate_limit_override, expires_at, is_active |
| `workflow_versions` | Workflow node/edge snapshots auto-saved on every PATCH (capped at 50 per workflow) |
| `executions` | Execution history with status, execution_data JSON, and timing fields |
| `credentials` | Global named+typed encrypted credentials (UNIQUE on name+type) |
| `workflow_credentials` | Per-workflow credential-to-node assignments (node_id → credential_id) |
| `provider_keys` | Global AES-encrypted provider API keys |
| `workflow_provider_keys` | Per-workflow AES-encrypted provider API keys |
| `customer_variables` | UPPER_SNAKE_CASE named encrypted values injected at runtime |
| `request_logs` | Per-request model/token/latency metrics; linked to `workflow_api_keys` via `api_key_id` |
| `node_execution_logs` | Per-node input/output snapshots for the Logs tab |
| `node_cache` | TTL-based key-value cache (Cache node) |
| `semantic_cache` | Embedding vectors + values for the Semantic Cache node |
| `rate_limit_counters` | Fixed-window (tumbling) counters for the Rate Limiter node |
| `workflow_access_lists` | Per-workflow allowlist/blocklist entries |
| `workflow_test_presets` | Saved sandbox JSON payloads (also stores `headers` and `query` fields) |
| `settings` | Instance-level key/value store (holds `api_key`) |
| `schema_migrations` | Tracks applied DB migrations by name (see `lib/db/migrations/`) |

## Workflow Engine

`lib/workflow-engine.ts` is the core execution layer. Entry point is
`executeWorkflow()`, which evaluates the node graph recursively via
`evaluateNode()` → `runNode()`. Results are memoised per `nodeId:sourceHandle`
cache key so each handle is computed at most once per request.

Node traces are accumulated in a `NodeTrace[]` array. When the same node is
evaluated for multiple connected output handles, the trace entries are
**merged** — a single row per node with outputs keyed by handle name.

## Node Development

### Catalogue

Nodes have two registries: canvas/UI metadata in
`components/canvas/nodes/registry.ts`, and execution logic in the
`NODE_EXECUTOR_REGISTRY` map in `lib/nodes/registry.ts`. Each node's executor is
an exported `execute()` from `lib/nodes/<node>.ts`; `runNode()` in
`lib/workflow-engine.ts` looks the executor up by node type + `typeVersion` and
calls it (there are no per-node `case` blocks). The registry is keyed by version
(`{ 1: executeV1, 2: executeV2 }`) so a node can ship breaking changes while
existing workflows stay pinned to their saved `typeVersion`. Canvas components
live in `components/canvas/nodes/`, execution logic in `lib/nodes/`.

**AI**: Token Counter, Complexity Score, Sentiment, Anthropic, Prompt Compression

**Request**: Output (exit point), Response Builder, List Manager, Access List,
Auth Validator

**External**: HTTP Request, Vector Upsert, Vector Search, Webhook, Sub-Workflow

**Format**: JSON Parser, JSON Builder, XML ↔ JSON, Template String

**Logic**: If, Try/Catch, Retry, Content Guardrail, Rate Limiter, Cache,
Semantic Cache, Router, A/B Split, Language Detect, Null Check, Merge, Custom
Code

**Transform**: Type Cast, Concat, Array Length, Pick, Date/Time, String Ops,
Regex Replace, Math, Size Of, PII Redact

**Static**: Boolean, Text, Number

### Node registry fields

Each node definition in `registry.ts` includes:
- `primaryInput` / `primaryOutput` — handle IDs used for auto-inserting a node
  into an existing edge on the canvas
- `getDynamicOutput` — used for nodes whose output handle ID depends on runtime
  data (Router, Language Detect, JSON Parser, A/B Split)
- `defaultData` — initial `data` shape for the canvas component; must match
  what the executor casts from `node.data`

### Adding a new node

1. Create `components/canvas/nodes/MyNode.tsx` (UI) and `lib/nodes/my-node.ts`
   (execution logic)
2. Register the canvas/UI metadata in `components/canvas/nodes/registry.ts`
3. Add the executor to `NODE_EXECUTOR_REGISTRY` in `lib/nodes/registry.ts`
   (e.g. `"my-node": { 1: myNode }`, importing the `execute` from
   `lib/nodes/my-node.ts`)
4. Add a test in `__tests__/nodes/MyNode.test.tsx`

## Lib Utilities

| File | Purpose |
|---|---|
| `lib/workflow-engine.ts` | Core graph execution (`executeWorkflow` → `runNode`); dispatches to node executors via `NODE_EXECUTOR_REGISTRY` |
| `lib/nodes/registry.ts` | `NODE_EXECUTOR_REGISTRY` — maps node type + `typeVersion` to its `execute()` |
| `lib/workflow-types.ts` | `WorkflowNode`, `WorkflowEdge`, `EvalResult`, `ReqContext` interfaces |
| `lib/node-trace.ts` | `NodeTrace` interface + `truncatePayload()` (4 KB cap) |
| `lib/crypto.ts` | AES-GCM encrypt/decrypt for provider keys and variables |
| `lib/sentiment.ts` | AFINN-based sentiment scoring (`analyzeSentiment`) |
| `lib/complexity/heuristics.ts` | Synchronous heuristic complexity scorer |
| `lib/complexity/embedder.ts` | `Xenova/all-MiniLM-L6-v2` semantic scorer (server-only) |
| `lib/complexity/blender.ts` | Blends heuristic (40%) + embedding (60%) scores |
| `lib/template-string.ts` | `{{slot}}` interpolation used by Template String node |
| `lib/xml-json.ts` | XML ↔ JSON conversion |
| `lib/pii/` | PII redaction library (pre-built, types in `.d.ts`) |
| `lib/db/index.ts` | SQLite singleton + schema init |
| `lib/variables-context.tsx` | React context for customer variables on the canvas |
| `lib/utils.ts` | Shared utilities |

## Testing Guidelines

- Tests use **Vitest** + **React Testing Library** + **jsdom**
- Config is in `vitest.config.ts`; setup file is `__tests__/setup.ts`
- The `server-only` module is stubbed globally for all tests so server imports
  don't throw in jsdom
- **Test canvas components** in `__tests__/nodes/`; mirror the filename
  (`AnthropicNode.test.tsx` for `AnthropicNode.tsx`)
- **Mock all external dependencies** — network calls, DB, crypto, heavy modules
- Run a single test file: `npm test -- <NodeName>`

## TypeScript Best Practices

- **NEVER use `any` type** — use proper types or `unknown`
- **Avoid `as` casts** unless in test code
- Shared workflow interfaces live in `lib/workflow-types.ts`; node-specific data
  interfaces belong in the node's own file
- The canvas `NodeDef.defaultData` field names and executor `node.data` casts
  are currently separate definitions — keep them in sync manually when editing
  a node

## Environment Variables

```
# .env.local (Next.js)
ENCRYPTION_SECRET            # AES key used to encrypt provider keys and variables
ENCRYPTION_SALT              # Optional PBKDF2 salt; defaults to "sooket-salt".
                             # Set to a deployment-unique value. Must stay stable
                             # for the life of the data — changing it makes
                             # existing ciphertext undecryptable.
SOOKET_DATA_DIR              # Optional override for SQLite data directory
```
