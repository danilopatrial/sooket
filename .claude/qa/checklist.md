# Sooket QA Checklist

Status flags: `[ ]` = pending · `[x]` = passed · `[!]` = has findings · `[-]` = skipped

Each item links to a detailed spec file in `.claude/qa/specs/`.
Findings are written to `.claude/qa/findings.md`.

---

## 1. Navigation & Routing
- [x] [NAV-01] Root redirect (`/` → `/workflow`) — [spec](specs/NAV-01.md)
- [x] [NAV-02] Login page renders and redirects to `/workflow` — [spec](specs/NAV-02.md)
- [x] [NAV-03] Register page renders and redirects to `/workflow` — [spec](specs/NAV-03.md)
- [x] [NAV-05] 404 / unknown routes — [spec](specs/NAV-05.md)

---

## 2. Workflow Dashboard
- [x] [DASH-01] Workflow list loads and displays all workflows — [spec](specs/DASH-01.md)
- [x] [DASH-02] Create new workflow — button, loading state, navigates to canvas on success — [spec](specs/DASH-02.md)
- [x] [DASH-03] Workflow card shows name, slug, creation date, and active badge — [spec](specs/DASH-03.md)
- [x] [DASH-04] Active workflow is visually distinguished — [spec](specs/DASH-04.md)
- [x] [DASH-05] Empty state (no workflows) renders correctly — [spec](specs/DASH-05.md)
- [x] [DASH-06] Delete inactive workflow — inline confirm/cancel flow — [spec](specs/DASH-06.md)
- [x] [DASH-07] Delete button is absent for active workflows — [spec](specs/DASH-07.md)

---

## 3. Canvas Editor — Core
- [x] [CANVAS-01] Canvas loads for a workflow slug — [spec](specs/CANVAS-01.md)
- [x] [CANVAS-02] Node sidebar opens, collapses, and lists all node categories — [spec](specs/CANVAS-02.md)
- [x] [CANVAS-03] Node search in sidebar filters across all categories — [spec](specs/CANVAS-03.md)
- [x] [CANVAS-04] Drag node from sidebar onto canvas — [spec](specs/CANVAS-04.md)
- [x] [CANVAS-05] Connect two nodes with an edge — [spec](specs/CANVAS-05.md)
- [x] [CANVAS-06] Delete a node — [spec](specs/CANVAS-06.md)
- [x] [CANVAS-07] Delete an edge — [spec](specs/CANVAS-07.md)
- [x] [CANVAS-08] Auto-insert node into existing edge by dragging onto it — [spec](specs/CANVAS-08.md)
- [x] [CANVAS-09] Canvas saves automatically (debounced 800ms) with "Saved" indicator — [spec](specs/CANVAS-09.md)
- [x] [CANVAS-10] Canvas zoom and pan — [spec](specs/CANVAS-10.md)
- [x] [CANVAS-11] Minimap renders and is interactive — [spec](specs/CANVAS-11.md)
- [x] [CANVAS-12] Undo (Ctrl+Z) and redo (Ctrl+Shift+Z) work for node and edge changes — [spec](specs/CANVAS-12.md)
- [x] [CANVAS-13] TextExpandModal opens for long text fields — [spec](specs/CANVAS-13.md)
- [x] [CANVAS-15] Disabled node is visually distinguished and skipped in execution — [spec](specs/CANVAS-15.md)
- [x] [CANVAS-16] Keyboard shortcuts: Ctrl+A (select all), Ctrl+C (copy), Ctrl+V (paste with offset), S (node search) — [spec](specs/CANVAS-16.md)
- [x] [CANVAS-17] Right-click node opens context menu (disable/enable, pin/unpin, re-run) — [spec](specs/CANVAS-17.md)
- [x] [CANVAS-18] Right-click edge opens context menu (toggle error/main connection type) — [spec](specs/CANVAS-18.md)
- [x] [CANVAS-19] Drag node to trash zone (bottom-right) to delete it — [spec](specs/CANVAS-19.md)
- [x] [CANVAS-20] S key opens node search overlay (NodeSearchMenu) with keyboard navigation — [spec](specs/CANVAS-20.md)
- [x] [CANVAS-21] Export workflow to JSON file — [spec](specs/CANVAS-21.md)
- [x] [CANVAS-22] Import workflow from JSON — validates exactly 1 input node and all edges reference valid nodes — [spec](specs/CANVAS-22.md)
- [x] [CANVAS-23] Input node is non-deletable — [spec](specs/CANVAS-23.md)
- [x] [CANVAS-24] Canvas top bar: workflow name is editable inline — [spec](specs/CANVAS-24.md)
- [x] [CANVAS-25] Canvas top bar: active toggle activates/deactivates the workflow — [spec](specs/CANVAS-25.md)

---

## 4. Debug Panel
- [x] [DEBUG-01] Debug panel opens and closes — [spec](specs/DEBUG-01.md)
- [x] [DEBUG-02] Send a test request (Sandbox tab) and see execution result — [spec](specs/DEBUG-02.md)
- [x] [DEBUG-03] Node-level execution trace rows are displayed and expandable — [spec](specs/DEBUG-03.md)
- [x] [DEBUG-04] Save and load a test preset — [spec](specs/DEBUG-04.md)
- [x] [DEBUG-05] Delete a test preset — [spec](specs/DEBUG-05.md)
- [x] [DEBUG-06] Partial re-run from a specific node trace row (pin data) — [spec](specs/DEBUG-06.md)
- [x] [DEBUG-07] Error in execution is surfaced in the panel with error message — [spec](specs/DEBUG-07.md)
- [x] [DEBUG-08] Custom request headers can be set via KV editor in Sandbox tab — [spec](specs/DEBUG-08.md)
- [x] [DEBUG-09] Custom query params can be set via KV editor in Sandbox tab — [spec](specs/DEBUG-09.md)
- [x] [DEBUG-10] Logs tab loads and auto-refreshes every 3 seconds — [spec](specs/DEBUG-10.md)
- [x] [DEBUG-11] Debug panel can be resized by dragging the top handle — [spec](specs/DEBUG-11.md)
- [x] [DEBUG-12] JSON body is validated before sending — invalid JSON shows an error — [spec](specs/DEBUG-12.md)

---

## 5. History Panel
- [x] [HIST-01] Version history list loads (most recent first) — [spec](specs/HIST-01.md)
- [x] [HIST-02] Restore a previous version — [spec](specs/HIST-02.md)
- [x] [HIST-03] Up to 50 versions are shown — [spec](specs/HIST-03.md)
- [x] [HIST-04] Diff view shows added (green) and removed (red) nodes for selected version — [spec](specs/HIST-04.md)

