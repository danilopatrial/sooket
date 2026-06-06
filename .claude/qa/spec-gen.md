# Spec Generation Loop Prompt

You are generating QA spec files for the Sooket webapp, one per loop iteration.
Each spec must be grounded in actual source code — never assume behavior, always read the file first.

---

## Your job each iteration

1. Find the next spec to write
2. Read the source files for that spec
3. Write the spec file
4. Stop — the loop will re-invoke you for the next one

---

## Step 1 — Find the next spec to write

Read the checklist:
```
/home/apollo/Sooket/.claude/qa/checklist.md
```

Then list the files already written:
```
ls /home/apollo/Sooket/.claude/qa/specs/
```

Find the first checklist item whose spec file does not yet exist in `specs/`.
The spec file name is the item ID (e.g. checklist item `[CANVAS-14]` → `specs/CANVAS-14.md`).
IDs with letters like `NODE-LOGIC-11b` → filename `NODE-LOGIC-11b.md`.

That item is your target for this iteration. Note its ID and description.

---

## Step 2 — Read the source files

**Do not write anything yet.**

Use the source file guide below to find which files to read for your target item.
Read those files in full before writing a single word of the spec.
If a file path looks wrong or doesn't exist, use `find` to locate the correct path.

### Source file guide by item prefix

**NAV-***
- Read the relevant page file in `app/(main)/` or `app/(main)/(auth)/`
- Read `app/(main)/layout.tsx`

**DASH-***
- `app/(main)/workflow/page.tsx`
- `components/workflow/WorkflowList.tsx`
- `components/workflow/NewWorkflowButton.tsx`
- `app/api/workflows/route.ts`

**CANVAS-***
- `components/canvas/WorkflowCanvas.tsx`
- If sidebar related: `components/canvas/NodeSidebar.tsx`
- If search related: `components/canvas/NodeSearchMenu.tsx`
- If TextExpandModal: `components/canvas/TextExpandModal.tsx`

**DEBUG-***
- `components/canvas/DebugPanel.tsx`
- `app/api/workflows/[slug]/debug/route.ts`
- If preset related: `app/api/workflows/[slug]/presets/route.ts`

**HIST-***
- `components/canvas/HistoryPanel.tsx`
- `app/api/workflows/[slug]/versions/route.ts`

**CFG-GEN-***
- `components/workflow-config/GeneralTab.tsx`
- `app/api/workflows/[slug]/route.ts`

**CFG-KEY-***
- `components/workflow-config/ApiKeysTab.tsx`
- `components/workflow-config/KeyDashboardPanel.tsx`
- `app/api/workflows/[slug]/api-keys/route.ts`
- `app/api/workflows/[slug]/api-keys/[id]/route.ts`
- `app/api/workflows/[slug]/api-keys/[id]/stats/route.ts`

**CFG-CRED-***
- `components/workflow-config/CredentialsTab.tsx`
- `app/api/workflows/[slug]/credentials/route.ts`
- `app/api/credentials/route.ts`

**CFG-PROV-***
- `components/workflow-config/ProviderKeysTab.tsx`
- `app/api/workflows/[slug]/provider-keys/route.ts`

**CFG-VAR-***
- `components/workflow-config/VariablesTab.tsx`
- `app/api/workflows/[slug]/variables/route.ts`

**CFG-ACL-***
- `components/workflow-config/AccessListTab.tsx`
- `app/api/workflows/[slug]/access-list/route.ts`

**CFG-EXEC-***
- `components/workflow-config/ExecutionsTab.tsx`
- `app/api/workflows/[slug]/executions/route.ts`

**ACCT-***
- `app/(main)/account/page.tsx`
- `app/api/account/api-key/route.ts`

**VARFIELD-***
- `components/canvas/VarField.tsx`

**NODE-INPUT-***
- `lib/nodes/workflow-input.ts`
- `components/canvas/nodes/registry.ts` (for handle definitions)

**NODE-AI-***
- Identify the node name from the checklist description
- Read `components/canvas/nodes/[NodeComponent].tsx`
- Read the execution file in `lib/nodes/[node-name].ts`
- Node → file mapping:
  - Anthropic → `AnthropicNode.tsx` + `lib/nodes/anthropic.ts`
  - Token Counter → `TokenCounterNode.tsx` + `lib/nodes/token-counter.ts`
  - Complexity → `ComplexityNode.tsx` + `lib/nodes/complexity.ts`
  - Sentiment → `SentimentNode.tsx` + `lib/nodes/sentiment.ts`
  - Prompt Compression → `PromptCompressionNode.tsx` + `lib/nodes/prompt-compression.ts`

