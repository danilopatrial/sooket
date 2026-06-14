# TODO — Senior Middleware Engineer's Review

> Context: I've built and run API middleware/gateways for ~20 years (think the
> lineage of nginx+Lua, Kong, Apigee, Tyk, and a lot of bespoke proxies). I
> picked up Sooket because the visual canvas is genuinely a faster way to wire
> up the boring 80% of integration glue. This document is my honest first-pass
> assessment after reading the engine, the execution path, the node library, and
> the crypto/auth layers. **Nothing here is implemented yet — it's a punch list
> and a set of open questions.**
>
> Verdict up front: the codebase is clean, the node-versioning design is smart,
> and the trace/merge model is better than I expected. But as a *middleware
> platform* it has a few sharp edges that would stop me putting it on a real
> traffic path without changes. The biggest ones are: no overall execution
> deadline, API keys stored in plaintext, an unsafe Custom Code "sandbox", no
> streaming, and a single-process architecture that can't scale horizontally.

---

## 1. Flaws & bugs (things I'd consider blockers or near-blockers)

### 1.1 No overall workflow execution timeout — a single slow workflow can wedge the instance — ✅ DONE (2026-06-11)
Implemented: a wall-clock execution deadline (`EXECUTION_TIMEOUT_MS`, default 30 s,
checked at every node boundary, terminal, inherited by sub-workflows → HTTP 504)
and a queue-wait timeout in `ExecutionSemaphore` (`EXECUTION_QUEUE_TIMEOUT_MS`,
default 10 s → the existing 503). Covered by unit tests + QA specs ENGINE-09/10.

`executeWorkflow()` in `lib/workflow-engine.ts` has **no wall-clock deadline**.
Individual nodes have their own timeouts (HTTP node 10s default, Custom Code 5s),
but a workflow chaining 20 HTTP calls, or a Retry node with exponential backoff
(`lib/nodes/retry.ts` can legitimately sleep up to `maxDelayMs` per attempt × 10
attempts), can run for minutes. Meanwhile it holds one of only 10 semaphore slots
(`lib/concurrency.ts`). Ten slow callers and the whole instance returns 503 to
everyone else. There is no per-execution timeout, no cancellation propagation
from the client disconnecting, and the queued requests (`maxQueue=50`) wait
**indefinitely** — `ExecutionSemaphore.acquire()` never times out. This is the
classic head-of-line-blocking failure mode every gateway has to solve. Needs a
hard execution budget + queue-wait timeout.

### 1.2 API keys are stored in plaintext in SQLite — ✅ DONE (2026-06-11, sk-wf keys)
Implemented: `sk-wf-*` keys are now stored only as a SHA-256 hash (`key_hash`,
the new lookup column) plus a non-secret `key_prefix` display hint; the raw key
is shown once at creation and is unrecoverable after. Migration 014 renames
`key` → `key_hash`, hashes existing values, and hashes the vestigial
`workflows.api_key` mirror in place. Auth looks up by hash. Helper in
`lib/security/api-keys.ts`. Covered by unit + migration + route tests and QA
spec SEC-11. **Still open:** the `sk-mw-*` management key in `settings` (it has
retrieve-after-create semantics — needs a UX change before it can be hashed).

`workflow_api_keys.key` holds the raw `sk-wf-*` string and lookup is
`WHERE k.key = ?` (`lib/execution-handler.ts:69`). The management key `sk-mw-*`
lives plaintext in the `settings` table. There's no hashing (SHA-256/argon at
rest) and no peppering. Combine that with `/api/admin/backup` which **streams the
entire SQLite file** to anyone holding the management key, and a single DB leak =
every workflow key, every API consumer compromised. Industry table stakes: store
a hash, look up by hash, show the raw key exactly once at creation. (The repo's
own memory notes a prior secret-leak incident — this is the same class of risk
sitting in the data model.)

### 1.3 Custom Code node is not a real sandbox — ✅ DONE (2026-06-11, hardened; not a hard isolate)
Implemented defense-in-depth: the `node:vm` context is now null-prototype with
**no host primordials/functions injected**, `input` is JSON-cloned into the
context, `console` is a context-local no-op, and host `setTimeout`/`clearTimeout`
are removed. This closes the trivial one-liner escape
(`input.constructor.constructor("return process")()` — verified to return the
host `process` before, blocked after) and the deferred-timer-callback hazard.
Async still works via the `Promise` intrinsic. **Not** a guaranteed boundary (a
V8 bug could still escape), so the canvas keeps the "full server access" warning
and workflow-edit stays privileged. A real isolate (`isolated-vm`/subprocess) was
deliberately NOT added — native deps are fragile in this npm-distributed package
(see the sharp/libvips npx issue). Covered by unit tests + QA specs SEC-05/SEC-12.