---

## 6. Workflow Config — General Tab
- [x] [CFG-GEN-01] Rename a workflow — inline edit with save/cancel — [spec](specs/CFG-GEN-01.md)
- [x] [CFG-GEN-02] Toggle workflow active/inactive — [spec](specs/CFG-GEN-02.md)
- [x] [CFG-GEN-03] Setting active deactivates all other workflows — [spec](specs/CFG-GEN-03.md)
- [x] [CFG-GEN-04] Assign an error workflow — [spec](specs/CFG-GEN-04.md)
- [x] [CFG-GEN-05] Delete a workflow (inactive only) — confirmation required — [spec](specs/CFG-GEN-05.md)
- [x] [CFG-GEN-06] Cannot delete an active workflow — [spec](specs/CFG-GEN-06.md)
- [x] [CFG-GEN-07] Management API key: reveal (eye icon) and copy to clipboard — [spec](specs/CFG-GEN-07.md)

---

## 7. Workflow Config — API Keys Tab
- [x] [CFG-KEY-01] List existing API keys with masked values (first 10 + last 4 chars) — [spec](specs/CFG-KEY-01.md)
- [x] [CFG-KEY-02] Create a new API key with label — [spec](specs/CFG-KEY-02.md)
- [x] [CFG-KEY-03] Set expiry date on API key creation — [spec](specs/CFG-KEY-03.md)
- [x] [CFG-KEY-04] Enable/disable an API key — cannot disable the last active key — [spec](specs/CFG-KEY-04.md)
- [x] [CFG-KEY-05] Delete an API key — two-click inline confirmation — [spec](specs/CFG-KEY-05.md)
- [x] [CFG-KEY-06] Cannot delete the last active API key — [spec](specs/CFG-KEY-06.md)
- [x] [CFG-KEY-07] View per-key stats panel (requests, tokens, avg latency, 30-day bar chart) — [spec](specs/CFG-KEY-07.md)
- [x] [CFG-KEY-08] Newly created key is shown once in a reveal banner (copy/show buttons) — [spec](specs/CFG-KEY-08.md)
- [x] [CFG-KEY-09] Expired badge appears on keys past their expiry date — [spec](specs/CFG-KEY-09.md)

---

## 8. Workflow Config — Credentials Tab
- [x] [CFG-CRED-01] List global credentials (credential pool) — [spec](specs/CFG-CRED-01.md)
- [x] [CFG-CRED-02] Create a new global credential (name, type, secret) — [spec](specs/CFG-CRED-02.md)
- [x] [CFG-CRED-03] Delete a global credential — [spec](specs/CFG-CRED-03.md)
- [x] [CFG-CRED-04] Link a credential to a workflow node — [spec](specs/CFG-CRED-04.md)
- [x] [CFG-CRED-05] Unlink a credential from a node — [spec](specs/CFG-CRED-05.md)

---

## 9. Workflow Config — Provider Keys Tab
- [x] [CFG-PROV-01] Provider key shows "Configured" badge when set — [spec](specs/CFG-PROV-01.md)
- [x] [CFG-PROV-02] Add/update a provider key (password field + save) — [spec](specs/CFG-PROV-02.md)
- [x] [CFG-PROV-03] Remove a provider key — [spec](specs/CFG-PROV-03.md)

---

## 10. Workflow Config — Variables Tab
- [x] [CFG-VAR-01] List customer variables (names only, values are write-only) — [spec](specs/CFG-VAR-01.md)
- [x] [CFG-VAR-02] Create a variable (UPPER_SNAKE_CASE name, encrypted value) — [spec](specs/CFG-VAR-02.md)
- [x] [CFG-VAR-03] Invalid variable name is rejected (must match `^[A-Z][A-Z0-9_]*$`) — [spec](specs/CFG-VAR-03.md)
- [x] [CFG-VAR-04] Multiple variable rows can be added and saved in one batch — [spec](specs/CFG-VAR-04.md)
- [x] [CFG-VAR-05] Delete a variable — [spec](specs/CFG-VAR-05.md)

---

## 11. Workflow Config — Access List Tab
- [x] [CFG-ACL-01] List access list entries grouped by rule type — [spec](specs/CFG-ACL-01.md)
- [x] [CFG-ACL-02] Add an IP entry — [spec](specs/CFG-ACL-02.md)
- [x] [CFG-ACL-03] Add a CIDR entry — [spec](specs/CFG-ACL-03.md)
- [x] [CFG-ACL-04] Add a Value entry — [spec](specs/CFG-ACL-04.md)
- [x] [CFG-ACL-05] Add a Header entry — [spec](specs/CFG-ACL-05.md)
- [x] [CFG-ACL-06] Duplicate entry is rejected (409) — [spec](specs/CFG-ACL-06.md)
- [x] [CFG-ACL-07] Search/filter entries by value or label — [spec](specs/CFG-ACL-07.md)
- [x] [CFG-ACL-08] Delete an access list entry — [spec](specs/CFG-ACL-08.md)

---

## 12. Workflow Config — Executions Tab
- [x] [CFG-EXEC-01] Execution history list loads — [spec](specs/CFG-EXEC-01.md)
- [x] [CFG-EXEC-02] Click execution row to expand node output detail — [spec](specs/CFG-EXEC-02.md)
- [x] [CFG-EXEC-03] Failed/crashed executions are marked visually — [spec](specs/CFG-EXEC-03.md)
- [x] [CFG-EXEC-04] Node output JSON is expandable within execution detail — [spec](specs/CFG-EXEC-04.md)
- [x] [CFG-EXEC-05] Pagination (Previous/Next) works when > 20 executions — [spec](specs/CFG-EXEC-05.md)
- [x] [CFG-EXEC-06] Refresh button reloads the execution list — [spec](specs/CFG-EXEC-06.md)

---

## 13. Account Page
- [x] [ACCT-01] Account page loads with instance info (mode, workflow count) — [spec](specs/ACCT-01.md)
- [x] [ACCT-02] Generate/retrieve workspace management API key — [spec](specs/ACCT-02.md)
- [x] [ACCT-03] Copy management API key to clipboard — [spec](specs/ACCT-03.md)

---

## 14. VarField — Smart Expression Input
- [x] [VARFIELD-01] Typing `$VAR_NAME` triggers variable autocomplete suggestions — [spec](specs/VARFIELD-01.md)
- [x] [VARFIELD-02] Typing `{{$node.` triggers node reference autocomplete — [spec](specs/VARFIELD-02.md)
- [x] [VARFIELD-03] Known references highlighted violet/sky; unknown references highlighted amber — [spec](specs/VARFIELD-03.md)
- [x] [VARFIELD-04] Expand button opens TextExpandModal for fullscreen editing — [spec](specs/VARFIELD-04.md)
- [x] [VARFIELD-05] Arrow keys navigate suggestions; Enter/Tab inserts; Esc dismisses — [spec](specs/VARFIELD-05.md)