**NODE-REQ-***
- Output → `OutputNode.tsx` (no execution file — graph terminator)
- Response Builder → `ResponseBuilderNode.tsx` + `lib/nodes/response-builder.ts`
- List Manager → `ListManagerNode.tsx` + `lib/nodes/list-manager.ts`
- Access List → `AccessListNode.tsx` + `lib/nodes/access-list.ts`
- Auth Validator → `AuthValidatorNode.tsx` + `lib/nodes/auth-validator.ts`

**NODE-EXT-***
- HTTP Request → `HttpRequestNode.tsx` + `lib/nodes/http-request.ts`
- Vector Search → `VectorSearchNode.tsx` + `lib/nodes/vector-search.ts`
- Vector Upsert → `VectorUpsertNode.tsx` + `lib/nodes/vector-upsert.ts`
- Webhook → `WebhookNode.tsx` + `lib/nodes/webhook.ts`

**NODE-FMT-***
- JSON Parser → `JsonParserNode.tsx` + `lib/nodes/json-parser.ts`
- JSON Builder → `JsonBuilderNode.tsx` + `lib/nodes/json-builder.ts`
- XML↔JSON → `XmlJsonNode.tsx` + `lib/nodes/xml-json.ts`
- Template String → `TemplateStringNode.tsx` + `lib/nodes/template-string.ts`
- Type Cast → `TypeCastNode.tsx` + `lib/nodes/type-cast.ts`
- DateTime → `DateTimeNode.tsx` + `lib/nodes/datetime.ts`

**NODE-LOGIC-***
- If → `IfNode.tsx` + `lib/nodes/if.ts`
- Try/Catch → `TryCatchNode.tsx` + `lib/nodes/try-catch.ts`
- Retry → `RetryNode.tsx` + `lib/nodes/retry.ts`
- Router → `RouterNode.tsx` + `lib/nodes/router.ts`
- A/B Split → `ABSplitNode.tsx` + `lib/nodes/ab-split.ts`
- Language Detect → `LanguageDetectNode.tsx` + `lib/nodes/language-detect.ts`
- Cache → `CacheNode.tsx` + `lib/nodes/cache.ts`
- Semantic Cache → `SemanticCacheNode.tsx` + `lib/nodes/semantic-cache.ts`
- Rate Limiter → `RateLimiterNode.tsx` + `lib/nodes/rate-limiter.ts`
- Content Guardrail → `ContentGuardrailNode.tsx` + `lib/nodes/content-guardrail.ts`
- Custom Code → `CustomCodeNode.tsx` + `lib/nodes/custom-code.ts`
- Merge → `MergeNode.tsx` + `lib/nodes/merge.ts`
- Null Check → `NullCheckNode.tsx` + `lib/nodes/null-check.ts`
- Sub-Workflow → `SubWorkflowNode.tsx` + `lib/nodes/sub-workflow.ts`

**NODE-XFRM-***
- String Ops → `StringOpsNode.tsx` + `lib/nodes/string-ops.ts`
- Regex Replace → `RegexReplaceNode.tsx` + `lib/nodes/regex-replace.ts`
- Math → `MathNode.tsx` + `lib/nodes/math.ts`
- Concat → `ConcatNode.tsx` + `lib/nodes/concat.ts`
- Array Length → `ArrayLengthNode.tsx` + `lib/nodes/array-length.ts`
- Pick → `PickNode.tsx` + `lib/nodes/pick.ts`
- Size Of → `SizeOfNode.tsx` + `lib/nodes/size-of.ts`
- PII Redact → `PiiRedactNode.tsx` + `lib/nodes/pii-redact.ts`

**NODE-STATIC-***
- Text → `TextNode.tsx` (no execution file — static value)
- Number → `NumberNode.tsx` (no execution file — static value)
- Boolean → `BooleanNode.tsx` (no execution file — static value)

**EXPR-***
- `lib/expr.ts` (read in full)

**ENGINE-***
- `lib/workflow-engine.ts` (read the relevant section, not the whole file — use offset/limit)
- For ENGINE-01 (error edges): search for `__error__` in the file
- For ENGINE-02 (pin data): search for `pinData` in the file
- For ENGINE-03 (disabled nodes): search for `disabled` in the file
- For ENGINE-04 (recursion): search for `depth` or `maxDepth` in the file
- For ENGINE-05 (cycle detection): search for `visiting` in the file
- For ENGINE-06 (error workflow): search for `errorWorkflowId` in the file
- For ENGINE-07 (concurrency): read `lib/concurrency.ts`
- For ENGINE-08 (memoization): search for `evalCache` in the file

**API-***
- `app/api/v1/chat/route.ts` (read in full)
- For binary: also read `lib/binary-data.ts`