`lib/nodes/custom-code.ts` runs user code in `node:vm`. Node's own docs are
explicit that `vm` is **not** a security boundary — escaping to the host is a
one-liner via `this.constructor.constructor("return process")()` reachable
through the `Object`/`Function` constructors that are handed into the sandbox.
The 5s timeout only bounds *synchronous* runaway; it does nothing for the escape.
On a loopback-only single-user box this is "you're scripting your own server,
fine." But the product ships a shared-secret multi-caller mode
(`SOOKET_AUTH_TOKEN`) and webhooks — under that model, anyone who can edit a
workflow gets RCE on the host. Either drop the pretense (document it as "runs
with full host privileges, treat workflow-edit as shell access") or move to a
real isolate (`isolated-vm`, a subprocess with seccomp, or a WASM runtime).

### 1.4 Webhook token comparison is not constant-time — ✅ DONE (2026-06-11)
Implemented: the webhook route now compares the token with `safeEqual()`
(constant-time `timingSafeEqual`) instead of `!==`, matching the management
surface. Covered by unit tests (same-length wrong/correct token) + QA spec
WEBHOOK-04 (updated).

`app/api/webhooks/[slug]/route.ts` compares `provided !== workflowRow.webhook_token`
with a plain `!==`. The management surface correctly uses `safeEqual()`
(per AGENTS.md), but the webhook path doesn't — it's timing-attackable. Small,
but it's a one-line fix and an obvious inconsistency.

### 1.5 SSRF: the HTTP Request node has no egress controls — ✅ DONE (2026-06-11)
Implemented `lib/security/ssrf.ts` (`assertEgressAllowed`): requires http/https,
blocks private/reserved/loopback/link-local IPs (v4+v6, incl. cloud metadata and
IPv4-mapped) via `net.BlockList`, resolves hostnames and rejects if any address
is private (catches DNS-based SSRF), fails closed on resolution failure. Wired
into the HTTP Request node and the Webhook (action) node before `fetch`. Secure
by default; opt out per-deployment with `SOOKET_ALLOW_PRIVATE_EGRESS`. Covered by
unit tests (41) + node tests + QA spec SEC-14; env var documented in AGENTS.md.
**Residual:** not a perfect DNS-rebinding defense (TOCTOU between check and
connect, since `fetch` can't pin to the validated IP) — noted in the spec.

`lib/nodes/http-request.ts` will `fetch` any URL the workflow author (or an
interpolated `{{ }}` value / upstream node output) produces — including
`http://169.254.169.254/…` cloud metadata, `http://localhost:…` admin ports, and
internal RFC1918 services. There's no allowlist/denylist, no DNS-rebinding guard,
no protocol restriction. The per-workflow access-list feature gates *inbound*
callers, not *outbound* targets. For a tool whose whole job is making outbound
calls, this is the SSRF surface I'd worry about most, especially when URLs can
come from request bodies.

### 1.6 PBKDF2 is both too weak and re-derived on every call — ✅ DONE (2026-06-11)
Implemented: `deriveKey` is now memoised per (iterations, salt, secret), so the
hot path no longer pays `N_vars × PBKDF2` per request — one derivation per
process eliminates the latency tax and CPU-DoS amplifier. Iterations raised
100k → **600k** (OWASP 2023) for new data; `decrypt` falls back to 100k so
existing ciphertext still reads (no format change, no data loss). `decryptValue`
now delegates to `crypto.decrypt` (dedup + inherits the cache/fallback). Covered
by unit tests + QA specs SEC-01 (updated) and SEC-13 (upgrade safety).

`lib/crypto.ts` uses PBKDF2-SHA256 at **100,000 iterations**. OWASP's current
guidance is ~600k+ for PBKDF2-SHA256; 100k is a 2015 number. Worse, `deriveKey()`
runs the full 100k iterations on **every** encrypt and decrypt — and
`loadCustomerVars()` in the engine decrypts *all* customer variables in parallel
on *every request*, each one re-deriving the key. So per request you pay
`N_vars × 100k` PBKDF2 iterations just to read variables. That's both a latency
tax on the hot path and a CPU-DoS amplifier. Derive once and cache the
`CryptoKey` per secret; bump iterations.

### 1.7 Rate limiting is fixed-window (documented burst hole) and split-brained — ✅ DONE (2026-06-11)
Implemented a shared sliding-window-counter helper (`lib/rate-limit.ts`,
`consumeSlidingWindow`) that weights the previous window by its remaining
overlap, closing the ~2× boundary burst. Both the Rate Limiter node and the
per-API-key limiter now use it (split-brain unified). Added a `getRateLimitCount`
read primitive to the adapter/NodeContext; eviction retains the previous window;
blocked requests don't increment. Covered by a pure-helper unit suite (boundary
closure, recovery, key isolation) + node + handler tests; QA specs NODE-LOGIC-10
(updated), API-08 (updated), NODE-LOGIC-10b (new). Note: sliding-window *counter*
(approximation), not a per-request log — the standard production trade-off.

Both the per-key limiter (`lib/execution-handler.ts`, 1-minute fixed window) and
the Rate Limiter node (`lib/nodes/rate-limiter.ts`) use tumbling fixed windows.
The node's own comment admits a burst straddling a boundary passes ~2× the limit.
For a feature literally called "rate limiter" I'd expect at least a sliding-window
or token-bucket option. They're also two independent implementations of the same
concept that don't share counters or semantics.

### 1.8 No graceful handling of SQLite write contention — ✅ DONE (2026-06-11)
Implemented `applyConnectionPragmas()` in `lib/db/index.ts`, applied on every
connection open: sets `busy_timeout` (SQLite's native retry/backoff — a contended
write now waits instead of throwing `SQLITE_BUSY` immediately; default 5000 ms,
`SOOKET_BUSY_TIMEOUT_MS`) and re-asserts `journal_mode = WAL` + `foreign_keys`.
Per-connection settings, so applied on open rather than via a one-time migration;
covers both the Next.js process and the execution server sharing the file.
Covered by unit tests (resolver + pragma application) and a real two-connection
contention test proving the wait; QA spec EDGE-10; env documented in AGENTS.md.
Note: `node:sqlite` is synchronous so the wait blocks that connection's call —
busy_timeout (native, efficient) is the right tool; an app-level synchronous
retry would busy-spin the event loop, so it was deliberately not added.

Everything funnels through one `DatabaseSync` connection (`lib/db/index.ts`).
WAL lets readers run concurrently, but writers still serialize and can throw
`SQLITE_BUSY` under concurrent execution logging / counter updates. I see no
retry/backoff around writes. Under the 10-way concurrency the semaphore allows,
plus the execution server sharing the same file, this will surface as
intermittent 500s that are hard to reproduce.

---

## 2. Missing features (things I expected from "API middleware" and didn't find)

### 2.1 Streaming responses (SSE / chunked)
The Anthropic node (`lib/nodes/anthropic.ts`) does a **blocking** `fetch` and
returns the whole completion; `max_tokens` is hard-coded to 8192. The execution
handler serializes one final JSON body. There is no SSE/streaming path end to
end. For an LLM-in-the-loop middleware in 2026 this is the single most-missed
feature — every consumer wants token streaming, and right now a long completion
means the client sits on an open connection with zero bytes until it's done
(holding a semaphore slot the whole time — see 1.1).

### 2.2 Idempotency keys — ✅ DONE (2026-06-11)
Implemented opt-in `Idempotency-Key` support on `POST /api/v1/chat`: the first
request's response is stored and replayed (`Idempotency-Replayed: true`) for any
retry with the same key, scoped per API key. Reuse with a different body → 422,
in-progress duplicate → 409 (UNIQUE-insert concurrency guard), key > 255 chars →
400; 5xx outcomes are not cached (retry re-executes); records expire after a TTL
(`SOOKET_IDEMPOTENCY_TTL_MS`, default 24h). New `idempotency_keys` table
(migration 015), helper `lib/idempotency.ts`, wired into the shared execution
handler so the chat route + execution server both get it. Covered by unit tests
(store primitives) + handler integration tests; QA spec API-14; docs in AGENTS.md.

No `Idempotency-Key` support on `POST /api/v1/chat`. Any serious API platform
needs safe retries for non-idempotent pipelines (one that charges a card, sends
an email, writes to a downstream system). Today a client retry = duplicate
side effects.

### 2.3 Multi-provider LLM support — ✅ DONE (2026-06-11, OpenAI-compatible node)
Added a first-class **OpenAI** node (`lib/nodes/openai.ts` + `OpenAINode.tsx`)
speaking the OpenAI `/chat/completions` shape with a configurable `baseURL`, so a
single node covers OpenAI plus Together/Groq/OpenRouter and local Ollama/LM Studio.
Reads the `openai` provider key, mirrors the Anthropic node's input handles
(model/systemPrompt/temperature/history/userPrompt → output), and surfaces token
usage. Registered in both registries. Covered by executor tests (7) + canvas
tests (21); QA spec NODE-AI-09; catalogue updated in AGENTS.md. SSRF guard
intentionally not applied to the provider base URL (local models are a primary
use case). **Still open as future scope:** Gemini/Bedrock-native nodes and a
provider-agnostic "chat" node — the OpenAI-compatible node covers most of these
via baseURL already.

The only first-class model node is Anthropic. No OpenAI / OpenAI-compatible /
Gemini / Bedrock / local-Ollama node, and no provider-agnostic "chat" node. You
can bolt providers on via the raw HTTP node, but then you lose token accounting,
the credential model, and the canvas ergonomics. (Given this is positioned as AI
middleware, an OpenAI-compatible node is the obvious gap.)

### 2.4 Observability / metrics export — ✅ DONE (2026-06-14, Prometheus /metrics)
Added a Prometheus text-exposition endpoint `GET /api/metrics` (`lib/metrics.ts`
+ `app/api/metrics/route.ts`): executions by status, request + token counters, a
latency summary (`_sum`/`_count`), and live concurrency/queue gauges — all
derived from the existing `executions`/`request_logs`/`workflows` tables and the
`ExecutionSemaphore` (no schema change). Gated by the management shared secret
(not in `isPublicPath`, so a scraper sends `Authorization: Bearer <SOOKET_AUTH_TOKEN>`).
Collection and rendering are split for testing; label values are escaped and an
empty DB still emits every metric. Covered by `__tests__/lib/metrics.test.ts`,
`__tests__/api/metrics-route.test.ts`, and a gating assertion in the auth test;
QA spec API-16; documented in AGENTS.md. The **readiness probe** half of this
item shipped earlier as §6 (`/api/health?ready=1`). **Residual future scope:**
OpenTelemetry traces and structured JSON stdout logs (noted in API-16).

There's a `request_logs` table and a Logs tab, but no Prometheus `/metrics`
endpoint, no OpenTelemetry traces, no structured JSON logs to stdout. I can't
wire this into Grafana/Datadog/an SLO dashboard without writing an exporter
myself. `/api/health` only reports uptime; the `/api/v1/chat` GET health check
merely asserts `ENCRYPTION_SECRET` is set — neither is a real readiness probe
(DB reachable? migrations applied? queue depth?).

### 2.5 Response caching at the edge — ✅ DONE (2026-06-14, documented model + non-goal)
Resolved as a documentation/positioning item — no new code warranted. The
execution API is `POST` with side effects, so HTTP-edge caching / `If-None-Match`
→ `304` doesn't fit (a 304 wouldn't skip re-execution, only body transfer). The
practical caching needs are already met by existing primitives, now documented as
a layered model in AGENTS.md ("Caching & response control"): the **Cache** /
**Semantic Cache** nodes skip re-execution; **`Idempotency-Key`** makes retries
side-effect-safe; the **Response Builder** node lets an author set
`Cache-Control`/`ETag` per workflow (merged last into the response — already
covered by API-13) to opt a genuinely-cacheable endpoint into downstream
CDN/browser caching. A shared cache across replicas is an explicit **non-goal**
(single-process by design — see §3.1). No test added (Response Builder header
passthrough is covered by API-13).