---

## 15. Nodes — Input (Default)
- [x] [NODE-INPUT-01] workflowInput default output carries the parsed request body — [spec](specs/NODE-INPUT-01.md)
- [x] [NODE-INPUT-02] `headers` output handle returns request headers as an object — [spec](specs/NODE-INPUT-02.md)
- [x] [NODE-INPUT-03] `query` output handle returns parsed URL search params — [spec](specs/NODE-INPUT-03.md)
- [x] [NODE-INPUT-04] `method` output handle returns the HTTP method string — [spec](specs/NODE-INPUT-04.md)
- [x] [NODE-INPUT-05] `raw` output handle returns the raw (binary-safe) request body — [spec](specs/NODE-INPUT-05.md)
- [x] [NODE-INPUT-06] `ip` output handle returns the client IP from request context — [spec](specs/NODE-INPUT-06.md)

---

## 16. Nodes — AI
- [x] [NODE-AI-01] Anthropic node — configure model (Haiku/Sonnet/Opus), system prompt, temperature slider — [spec](specs/NODE-AI-01.md)
- [x] [NODE-AI-02] Anthropic node — temperature slider hidden for Opus 4.7 and Sonnet 4.6 (not supported) — [spec](specs/NODE-AI-02.md)
- [x] [NODE-AI-03] Anthropic node — max output tokens is hardcoded to 8192 — [spec](specs/NODE-AI-03.md)
- [x] [NODE-AI-04] Token Counter node — uses GPT tokenizer (not Claude); count may diverge from actual Claude tokens — [spec](specs/NODE-AI-04.md)
- [x] [NODE-AI-05] Complexity node — returns 0–1 score, tier (simple/medium/complex), and signal chips — [spec](specs/NODE-AI-05.md)
- [x] [NODE-AI-06] Complexity node — heuristic-only for scores outside 0.25–0.70; embedding refine only in that range — [spec](specs/NODE-AI-06.md)
- [x] [NODE-AI-07] Sentiment node — returns score, label, and routes to positive/neutral/negative handles — [spec](specs/NODE-AI-07.md)
- [x] [NODE-AI-08] Prompt Compression node — compresses long input via Haiku before passing to main LLM — [spec](specs/NODE-AI-08.md)

---

## 17. Nodes — Request/Response
- [x] [NODE-REQ-01] Output node — marks workflow exit point, no configurable fields — [spec](specs/NODE-REQ-01.md)
- [x] [NODE-REQ-02] Response Builder node — custom status code (quick-pick + custom), headers (dynamic rows), body — [spec](specs/NODE-REQ-02.md)
- [x] [NODE-REQ-03] List Manager node — add/remove access list entries at runtime, action toggle (Add/Remove), entry type selector — [spec](specs/NODE-REQ-03.md)
- [x] [NODE-REQ-04] Access List node — enforces whitelist/blacklist, mode toggle — [spec](specs/NODE-REQ-04.md)
- [x] [NODE-REQ-05] Auth Validator node — JWT (HS256/RS256, claims) and API key validation modes — [spec](specs/NODE-REQ-05.md)

---

## 18. Nodes — External
- [x] [NODE-EXT-01] HTTP Request node — all methods (GET/POST/PUT/PATCH/DELETE), headers, timeout, body handle only for non-GET — [spec](specs/NODE-EXT-01.md)
- [x] [NODE-EXT-02] HTTP Request node — binary response stored externally and returned as a binary reference (not inline JSON) — [spec](specs/NODE-EXT-02.md)
- [x] [NODE-EXT-03] Vector Search node — Supabase and Pinecone provider tabs, top-K config, 15-second timeout — [spec](specs/NODE-EXT-03.md)
- [x] [NODE-EXT-04] Vector Upsert node — Supabase and Pinecone provider tabs, random UUID generated if no ID provided (Pinecone) — [spec](specs/NODE-EXT-04.md)
- [x] [NODE-EXT-05] Webhook node — fire-and-forget: errors are silently swallowed; no failure output — [spec](specs/NODE-EXT-05.md)

---

## 19. Nodes — Format
- [x] [NODE-FMT-01] JSON Parser node — extract fields, dynamic output handles per field, dot-notation support — [spec](specs/NODE-FMT-01.md)
- [x] [NODE-FMT-02] JSON Builder node — construct JSON from dynamic input handles — [spec](specs/NODE-FMT-02.md)
- [x] [NODE-FMT-03] XML↔JSON node — both directions, root element field (json→xml only), pretty print toggle — [spec](specs/NODE-FMT-03.md)
- [x] [NODE-FMT-04] Template String node — `{{slot}}` interpolation, live syntax highlighting, dynamic slot handles — [spec](specs/NODE-FMT-04.md)
- [x] [NODE-FMT-05] Type Cast node — String / Number / Boolean conversion — [spec](specs/NODE-FMT-05.md)
- [x] [NODE-FMT-06] DateTime node — Now mode (current timestamp) and Format mode (format input timestamp) — [spec](specs/NODE-FMT-06.md)

---