**SEC-***
- SEC-01, SEC-02: `lib/crypto.ts`
- SEC-03, SEC-04, SEC-08: `app/api/workflows/[slug]/api-keys/route.ts`
- SEC-05: `lib/nodes/custom-code.ts`
- SEC-06: `lib/nodes/auth-validator.ts`
- SEC-07: `app/api/workflows/[slug]/access-list/route.ts`
- SEC-08: `app/api/health/route.ts`
- SEC-09: `next.config.ts` or `next.config.js`
- SEC-10: `app/api/v1/chat/route.ts`

**DESIGN-* and UX-***
- Read the primary component for the area described
- Also read `app/layout.tsx` for global styles

**EDGE-***
- `lib/workflow-engine.ts` (relevant section)
- Plus any node execution file relevant to the edge case

**CONTRACT-WF-***
- `app/api/workflows/route.ts`
- `app/api/workflows/[slug]/route.ts`

**CONTRACT-DBG-***
- `app/api/workflows/[slug]/debug/route.ts`

**CONTRACT-LOG-***
- `app/api/workflows/[slug]/logs/route.ts`

**CONTRACT-VER-***
- `app/api/workflows/[slug]/versions/route.ts`

**CONTRACT-EXEC-***
- `app/api/workflows/[slug]/executions/route.ts`

**CONTRACT-PRESET-***
- `app/api/workflows/[slug]/presets/route.ts`
- `app/api/workflows/[slug]/presets/[id]/route.ts`

**CONTRACT-ACL-***
- `app/api/workflows/[slug]/access-list/route.ts`

**CONTRACT-AKEY-***
- `app/api/workflows/[slug]/api-keys/route.ts`
- `app/api/workflows/[slug]/api-keys/[id]/route.ts`
- `app/api/workflows/[slug]/api-keys/[id]/stats/route.ts`

**CONTRACT-WCRED-***
- `app/api/workflows/[slug]/credentials/route.ts`

**CONTRACT-WPKEY-***
- `app/api/workflows/[slug]/provider-keys/route.ts`

**CONTRACT-WVAR-***
- `app/api/workflows/[slug]/variables/route.ts`

**CONTRACT-GCRED-***
- `app/api/credentials/route.ts`

**CONTRACT-GPKEY-***
- `app/api/provider-keys/route.ts`

**CONTRACT-ACCT-***
- `app/api/account/api-key/route.ts`
- `app/api/health/route.ts`
- `app/api/complexity/route.ts`
- `lib/binary-data.ts`
- `app/api/binary/[id]/route.ts`

**Note for all CONTRACT-* specs:** Steps must use `curl` directly against `http://localhost:3000` — not UI interactions. Each step is an HTTP request with a specific method, headers, and body. Expected result is the HTTP status code and response JSON shape.

---

## Step 3 — Write the spec

After reading the source files, write the spec to:
```
/home/apollo/Sooket/.claude/qa/specs/[ITEM-ID].md
```

Use this exact structure — do not deviate:

```markdown
---
id: ITEM-ID
title: Short descriptive title (max 10 words)
severity: critical | high | medium | low
source_files:
  - relative/path/to/file.ts
---

## What this tests
One sentence describing the specific behavior being verified.

## Prerequisites
- App is running at http://localhost:3000
- [Any specific data or UI state required]

## Steps
1. Navigate to [exact URL]
2. [Exact action]
3. [Next action]
...

## Expected result
[Precise description of what correct behavior looks like]

## Failure indicators
- [Concrete symptom that means the test failed]
- [Another failure indicator]

## Severity rationale
[One sentence explaining the severity choice]

## Source reference
[Exact file path — the specific code that defines this expected behavior]

## Notes
[Optional caveats or environment-specific details]
```

### Rules for writing specs

- **Every claim must come from a file you read in Step 2.** If you did not read it, do not write it.
- **Steps must name exact UI elements** (button labels, field names, tab names) as they appear in the component source — not guessed names.
- **Expected result must be specific** — "the button turns green" not "the UI updates".
- **Failure indicators must be observable** — something the agent can see or measure, not an internal state.
- **Do not reference other spec files.** Each spec is self-contained.
- **Do not invent behavior.** If the source file is ambiguous, write "Verify in source: [file]" in Notes rather than guessing.
- **Severity follows the guide in `spec-template.md`.**
- Source files listed in frontmatter must be paths that actually exist — verify with `ls` if unsure.

---

## Step 4 — Stop

After writing exactly one spec file, stop. Do not write another.
The loop will re-invoke you and you will repeat from Step 1 for the next item.

Do not modify `checklist.md`. Progress is tracked by which spec files exist in `specs/`.