There's a Cache node and a Semantic Cache node (nice), but no HTTP-level response
caching with ETag / `Cache-Control` honoring, and no shared cache across
replicas. The node caches live in SQLite which helps, but the semantics are
per-node, not per-endpoint.

### 2.6 Versioned/canary deploys of a workflow — ✅ DONE (2026-06-14, documented pattern + non-goal)
Resolved as documentation. Safe rollout is expressed inside the graph (fitting
the single-process model), now documented in AGENTS.md ("Versioning & canary"):
**percentage canary** via the **A/B Split** node (weighted routing) pointing
branches at **Sub-Workflow** nodes for the new vs current pipeline (ramp by
adjusting weights); **rollback/history** via `workflow_versions` + the
`/versions` restore endpoint; and **breaking-change pinning** via node
`typeVersion`. Deploy-level blue/green (two separately-deployed versions behind a
router with promotion) is an explicit **non-goal** of the single-process design
(§3.1). No code/test added — the building blocks (A/B Split, Sub-Workflow,
versions) already exist and are covered by their own specs.

`workflow_versions` snapshots history and you can restore, but there's no notion
of running v(n) and v(n+1) side by side, percentage canarying a new pipeline, or
blue/green promotion. Setting `is_active` is an all-or-nothing flip. The A/B
Split node is request-level, not deploy-level. For changing a live integration
safely, deploy-level canary is what I'd reach for.