## 20. Nodes — Logic
- [x] [NODE-LOGIC-01] If node — all comparison operators (equality, numeric, string, unary checks) — [spec](specs/NODE-LOGIC-01.md)
- [x] [NODE-LOGIC-02] If node — compare handle hidden for unary operators — [spec](specs/NODE-LOGIC-02.md)
- [x] [NODE-LOGIC-03] Try/Catch node — catches errors and routes to Error output — [spec](specs/NODE-LOGIC-03.md)
- [x] [NODE-LOGIC-04] Retry node — retries on failure with None/Linear/Exponential backoff; clears upstream memo cache between attempts — [spec](specs/NODE-LOGIC-04.md)
- [x] [NODE-LOGIC-05] Router node — multi-case routing with dynamic case handles and optional default — [spec](specs/NODE-LOGIC-05.md)
- [x] [NODE-LOGIC-06] A/B Split node — weighted routing, weight validator (red if total ≠ 100%) — [spec](specs/NODE-LOGIC-06.md)
- [x] [NODE-LOGIC-07] Language Detect node — routes by ISO 639-3 language code, optional default — [spec](specs/NODE-LOGIC-07.md)
- [x] [NODE-LOGIC-08] Cache node — TTL-based cache hit/miss, formatted TTL display — [spec](specs/NODE-LOGIC-08.md)
- [x] [NODE-LOGIC-09] Semantic Cache node — embedding deduplication, similarity threshold slider — [spec](specs/NODE-LOGIC-09.md)
- [x] [NODE-LOGIC-10] Rate Limiter node — block/delay on quota exceeded, key source (IP/global/custom) — [spec](specs/NODE-LOGIC-10.md)
- [x] [NODE-LOGIC-11] Content Guardrail node — pattern list and optional LLM check, block/flag-and-pass modes — [spec](specs/NODE-LOGIC-11.md)
- [x] [NODE-LOGIC-11b] Content Guardrail node — LLM mode fails open (allows content) if Anthropic API call fails — [spec](specs/NODE-LOGIC-11b.md)
- [x] [NODE-LOGIC-12] Custom Code node — 5-second VM timeout; sandbox exposes only: input, JSON, Math, Number, String, Boolean, Array, Object, Date, parseInt, parseFloat — [spec](specs/NODE-LOGIC-12.md)
- [x] [NODE-LOGIC-12b] Custom Code node — console methods are silenced (no-op); compile errors and runtime errors are distinct — [spec](specs/NODE-LOGIC-12b.md)
- [x] [NODE-LOGIC-13] Merge node — fan-in with First / Join / Object modes; join shows separator, object shows slot keys — [spec](specs/NODE-LOGIC-13.md)
- [x] [NODE-LOGIC-14] Null Check node — fallback input disabled when connected — [spec](specs/NODE-LOGIC-14.md)
- [x] [NODE-LOGIC-15] Sub-Workflow node — executes another workflow, target selected from dropdown — [spec](specs/NODE-LOGIC-15.md)

---

## 21. Nodes — Transform
- [x] [NODE-XFRM-01] String Ops node — UPPER, lower, trim, split (with separator), slice (start/end) — [spec](specs/NODE-XFRM-01.md)
- [x] [NODE-XFRM-02] Regex Replace node — pattern, replacement, flags, live preview with error handling — [spec](specs/NODE-XFRM-02.md)
- [x] [NODE-XFRM-03] Math node — +, −, ×, ÷, %, xⁿ, min, max, abs; live preview in subtitle — [spec](specs/NODE-XFRM-03.md)
- [x] [NODE-XFRM-04] Concat node — string joining with separator, dynamic input count (2–8) — [spec](specs/NODE-XFRM-04.md)
- [x] [NODE-XFRM-05] Array Length node — count array items — [spec](specs/NODE-XFRM-05.md)
- [x] [NODE-XFRM-06] Pick node — extract a key from a JSON object — [spec](specs/NODE-XFRM-06.md)
- [x] [NODE-XFRM-07] Size Of node — character count of a string — [spec](specs/NODE-XFRM-07.md)
- [x] [NODE-XFRM-08] PII Redact node — built-in patterns + custom regex patterns, replacement preset buttons — [spec](specs/NODE-XFRM-08.md)

---

## 22. Nodes — Static
- [x] [NODE-STATIC-01] Text node — static string output, expandable editor — [spec](specs/NODE-STATIC-01.md)
- [x] [NODE-STATIC-02] Number node — fixed value or slider with min/max range — [spec](specs/NODE-STATIC-02.md)
- [x] [NODE-STATIC-03] Boolean node — true/false toggle — [spec](specs/NODE-STATIC-03.md)

---

## 23. Expression Language
- [x] [EXPR-01] `{{ $json }}` resolves to the primary upstream input — [spec](specs/EXPR-01.md)
- [x] [EXPR-02] `{{ $body }}` resolves to the full request body — [spec](specs/EXPR-02.md)
- [x] [EXPR-03] `{{ $node.<id> }}` resolves to upstream node output — [spec](specs/EXPR-03.md)
- [x] [EXPR-04] `{{ $node.<id>.<path.to.key> }}` drills into nested output — [spec](specs/EXPR-04.md)
- [x] [EXPR-05] `{{ $vars.VAR_NAME }}` resolves a customer variable — [spec](specs/EXPR-05.md)
- [x] [EXPR-06] Pure expression (entire string is one block) returns raw value (object/array/number), not stringified — [spec](specs/EXPR-06.md)
- [x] [EXPR-07] Mixed string with unresolvable block (`{{ $node.missing }}`) leaves block literal — [spec](specs/EXPR-07.md)
- [x] [EXPR-08] Path drilling through null/undefined mid-path returns undefined gracefully — [spec](specs/EXPR-08.md)

---

## 24. Workflow Engine Behaviors
- [x] [ENGINE-01] Error edges: main-path consumers receive `{active: false}` when source throws; error-path consumers receive the error object — [spec](specs/ENGINE-01.md)
- [x] [ENGINE-02] Pin data: pinned nodes are skipped entirely; execution trace marks them as `pinned: true` — [spec](specs/ENGINE-02.md)
- [x] [ENGINE-03] Disabled nodes: pass first upstream input through unchanged; trace marks as `disabled: true` — [spec](specs/ENGINE-03.md)
- [x] [ENGINE-04] Sub-workflow recursion depth limit (max 5) — deeper calls return an error object — [spec](specs/ENGINE-04.md)
- [x] [ENGINE-05] Cycle detection: circular node reference throws an error rather than looping — [spec](specs/ENGINE-05.md)
- [x] [ENGINE-06] Error workflow: parent workflow failure triggers the assigned error workflow — [spec](specs/ENGINE-06.md)
- [x] [ENGINE-07] Concurrency: 503 returned when 10 execution slots are full — [spec](specs/ENGINE-07.md)
- [x] [ENGINE-08] Memoization: each node runs at most once per request regardless of how many nodes reference it — [spec](specs/ENGINE-08.md)

---

## 25. API Endpoint (`/api/v1/chat`)
- [x] [API-01] Valid request with active workflow and valid key returns correct response — [spec](specs/API-01.md)
- [x] [API-02] Invalid or missing API key returns 401 — [spec](specs/API-02.md)
- [x] [API-03] Expired API key returns 401 — [spec](specs/API-03.md)
- [x] [API-04] Disabled API key returns 401 — [spec](specs/API-04.md)
- [x] [API-05] Inactive workflow returns appropriate error — [spec](specs/API-05.md)
- [x] [API-06] CORS headers present on all responses — [spec](specs/API-06.md)
- [x] [API-07] OPTIONS preflight returns 204 with correct CORS headers — [spec](specs/API-07.md)
- [x] [API-08] Rate limit exceeded returns 429 — [spec](specs/API-08.md)
- [x] [API-09] Concurrency limit exceeded returns 503 — [spec](specs/API-09.md)
- [x] [API-10] Error workflow is invoked on execution failure — [spec](specs/API-10.md)
- [x] [API-11] GET /api/v1/chat returns `{ok: true, local: true}` health check — [spec](specs/API-11.md)
- [x] [API-12] Binary response served via `/api/binary/[id]` with correct MIME type and Content-Length — [spec](specs/API-12.md)
- [x] [API-13] Response Builder node result: custom status code and headers reflected in HTTP response — [spec](specs/API-13.md)

