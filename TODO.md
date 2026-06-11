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

### 1.8 No graceful handling of SQLite write contention
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

### 2.2 Idempotency keys
No `Idempotency-Key` support on `POST /api/v1/chat`. Any serious API platform
needs safe retries for non-idempotent pipelines (one that charges a card, sends
an email, writes to a downstream system). Today a client retry = duplicate
side effects.

### 2.3 Multi-provider LLM support
The only first-class model node is Anthropic. No OpenAI / OpenAI-compatible /
Gemini / Bedrock / local-Ollama node, and no provider-agnostic "chat" node. You
can bolt providers on via the raw HTTP node, but then you lose token accounting,
the credential model, and the canvas ergonomics. (Given this is positioned as AI
middleware, an OpenAI-compatible node is the obvious gap.)

### 2.4 Observability / metrics export
There's a `request_logs` table and a Logs tab, but no Prometheus `/metrics`
endpoint, no OpenTelemetry traces, no structured JSON logs to stdout. I can't
wire this into Grafana/Datadog/an SLO dashboard without writing an exporter
myself. `/api/health` only reports uptime; the `/api/v1/chat` GET health check
merely asserts `ENCRYPTION_SECRET` is set — neither is a real readiness probe
(DB reachable? migrations applied? queue depth?).

### 2.5 Response caching at the edge
There's a Cache node and a Semantic Cache node (nice), but no HTTP-level response
caching with ETag / `Cache-Control` honoring, and no shared cache across
replicas. The node caches live in SQLite which helps, but the semantics are
per-node, not per-endpoint.

### 2.6 Versioned/canary deploys of a workflow
`workflow_versions` snapshots history and you can restore, but there's no notion
of running v(n) and v(n+1) side by side, percentage canarying a new pipeline, or
blue/green promotion. Setting `is_active` is an all-or-nothing flip. The A/B
Split node is request-level, not deploy-level. For changing a live integration
safely, deploy-level canary is what I'd reach for.

### 2.7 Outbound auth / secret injection helpers
The HTTP node does `{{VAR}}` substitution into headers, but there's no built-in
OAuth2 client-credentials grant, no automatic token refresh, no request signing
(AWS SigV4, HMAC). Every integration that needs OAuth has to be hand-rolled with
a token-fetch sub-pipeline. That's a lot of the real work in middleware.

### 2.8 Schema validation / contract enforcement on input and output
No JSON-Schema/OpenAPI validation node for the incoming body or the outgoing
response. JSON Parser/Builder exist but won't reject a malformed contract. A
gateway usually wants to validate-and-reject at the boundary.

### 2.9 Dead-letter / async execution / scheduled triggers
Execution is synchronous request/response only. There's no queue/DLQ for failed
async work, no cron/scheduled workflow trigger, no "fire and forget with retry"
delivery. The error-workflow hook is the closest thing, but it's best-effort and
swallows its own errors (`lib/workflow-engine.ts` `triggerErrorWorkflow`).

---

## 3. What makes me skeptical (architecture & positioning)

### 3.1 It cannot scale horizontally — and the docs lean into that
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

### 3.2 The recursive engine has no depth guard beyond cycle detection
`evaluateNode` recurses through the graph and protects against *cycles* with a
`visiting` set, but a legitimately deep (non-cyclic) chain recurses on the JS
call stack. A pathological or generated workflow could blow the stack
(`RangeError`). Sub-workflows cap at depth 5, but intra-workflow depth is
unbounded. An explicit node-count / depth limit per execution would be prudent.

### 3.3 Security model is "one shared password" but the feature set implies multi-tenant
`SOOKET_AUTH_TOKEN` is a single instance-wide secret (AGENTS.md is explicit:
"not a multi-user account system"). Yet there are per-workflow API keys, scopes,
access lists, and rate limits — all the trappings of multi-tenant. The mismatch
worries me: someone *will* expose this to several teams using per-workflow keys
as if they were tenant boundaries, while the management surface is gated by one
shared password and the Custom Code node is a host-RCE primitive (1.3). The trust
boundary between "can call a workflow" and "can edit workflows" needs to be much
louder, or genuinely enforced.

### 3.4 CORS defaults to `*`
`lib/execution-handler.ts` sets `Access-Control-Allow-Origin: *` by default.
Auth is via Bearer key so it's not catastrophic, but a wildcard CORS default on
an execution API invites browser-side key usage from any origin. I'd default to
deny and make the operator opt in to origins.

### 3.5 Error messages can leak upstream detail
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

## 6. Health endpoint: add readiness check (DB probe)

`/api/health` is currently a pure liveness probe — it returns `ok` without
touching SQLite, so it can't distinguish "process up" from "up but DB
unwritable" (full volume, bad mount, locked file). Orchestrators (Docker
healthchecks, k8s/Fly-style probes, future hosted control plane) need that
distinction to know when to route traffic vs. restart/alert.

- [ ] Add readiness mode: `GET /api/health?ready=1` (or a separate `/api/health/ready`)
- [ ] Probe: trivial DB round-trip — open handle + `SELECT 1`, plus a write
      check (e.g. `PRAGMA user_version` read or insert/delete on a probe row)
- [ ] Response: extend body with `checks: { db: "ok" | "error" }`; return
      HTTP 503 when any check fails (orchestrators key off status code)
- [ ] Keep the probe cheap (<5 ms) and unauthenticated — must stay in
      `isPublicPath()`
- [ ] Tests: healthy path, missing/readonly DB file path
- [ ] Document in `.env.example` / docs alongside the existing health note

Liveness behavior (`GET /api/health` with no flag) stays exactly as-is.