### 2.7 Outbound auth / secret injection helpers — ✅ DONE (2026-06-14, OAuth2 node)
Added an **OAuth2 Token** node (`lib/nodes/oauth2-token.ts` + `OAuth2TokenNode.tsx`)
that runs the client-credentials grant and **caches the token until it (nearly)
expires** in `node_cache` (TTL = `expires_in` − refresh skew), giving automatic
refresh on the next run after it lapses — no hand-rolled token-fetch sub-pipeline.
Credentials accept `$VAR` references (encrypted customer variables) and never
appear in the cache key; the token URL is SSRF-guarded (`assertEgressAllowed`);
credentials go in the form body or an HTTP Basic header. Outputs the access token
for a downstream HTTP node to inject as `Authorization: Bearer {{ $node.<id> }}`.
Registered in both registries; catalogue updated (External). Covered by executor +
canvas tests (15); QA spec NODE-EXT-06. **Residual future scope:** AWS SigV4 / HMAC
request signing and other grant types (HMAC is doable today via Custom Code).

The HTTP node does `{{VAR}}` substitution into headers, but there's no built-in
OAuth2 client-credentials grant, no automatic token refresh, no request signing
(AWS SigV4, HMAC). Every integration that needs OAuth has to be hand-rolled with
a token-fetch sub-pipeline. That's a lot of the real work in middleware.