---

## 26. Security
- [x] [SEC-01] Provider keys and credentials are stored encrypted (AES-GCM + PBKDF2) — [spec](specs/SEC-01.md)
- [x] [SEC-02] Customer variable values are stored encrypted and never returned in GET responses — [spec](specs/SEC-02.md)
- [x] [SEC-03] API key values are masked in all list responses (first 10 + last 4 chars only) — [spec](specs/SEC-03.md)
- [x] [SEC-04] New API key full value is shown only once (one-time reveal banner) — [spec](specs/SEC-04.md)
- [x] [SEC-05] Custom Code node is sandboxed — cannot access Node.js globals or filesystem — [spec](specs/SEC-05.md)
- [x] [SEC-06] Auth Validator node rejects tampered or expired JWTs — [spec](specs/SEC-06.md)
- [x] [SEC-07] Access List node enforces IP/CIDR/value blocklist — blocked request does not reach downstream nodes — [spec](specs/SEC-07.md)
- [x] [SEC-08] Health endpoint (`/api/health`) does not leak sensitive info — [spec](specs/SEC-08.md)
- [x] [SEC-09] No encryption secrets or provider keys present in client-side JS bundles — [spec](specs/SEC-09.md)
- [x] [SEC-10] Expired API keys are rejected at `/api/v1/chat` — [spec](specs/SEC-10.md)

---

## 27. Design & Visual Consistency
- [x] [DESIGN-01] Color palette is consistent across all pages (dark theme applied globally) — [spec](specs/DESIGN-01.md)
- [x] [DESIGN-02] Typography hierarchy is consistent (headings, body, labels) — [spec](specs/DESIGN-02.md)
- [x] [DESIGN-03] Spacing and alignment follow a consistent grid — [spec](specs/DESIGN-03.md)
- [x] [DESIGN-04] Node cards have consistent visual style (header, color bar, handle positions) — [spec](specs/DESIGN-04.md)
- [x] [DESIGN-05] Buttons, inputs, and form elements are visually consistent — [spec](specs/DESIGN-05.md)
- [x] [DESIGN-06] Loading states (spinners, "Creating…" text) present where expected — [spec](specs/DESIGN-06.md)
- [x] [DESIGN-07] Error states have clear, user-friendly messages (not raw stack traces) — [spec](specs/DESIGN-07.md)
- [x] [DESIGN-08] Toast notifications (Sonner) appear for all key actions (create, delete, save, error) — [spec](specs/DESIGN-08.md)
- [x] [DESIGN-09] Responsive layout on narrow viewports — [spec](specs/DESIGN-09.md)
- [x] [DESIGN-10] Icons are consistent in style and size — [spec](specs/DESIGN-10.md)
- [x] [DESIGN-11] Badge colors are consistent (active = green, inactive = gray, expired = red) — [spec](specs/DESIGN-11.md)

---

## 28. Usability & UX
- [x] [UX-01] First-time user can create a workflow and run a debug test without guidance — [spec](specs/UX-01.md)
- [x] [UX-02] Tooltips or labels explain non-obvious controls — [spec](specs/UX-02.md)
- [x] [UX-03] All destructive actions (delete, remove) require explicit confirmation — [spec](specs/UX-03.md)
- [x] [UX-04] Success and error feedback (toasts, inline messages) is timely and descriptive — [spec](specs/UX-04.md)
- [x] [UX-05] Keyboard navigation works for forms, dropdowns, and modals — [spec](specs/UX-05.md)
- [x] [UX-06] Long workflow names are truncated without breaking layout — [spec](specs/UX-06.md)
- [x] [UX-07] Node configuration fields do not retain stale state after switching nodes — [spec](specs/UX-07.md)
- [x] [UX-08] Scrollable areas do not bleed out of their containers — [spec](specs/UX-08.md)
- [x] [UX-09] All copy-to-clipboard buttons give visual feedback — [spec](specs/UX-09.md)
- [x] [UX-10] Config page tabs switch via URL query param (`?tab=`) and survive page refresh — [spec](specs/UX-10.md)
- [x] [UX-11] Drag-to-trash zone appears visually when a node is being dragged — [spec](specs/UX-11.md)
- [x] [UX-12] Node count is visible on the canvas status bar — [spec](specs/UX-12.md)

---

## 29. Edge Cases & Stress
- [x] [EDGE-01] Workflow with only the default input/output nodes executes gracefully — [spec](specs/EDGE-01.md)
- [x] [EDGE-02] Cycle detection: canvas prevents or engine handles circular edges without infinite loop — [spec](specs/EDGE-02.md)
- [x] [EDGE-03] Very large JSON payload (>4KB) in debug panel — trace is truncated with `[truncated]` suffix — [spec](specs/EDGE-03.md)
- [x] [EDGE-04] Node with no connected inputs uses default/fallback values correctly — [spec](specs/EDGE-04.md)
- [x] [EDGE-05] Concurrent debug requests do not corrupt execution state — [spec](specs/EDGE-05.md)
- [x] [EDGE-06] Special characters in workflow names, variable names, and JSON payloads — [spec](specs/EDGE-06.md)
- [x] [EDGE-07] Sub-workflow depth exceeds 5 — returns a clear error without crashing — [spec](specs/EDGE-07.md)
- [x] [EDGE-08] A/B Split node with weights not summing to 100% — UI warns, execution behavior is defined — [spec](specs/EDGE-08.md)
- [x] [EDGE-09] Import of a JSON file with invalid structure shows a clear validation error — [spec](specs/EDGE-09.md)

---

## 30. API Contract — Workflow Management
- [x] [CONTRACT-WF-01] GET /api/workflows returns array with slug and name fields — [spec](specs/CONTRACT-WF-01.md)
- [x] [CONTRACT-WF-02] POST /api/workflows returns `{slug}` with a 10-char nanoid — [spec](specs/CONTRACT-WF-02.md)
- [x] [CONTRACT-WF-03] GET /api/workflows/[slug] returns `{id, name, slug, nodes, isActive}` — [spec](specs/CONTRACT-WF-03.md)
- [x] [CONTRACT-WF-04] GET /api/workflows/[nonexistent-slug] returns 404 — [spec](specs/CONTRACT-WF-04.md)
- [x] [CONTRACT-WF-05] PATCH /api/workflows/[slug] with `name` updates the workflow name — [spec](specs/CONTRACT-WF-05.md)
- [x] [CONTRACT-WF-06] PATCH /api/workflows/[slug] with `nodes`/`edges` creates a version snapshot — [spec](specs/CONTRACT-WF-06.md)
- [x] [CONTRACT-WF-07] PATCH /api/workflows/[slug] with `is_active=true` deactivates all other workflows — [spec](specs/CONTRACT-WF-07.md)
- [x] [CONTRACT-WF-08] PATCH /api/workflows/[slug] with `errorWorkflowId` assigns error workflow — [spec](specs/CONTRACT-WF-08.md)
- [x] [CONTRACT-WF-09] DELETE /api/workflows/[slug] on an inactive workflow returns `{ok: true}` — [spec](specs/CONTRACT-WF-09.md)
- [x] [CONTRACT-WF-10] DELETE /api/workflows/[slug] on an active workflow returns 409 — [spec](specs/CONTRACT-WF-10.md)
- [x] [CONTRACT-WF-11] DELETE /api/workflows/[nonexistent-slug] returns 404 — [spec](specs/CONTRACT-WF-11.md)

---

## 31. API Contract — Debug & Logs
- [x] [CONTRACT-DBG-01] POST /api/workflows/[slug]/debug with valid body returns `{ok, output, traces}` — [spec](specs/CONTRACT-DBG-01.md)
- [x] [CONTRACT-DBG-02] POST /api/workflows/[slug]/debug with `__nodes`/`__edges` overrides saved workflow — [spec](specs/CONTRACT-DBG-02.md)
- [x] [CONTRACT-DBG-03] POST /api/workflows/[slug]/debug with `__startNodeId` performs partial re-run — [spec](specs/CONTRACT-DBG-03.md)
- [x] [CONTRACT-DBG-04] POST /api/workflows/[slug]/debug with `__headers` and `__query` injects into context — [spec](specs/CONTRACT-DBG-04.md)
- [x] [CONTRACT-DBG-05] POST /api/workflows/[nonexistent]/debug returns 404 — [spec](specs/CONTRACT-DBG-05.md)
- [x] [CONTRACT-LOG-01] GET /api/workflows/[slug]/logs returns `{logs: []}` with node-level traces — [spec](specs/CONTRACT-LOG-01.md)
- [x] [CONTRACT-LOG-02] GET /api/workflows/[slug]/logs returns at most 20 entries — [spec](specs/CONTRACT-LOG-02.md)
- [x] [CONTRACT-LOG-03] GET /api/workflows/[nonexistent]/logs returns 404 — [spec](specs/CONTRACT-LOG-03.md)

---

## 32. API Contract — Versions
- [x] [CONTRACT-VER-01] GET /api/workflows/[slug]/versions returns `{versions: []}` with parsed nodes/edges — [spec](specs/CONTRACT-VER-01.md)
- [x] [CONTRACT-VER-02] POST /api/workflows/[slug]/versions with valid `versionId` restores that version — [spec](specs/CONTRACT-VER-02.md)
- [x] [CONTRACT-VER-03] POST /api/workflows/[slug]/versions restores creates a snapshot before restoring — [spec](specs/CONTRACT-VER-03.md)
- [x] [CONTRACT-VER-04] POST /api/workflows/[slug]/versions with invalid `versionId` returns 400 or 404 — [spec](specs/CONTRACT-VER-04.md)
- [x] [CONTRACT-VER-05] Version count is capped at 50 — oldest deleted when limit exceeded — [spec](specs/CONTRACT-VER-05.md)

---

## 33. API Contract — Executions
- [x] [CONTRACT-EXEC-01] GET /api/workflows/[slug]/executions returns `{executions: [], total: n}` — [spec](specs/CONTRACT-EXEC-01.md)
- [x] [CONTRACT-EXEC-02] GET with `?limit=10&offset=0` paginates correctly — [spec](specs/CONTRACT-EXEC-02.md)
- [x] [CONTRACT-EXEC-03] GET with `?limit=999` is capped at 200 — [spec](specs/CONTRACT-EXEC-03.md)
- [x] [CONTRACT-EXEC-04] `total` field reflects the full count, not just the page size — [spec](specs/CONTRACT-EXEC-04.md)

---

## 34. API Contract — Presets
- [x] [CONTRACT-PRESET-01] GET /api/workflows/[slug]/presets returns `{presets: []}` — [spec](specs/CONTRACT-PRESET-01.md)
- [x] [CONTRACT-PRESET-02] POST with valid `{name, body}` creates preset and returns it — [spec](specs/CONTRACT-PRESET-02.md)
- [x] [CONTRACT-PRESET-03] POST with same name upserts (updates) the existing preset — [spec](specs/CONTRACT-PRESET-03.md)
- [x] [CONTRACT-PRESET-04] POST with `body` that is not valid JSON returns 400 — [spec](specs/CONTRACT-PRESET-04.md)
- [x] [CONTRACT-PRESET-05] POST with `name` longer than 100 chars returns 400 — [spec](specs/CONTRACT-PRESET-05.md)
- [x] [CONTRACT-PRESET-06] POST missing `name` returns 400 — [spec](specs/CONTRACT-PRESET-06.md)
- [x] [CONTRACT-PRESET-07] DELETE /api/workflows/[slug]/presets/[id] removes the preset — [spec](specs/CONTRACT-PRESET-07.md)
- [x] [CONTRACT-PRESET-08] DELETE with `id` that belongs to a different workflow returns 404 — [spec](specs/CONTRACT-PRESET-08.md)
- [x] [CONTRACT-PRESET-09] DELETE with non-integer `id` returns 400 — [spec](specs/CONTRACT-PRESET-09.md)

---