### 2.8 Schema validation / contract enforcement on input and output — ✅ DONE (2026-06-14)
Added a **Schema Validator** node. `lib/schema-validate.ts` is a dependency-free
JSON Schema (draft-07 subset) validator with JSON-path error tracking (type incl.
integer/null/unions, enum/const, required/properties/additionalProperties,
items/min-max/unique, string length/pattern, numeric bounds/multipleOf). The node
(`lib/nodes/schema-validator.ts` + `SchemaValidatorNode.tsx`) validates its
connected input and routes to `valid` (input passed through) / `invalid`
(`{ valid, errors, message }`); on failure `action` either **blocks** the valid
output (validate-and-reject) or **passes** input through while still emitting
errors. Wire it at the entry (validate the body) or the exit (validate the
response). Registered in both registries; catalogue updated (Logic). Covered by
validator + executor + canvas tests (38); QA spec NODE-LOGIC-16. No native dep
(kept the npm package portable); `format` and `allOf`/`anyOf`/`oneOf`/`not` are
intentionally out of the subset.

No JSON-Schema/OpenAPI validation node for the incoming body or the outgoing
response. JSON Parser/Builder exist but won't reject a malformed contract. A
gateway usually wants to validate-and-reject at the boundary.

### 2.9 Dead-letter / async execution / scheduled triggers — ✅ DONE (2026-06-14, documented model + non-goal)
Resolved as documentation. Synchronous request/response is the deliberate model;
in-graph resilience already exists and is now documented in AGENTS.md ("Execution
model & resilience"): the **Retry** node (backoff), **Try/Catch** + `error` edges
(catch-and-branch), and the **error workflow** hook (`error_workflow_id` →
`triggerErrorWorkflow`, which intentionally swallows its own errors so a failing
error workflow can't mask the original, with an infinite-loop guard). **Scheduled
runs** are driven externally (cron/systemd timer → the workflow's API key or
webhook URL) since a local-first process isn't an always-on daemon. A durable
async queue / DLQ and fire-and-forget-with-retry *delivery* are explicit
**non-goals** of the single-process model (§3.1); the Webhook node already covers
fire-and-forget outbound calls. No code change — the building blocks exist and
the "swallows its own errors" behaviour is correct by design.

Execution is synchronous request/response only. There's no queue/DLQ for failed
async work, no cron/scheduled workflow trigger, no "fire and forget with retry"
delivery. The error-workflow hook is the closest thing, but it's best-effort and
swallows its own errors (`lib/workflow-engine.ts` `triggerErrorWorkflow`).

---

## 3. What makes me skeptical (architecture & positioning)

### 3.1 It cannot scale horizontally — and the docs lean into that — ✅ DONE (2026-06-14, stated plainly)
Resolved by stating the limitation plainly in AGENTS.md ("Scaling & availability
(single-process by design)"): per-process state (semaphore, in-memory caches,
rate-limit accounting) means N replicas ≠ correct global limits; SQLite is the
sole datastore with no HA/failover (backup = copy the `.db` file); it's a single
point of failure with a throughput ceiling — fine for trusted internal/side-car
use, not gateway-grade HA in front of production traffic. Framed as a deliberate
product stance and cross-linked from the Caching/Versioning/Execution non-goals
and §3.3. Documentation only.

The README/AGENTS framing is "runs locally on your own server, single process."
That's a fine product stance, but it has hard consequences the marketing of
"API middleware platform" papers over:
- The execution semaphore, the in-memory eval caches, and process state live
  **in one Node process**. You can't put two replicas behind a load balancer and
  get correct global rate limiting or concurrency control — the semaphore is
  per-process, so N replicas = N× the intended concurrency.
- SQLite as the only datastore means the write path is a single machine. There's
  no path to HA / failover; the "backup" story is literally "copy the .db file"
  (`npm run backup`, `/api/admin/backup`).
- For a side-car / internal-glue use case this is totally acceptable. As the
  thing sitting in front of production traffic, it's a single point of failure
  with a throughput ceiling. I'd want this stated plainly so nobody puts it on a
  critical path expecting gateway-grade availability.

### 3.2 The recursive engine has no depth guard beyond cycle detection — ✅ DONE (2026-06-14)
Implemented a per-execution recursion-depth guard. `evaluateNode` now throws a
terminal `WorkflowDepthError` once the active path exceeds `EXECUTION_MAX_DEPTH`
(default 1000, `0`/negative disables) — checked via `visiting.size` (the set
holds exactly the live ancestors, so its size is the recursion depth), so a deep
acyclic chain aborts cleanly instead of blowing the JS stack with a `RangeError`.
Armed once for the top-level run and inherited by sub-workflows through the
shared `reqCtx.maxDepth` (so a chain of nested sub-workflows is bounded across
the whole execution, independent of the existing depth-5 sub-workflow cap). Like
the deadline, it bypasses error-edge routing; the handler maps it to HTTP 400
(a workflow-structure error, distinct from a 500). Scope note: this bounds
*path depth* (the stack-overflow vector); wide/shallow graphs remain bounded by
the execution deadline (§1.1) and concurrency cap. Covered by unit tests
(`__tests__/lib/workflow-engine-depth.test.ts`, incl. a 3000-deep chain proving
no crash) + handler mapping test + QA spec ENGINE-11.

`evaluateNode` recurses through the graph and protects against *cycles* with a
`visiting` set, but a legitimately deep (non-cyclic) chain recurses on the JS
call stack. A pathological or generated workflow could blow the stack
(`RangeError`). Sub-workflows cap at depth 5, but intra-workflow depth is
unbounded. An explicit node-count / depth limit per execution would be prudent.

### 3.3 Security model is "one shared password" but the feature set implies multi-tenant — ✅ DONE (2026-06-14, trust boundary made loud)
Resolved by making the trust boundary explicit in AGENTS.md ("Trust boundary:
calling vs editing"): exactly two privilege levels — *can call a workflow*
(`sk-wf-*` key) vs *can edit workflows* (`SOOKET_AUTH_TOKEN` gate), and **editing
is equivalent to host shell access** (Custom Code `node:vm` is hardened but not a
real sandbox per §1.3; outbound nodes reach anything egress allows). Spelled out
that per-workflow keys/scopes/access-lists/rate-limits are caller-organization
conveniences **not** tenant isolation, that anyone past the gate can read/edit
every workflow + credential and `/api/admin/backup` streams the whole DB, and
that multi-tenant isolation is a non-goal. Documentation only — the boundary is
now loud (the enforcement itself, e.g. the Custom Code hardening, shipped in §1.3).

`SOOKET_AUTH_TOKEN` is a single instance-wide secret (AGENTS.md is explicit:
"not a multi-user account system"). Yet there are per-workflow API keys, scopes,
access lists, and rate limits — all the trappings of multi-tenant. The mismatch
worries me: someone *will* expose this to several teams using per-workflow keys
as if they were tenant boundaries, while the management surface is gated by one
shared password and the Custom Code node is a host-RCE primitive (1.3). The trust
boundary between "can call a workflow" and "can edit workflows" needs to be much
louder, or genuinely enforced.

### 3.4 CORS defaults to `*` — ✅ DONE (2026-06-14)
CORS is now **deny-by-default**. `lib/execution-handler.ts` exposes
`corsHeaders(origin)` (replacing the static `CORS_HEADERS`): with `CORS_ORIGIN`
unset, no `Access-Control-Allow-Origin` is emitted (Methods/Headers still are, so
preflight shape is intact but browsers block cross-origin reads). The operator
opts in via `CORS_ORIGIN=*` (wildcard, the historical default) or a
comma-separated allowlist — a matching request `Origin` is reflected back with
`Vary: Origin`, others denied. Resolved per request (reads the `Origin` header)
and wired through both the execution route and the webhook route (incl. OPTIONS
preflight). Non-browser/Bearer callers are unaffected. Covered by
`__tests__/lib/cors.test.ts` + route/handler tests; QA spec API-06 reworked
(+ ACAO notes in API-01/02/03/07/13); documented in `.env.example`.

`lib/execution-handler.ts` sets `Access-Control-Allow-Origin: *` by default.
Auth is via Bearer key so it's not catastrophic, but a wildcard CORS default on
an execution API invites browser-side key usage from any origin. I'd default to
deny and make the operator opt in to origins.

### 3.5 Error messages can leak upstream detail — ✅ DONE (2026-06-14)
Implemented boundary sanitisation. New `lib/security/error-sanitize.ts`
(`sanitizeExecutionError`) maps an *unexpected* execution error to a generic
message (`"Internal error executing the workflow"`) + a `randomUUID` correlation
`logId`, logging the full raw error server-side under that id. Wired into the
catch-all 500 branch of `handleExecutionRequest` and the webhook route, **after**
the safe self-authored mappings (no-output → 400, timeout → 504, depth → 400)
which keep their explicit messages. So upstream provider response bodies (the
Anthropic/OpenAI nodes rethrow them verbatim), stack traces, and filesystem
paths no longer cross the trust boundary, while the operator keeps full detail in
the execution record (Logs tab) and the correlated stderr line. The
operator-gated debug route is intentionally left verbatim. Covered by
`__tests__/lib/error-sanitize.test.ts` + boundary assertions in chat/webhook
route tests; QA spec SEC-15.

The Anthropic node rethrows `Upstream provider error: ${errText}` verbatim. The
HTTP node is careful to strip query strings from URLs in errors (good!), but the
provider-error passthrough and the generic `String(err)` surfaced as a 500 body
in `handleExecutionRequest` can leak internal detail to the caller. Errors that
cross the trust boundary should be sanitized to a generic message + an internal
log id.

### 3.6 "Not the Next.js you know" + bespoke expression language = onboarding tax
The `{{ $node.X }}` / `{{ $json }}` mini-language (`lib/expr.ts`) is reasonable,
but it's a custom DSL with its own resolution order and silent `undefined` on
unknown refs — which means typos fail quiet, not loud. Combined with the repo's
own "this is NOT the Next.js you know, read the bundled docs first" warning,
there's a real ramp-up cost and a debugging-by-staring-at-traces workflow. Not a
flaw exactly — just friction I'd weigh before standardizing a team on it.

---

## 4. Things I actually liked (so this isn't all gripes)
- **Node executor versioning** (`{1: v1, 2: v2}` keyed by `typeVersion`) lets you
  ship breaking node changes without breaking saved workflows. Genuinely good.
- **Trace merging** per node across multiple output handles is a clean model for
  observability inside an execution.
- **Body-size limiting** (`lib/request-limit.ts`) counts streamed bytes instead
  of trusting `Content-Length` — correct and often gotten wrong.
- **Ordered, name-tracked migrations** instead of raw `ALTER TABLE` against live
  DB. Disciplined.
- HTTP node **stripping secrets from error URLs** shows someone was thinking
  about leak surfaces (which makes the plaintext-key storage more surprising).

---

## 5. Suggested priority order (if/when we act on this)
1. **1.1 execution deadline + queue-wait timeout** — protects availability.
2. **1.2 hash API keys at rest** — protects every consumer on a DB leak.
3. **1.3 Custom Code isolation** (or a very loud capability warning + opt-in).
4. **2.1 streaming** — the biggest product gap for the AI use case.
5. **1.6 PBKDF2 cache+bump, 1.4 constant-time webhook compare** — cheap wins.
6. **1.5 SSRF egress controls** — before anyone exposes this beyond loopback.
7. Everything in §2 as roadmap, §3 as documentation/positioning honesty.

---

## 6. Health endpoint: add readiness check (DB probe) — ✅ DONE (2026-06-14)
Implemented: `GET /api/health?ready=1` opt-in readiness mode (kept on the same
path so it stays exempt in `isPublicPath()` — a sub-path would not). The probe
(`lib/db/health.ts` `probeDatabaseReady`) does a `SELECT 1` read **plus** a write
check by rewriting `PRAGMA user_version` to its current value — a genuine header
write that detects a read-only/full-volume DB without polluting data or needing a
table (`user_version` is unused; migrations live in `schema_migrations`). Body
gains `checks: { db: "ok" | "error" }`; any failure → HTTP 503 (orchestrators key
off the status). Liveness (`GET /api/health`, no flag) is byte-for-byte unchanged
and never touches the DB. Covered by unit tests (`__tests__/db/health.test.ts`:
healthy / read-only / closed handle) + route tests (`__tests__/api/health.test.ts`:
liveness unchanged, readiness 200/503, truthy/falsey `ready`, getDb-throws) and QA
spec API-15; documented in `.env.example` and AGENTS.md.

- [x] Add readiness mode: `GET /api/health?ready=1` (chose the query flag over a
      separate path so it stays in `isPublicPath()`)
- [x] Probe: trivial DB round-trip — `SELECT 1`, plus a write check
      (`PRAGMA user_version` rewrite — detects read-only/unwritable DB)
- [x] Response: extend body with `checks: { db: "ok" | "error" }`; return
      HTTP 503 when any check fails
- [x] Keep the probe cheap and unauthenticated — stays in `isPublicPath()`
- [x] Tests: healthy path, read-only/closed DB path, getDb-throws path
- [x] Document in `.env.example` / docs alongside the existing health note

Liveness behavior (`GET /api/health` with no flag) stays exactly as-is.

## 7. Docker image fails to build on current main — onnxruntime needs glibc, base image is musl — ✅ DONE (2026-06-14)
Implemented all three fixes: (1) Dockerfile base moved off musl to glibc
(`node:22-alpine` → `node:22-slim`), with the runner stage switched to Debian's
`groupadd`/`useradd`. (2) `lib/complexity/embedder.ts` now imports the
`@huggingface/transformers` *runtime* lazily (`const { pipeline } = await
import(...)` inside `getEmbedder()`), keeping only an erased `import type` at the
top — so `next build`'s page-data collection for `/api/complexity` no longer
loads `onnxruntime-node`. (3) `docker.yml` gained a no-push `build` job gated on
`pull_request` + branch pushes (`if: !startsWith(github.ref, 'refs/tags/')`), so
an unbuildable image can't land on `main`; `publish` stays tag/dispatch-gated.
Also added a `.dockerignore` (keeps `data/`, `*.db`, and `.env*` out of the image
— leak prevention) since the builder uses `COPY . .`. Verified: `SOOKET_STANDALONE=1
npm run build` succeeds (page data collected, `server.js` emitted, no
onnxruntime/ld-linux error), full suite + lint green, regression test
`__tests__/lib/embedder-lazy-import.test.ts`, QA spec EDGE-11. Note: an actual
`docker build` couldn't run in this sandbox (no daemon access) — the glibc/musl
dimension is now exercised by the new CI `build` job.

Found 2026-06-11 building `docker build -t sooket:local .` from a fresh clone
of `main` (`c3ce179`, tag `v0.1.2`), while wiring up the hosted control plane
(sooket.cloud). `npm run build` dies inside the image during Next's
"Collecting page data" phase:

```
Error: Failed to load external module @huggingface/transformers-…:
Error loading shared library ld-linux-x86-64.so.2: No such file or directory
(needed by /app/node_modules/onnxruntime-node/.../libonnxruntime.so.1)
Error: Failed to collect page data for /api/complexity
```

Cause: `lib/complexity/embedder.ts` imports `@huggingface/transformers` at
module top level, so collecting page data for `app/api/complexity/route.ts`
loads `onnxruntime-node`. Its prebuilt `libonnxruntime.so.1` is glibc-only;
the Dockerfile's `node:22-alpine` base is musl, so the glibc loader
(`ld-linux-x86-64.so.2`) doesn't exist. **This blocks any Docker deployment of
current main, including every sooket.cloud tenant image.**

- [x] Dockerfile: move all stages off musl, e.g. `FROM node:22-slim` —
      onnxruntime-node ships glibc binaries only. (Alpine + `gcompat` also
      works on paper but is flaky with onnxruntime; not recommended.)
      Mind the runner stage: Debian uses `groupadd`/`useradd`, not
      `addgroup`/`adduser` with those flags.
- [x] `lib/complexity/embedder.ts`: import `@huggingface/transformers` lazily
      inside the function (`await import(...)`) so `next build` never loads
      the native runtime just to collect page data. This alone unblocks the
      *build*; the complexity endpoint still needs glibc at runtime, so the
      base-image fix matters regardless.
- [x] CI: add a `docker build .` job so an unbuildable image can't land on
      `main` again.