## 35. API Contract — Access List
- [x] [CONTRACT-ACL-01] GET /api/workflows/[slug]/access-list returns entries array — [spec](specs/CONTRACT-ACL-01.md)
- [x] [CONTRACT-ACL-02] POST with `rule_type: "value"` creates entry — [spec](specs/CONTRACT-ACL-02.md)
- [x] [CONTRACT-ACL-03] POST with `rule_type: "ip"` creates entry — [spec](specs/CONTRACT-ACL-03.md)
- [x] [CONTRACT-ACL-04] POST with `rule_type: "cidr"` creates entry — [spec](specs/CONTRACT-ACL-04.md)
- [x] [CONTRACT-ACL-05] POST with `rule_type: "header"` creates entry — [spec](specs/CONTRACT-ACL-05.md)
- [x] [CONTRACT-ACL-06] POST with no `rule_type` defaults to `"value"` — [spec](specs/CONTRACT-ACL-06.md)
- [x] [CONTRACT-ACL-07] POST with duplicate value returns 409 — [spec](specs/CONTRACT-ACL-07.md)
- [x] [CONTRACT-ACL-08] POST missing `value` returns 400 — [spec](specs/CONTRACT-ACL-08.md)
- [x] [CONTRACT-ACL-09] DELETE with valid `id` query param removes entry — [spec](specs/CONTRACT-ACL-09.md)
- [x] [CONTRACT-ACL-10] DELETE without `id` query param returns 400 — [spec](specs/CONTRACT-ACL-10.md)

---

## 36. API Contract — Workflow API Keys
- [x] [CONTRACT-AKEY-01] GET /api/workflows/[slug]/api-keys returns keys with masked values (first 10 + last 4) — [spec](specs/CONTRACT-AKEY-01.md)
- [x] [CONTRACT-AKEY-02] POST with valid `label` returns 201 with the full key value — [spec](specs/CONTRACT-AKEY-02.md)
- [x] [CONTRACT-AKEY-03] POST key format is `sk-wf-{uuid}` — [spec](specs/CONTRACT-AKEY-03.md)
- [x] [CONTRACT-AKEY-04] POST with empty `label` returns 400 — [spec](specs/CONTRACT-AKEY-04.md)
- [x] [CONTRACT-AKEY-05] POST with `label` longer than 100 chars returns 400 — [spec](specs/CONTRACT-AKEY-05.md)
- [x] [CONTRACT-AKEY-06] POST with invalid `scopes` value returns 400 — [spec](specs/CONTRACT-AKEY-06.md)
- [x] [CONTRACT-AKEY-07] POST with `rate_limit_override` as a negative number returns 400 — [spec](specs/CONTRACT-AKEY-07.md)
- [x] [CONTRACT-AKEY-08] POST with `expires_at` in the past returns 400 — [spec](specs/CONTRACT-AKEY-08.md)
- [x] [CONTRACT-AKEY-09] PATCH /api/workflows/[slug]/api-keys/[id] updates `label` — [spec](specs/CONTRACT-AKEY-09.md)
- [x] [CONTRACT-AKEY-10] PATCH with `is_active: false` disables the key — [spec](specs/CONTRACT-AKEY-10.md)
- [x] [CONTRACT-AKEY-11] PATCH disabling the last active key returns 409 — [spec](specs/CONTRACT-AKEY-11.md)
- [x] [CONTRACT-AKEY-12] DELETE /api/workflows/[slug]/api-keys/[id] removes the key — [spec](specs/CONTRACT-AKEY-12.md)
- [x] [CONTRACT-AKEY-13] DELETE on the last active key returns 409 — [spec](specs/CONTRACT-AKEY-13.md)
- [x] [CONTRACT-AKEY-14] GET /api/workflows/[slug]/api-keys/[id]/stats returns 30-day metrics with exactly 30 daily entries — [spec](specs/CONTRACT-AKEY-14.md)
- [x] [CONTRACT-AKEY-15] GET /[id]/stats for a key that belongs to a different workflow returns 404 — [spec](specs/CONTRACT-AKEY-15.md)

---

## 37. API Contract — Workflow Credentials
- [x] [CONTRACT-WCRED-01] GET /api/workflows/[slug]/credentials returns node assignment array — [spec](specs/CONTRACT-WCRED-01.md)
- [x] [CONTRACT-WCRED-02] POST with valid `{nodeId, credentialId}` creates assignment — [spec](specs/CONTRACT-WCRED-02.md)
- [x] [CONTRACT-WCRED-03] POST missing `nodeId` returns 400 — [spec](specs/CONTRACT-WCRED-03.md)
- [x] [CONTRACT-WCRED-04] POST missing `credentialId` returns 400 — [spec](specs/CONTRACT-WCRED-04.md)
- [x] [CONTRACT-WCRED-05] DELETE with valid `nodeId` query param removes assignment — [spec](specs/CONTRACT-WCRED-05.md)
- [x] [CONTRACT-WCRED-06] DELETE without `nodeId` query param returns 400 — [spec](specs/CONTRACT-WCRED-06.md)

---

## 38. API Contract — Workflow Provider Keys
- [x] [CONTRACT-WPKEY-01] POST /api/workflows/[slug]/provider-keys with valid `{provider, key}` stores encrypted key — [spec](specs/CONTRACT-WPKEY-01.md)
- [x] [CONTRACT-WPKEY-02] POST with same provider upserts (overwrites) existing key — [spec](specs/CONTRACT-WPKEY-02.md)
- [x] [CONTRACT-WPKEY-03] POST missing `provider` returns 400 — [spec](specs/CONTRACT-WPKEY-03.md)
- [x] [CONTRACT-WPKEY-04] POST missing `key` returns 400 — [spec](specs/CONTRACT-WPKEY-04.md)
- [x] [CONTRACT-WPKEY-05] DELETE with valid `provider` query param removes key — [spec](specs/CONTRACT-WPKEY-05.md)
- [x] [CONTRACT-WPKEY-06] DELETE without `provider` query param returns 400 — [spec](specs/CONTRACT-WPKEY-06.md)

---

## 39. API Contract — Workflow Variables
- [x] [CONTRACT-WVAR-01] GET /api/workflows/[slug]/variables returns names only — values are never returned — [spec](specs/CONTRACT-WVAR-01.md)
- [x] [CONTRACT-WVAR-02] POST with valid UPPER_SNAKE_CASE name creates encrypted variable — [spec](specs/CONTRACT-WVAR-02.md)
- [x] [CONTRACT-WVAR-03] POST with same name upserts (overwrites) existing variable — [spec](specs/CONTRACT-WVAR-03.md)
- [x] [CONTRACT-WVAR-04] POST with lowercase name returns 400 — [spec](specs/CONTRACT-WVAR-04.md)
- [x] [CONTRACT-WVAR-05] POST with name starting with a digit returns 400 — [spec](specs/CONTRACT-WVAR-05.md)
- [x] [CONTRACT-WVAR-06] POST with spaces in name returns 400 — [spec](specs/CONTRACT-WVAR-06.md)
- [x] [CONTRACT-WVAR-07] POST missing `value` returns 400 — [spec](specs/CONTRACT-WVAR-07.md)
- [x] [CONTRACT-WVAR-08] DELETE with valid `name` query param removes variable — [spec](specs/CONTRACT-WVAR-08.md)
- [x] [CONTRACT-WVAR-09] DELETE without `name` query param returns 400 — [spec](specs/CONTRACT-WVAR-09.md)

---

## 40. API Contract — Global Credentials
- [x] [CONTRACT-GCRED-01] GET /api/credentials returns full credentials list — [spec](specs/CONTRACT-GCRED-01.md)
- [x] [CONTRACT-GCRED-02] POST with valid `{name, type, key}` returns credential with `id` — [spec](specs/CONTRACT-GCRED-02.md)
- [x] [CONTRACT-GCRED-03] POST missing `name` returns 400 — [spec](specs/CONTRACT-GCRED-03.md)
- [x] [CONTRACT-GCRED-04] POST missing `type` returns 400 — [spec](specs/CONTRACT-GCRED-04.md)
- [x] [CONTRACT-GCRED-05] POST missing `key` returns 400 — [spec](specs/CONTRACT-GCRED-05.md)
- [x] [CONTRACT-GCRED-06] DELETE with valid `id` query param removes credential — [spec](specs/CONTRACT-GCRED-06.md)
- [x] [CONTRACT-GCRED-07] DELETE with non-integer `id` returns 400 — [spec](specs/CONTRACT-GCRED-07.md)

---

## 41. API Contract — Global Provider Keys
- [x] [CONTRACT-GPKEY-01] POST /api/provider-keys with valid `{provider, key}` stores encrypted key — [spec](specs/CONTRACT-GPKEY-01.md)
- [x] [CONTRACT-GPKEY-02] POST with same provider upserts (overwrites) existing key — [spec](specs/CONTRACT-GPKEY-02.md)
- [x] [CONTRACT-GPKEY-03] POST missing `provider` returns 400 — [spec](specs/CONTRACT-GPKEY-03.md)
- [x] [CONTRACT-GPKEY-04] POST missing `key` returns 400 — [spec](specs/CONTRACT-GPKEY-04.md)
- [x] [CONTRACT-GPKEY-05] DELETE with valid `provider` query param removes key — [spec](specs/CONTRACT-GPKEY-05.md)
- [x] [CONTRACT-GPKEY-06] DELETE without `provider` query param returns 400 — [spec](specs/CONTRACT-GPKEY-06.md)

---

## 42. API Contract — Account & System
- [x] [CONTRACT-ACCT-01] POST /api/account/api-key returns `{key}` with `sk-mw-` prefix — [spec](specs/CONTRACT-ACCT-01.md)
- [x] [CONTRACT-ACCT-02] POST /api/account/api-key is idempotent — repeated calls return the same key — [spec](specs/CONTRACT-ACCT-02.md)
- [x] [CONTRACT-ACCT-03] GET /api/health returns `{status: "ok", uptime, timestamp}` — [spec](specs/CONTRACT-ACCT-03.md)
- [x] [CONTRACT-ACCT-04] POST /api/complexity with valid prompt returns `{embeddingScore}` and `X-Layer: embedding` header — [spec](specs/CONTRACT-ACCT-04.md)
- [x] [CONTRACT-ACCT-05] POST /api/complexity with empty prompt returns `{embeddingScore: null}` — [spec](specs/CONTRACT-ACCT-05.md)
- [x] [CONTRACT-ACCT-06] GET /api/binary/[valid-id] returns binary data with correct `Content-Type` and `Content-Length` — [spec](specs/CONTRACT-ACCT-06.md)
- [x] [CONTRACT-ACCT-07] GET /api/binary/[nonexistent-id] returns 404 — [spec](specs/CONTRACT-ACCT-07.md)

---

## 43. API Endpoint — Webhook (Inbound `/api/webhooks/[slug]`)
- [x] [WEBHOOK-01] Valid POST on an active workflow executes and returns `{ok, output}` — [spec](specs/WEBHOOK-01.md)
- [x] [WEBHOOK-02] Token accepted via `x-webhook-secret` header — [spec](specs/WEBHOOK-02.md)
- [x] [WEBHOOK-03] Token accepted via `?token=` query param — [spec](specs/WEBHOOK-03.md)
- [x] [WEBHOOK-04] Missing/invalid token returns 401 (when token set) — [spec](specs/WEBHOOK-04.md)
- [x] [WEBHOOK-05] Token check precedes active check (inactive+token → 401, no state leak) — [spec](specs/WEBHOOK-05.md)
- [x] [WEBHOOK-06] Unknown slug returns 404; inactive workflow returns 403 — [spec](specs/WEBHOOK-06.md)
- [x] [WEBHOOK-07] Non-JSON body wrapped as `{body}`; empty body → `{}` — [spec](specs/WEBHOOK-07.md)
- [x] [WEBHOOK-08] POST/GET/PUT/PATCH execute; OPTIONS returns 204 with CORS — [spec](specs/WEBHOOK-08.md)
- [x] [WEBHOOK-09] Response Builder custom status/headers/body honored — [spec](specs/WEBHOOK-09.md)
- [x] [WEBHOOK-10] Oversized body returns 413; concurrency full returns 503 — [spec](specs/WEBHOOK-10.md)
- [x] [WEBHOOK-11] Webhook node "trigger" mode surfaces copyable inbound URL — [spec](specs/WEBHOOK-11.md)

---

## 44. API Contract — Admin Backup (`/api/admin/backup`)
- [x] [CONTRACT-BACKUP-01] GET with valid management key downloads the DB (octet-stream + Content-Disposition + Content-Length) — [spec](specs/CONTRACT-BACKUP-01.md)
- [x] [CONTRACT-BACKUP-02] GET with missing/invalid management key returns 401 — [spec](specs/CONTRACT-BACKUP-02.md)
- [x] [CONTRACT-BACKUP-03] GET returns 401 when no management key is configured — [spec](specs/CONTRACT-BACKUP-03.md)

---

## 45. Request Body Limit (413)
- [x] [LIMIT-01] `/api/v1/chat` rejects oversized body with 413 (before auth) — [spec](specs/LIMIT-01.md)
- [x] [LIMIT-02] `/api/webhooks/[slug]` rejects oversized body with 413 — [spec](specs/LIMIT-02.md)
- [x] [LIMIT-03] `/api/workflows/[slug]/debug` rejects oversized body with 413 — [spec](specs/LIMIT-03.md)
- [x] [LIMIT-04] Body-cap boundary (exactly `limit` OK, `+1` rejected) and `SOOKET_MAX_BODY_BYTES` override — [spec](specs/LIMIT-04.md)

---

*Total items: 301*
