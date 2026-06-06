---
id: NODE-LOGIC-11b
title: Content Guardrail LLM mode fails open on API failure
severity: high
source_files:
  - lib/nodes/content-guardrail.ts
---

## What this tests
Verifies that the Content Guardrail node's LLM check fails open — content is allowed through without flagging — when the Anthropic API call fails due to a network error, a non-200 response, or an unparseable JSON response body.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Content Guardrail node configured in LLM mode exists on the canvas
- The Debug panel is accessible
- Ability to simulate API failure (e.g. an invalid Anthropic API key that returns a 4xx, or a network proxy)

## Steps — fail open: non-ok HTTP response

1. Configure the Content Guardrail node: no patterns, **LLM Check** enabled, rules `"- No harmful content"`, action **Block output**
2. Set the Anthropic provider key to an invalid value (e.g. `"sk-invalid"`) so the API returns a 4xx error
3. Connect a test input and open the Debug panel; send a request
4. Verify the node does **not** throw an error; instead:
   - `output` = original input value (content passes through)
   - `flagged` = `active: false`
5. Verify the execution trace shows no LLM-sourced violation message

## Steps — fail open: unparseable LLM response

6. Restore a valid Anthropic API key
7. Modify the `llmRules` to something that causes the model to respond with non-JSON (though this is hard to force deterministically — see Notes)
8. If the LLM returns text that cannot be parsed as `{"violation":boolean,"reason":string}`, the node must fail open: content passes, `flagged` = `active: false`

## Steps — fail open: network error

9. Temporarily block network access to `api.anthropic.com` (e.g. via `/etc/hosts` or a firewall rule) while the node is configured in LLM mode
10. Send a request — the fetch call throws a network error
11. Verify the node completes without an exception: `output` = original input value; `flagged` = `active: false`

## Steps — does NOT fail open: missing API key

12. Remove the Anthropic provider key from the workflow entirely (not an invalid key — actually absent)
13. Send a request with LLM check enabled — this should **throw** an error: **Content Guardrail (LLM mode): no Anthropic API key configured for this workflow**
14. Verify this is distinct from fail-open: a missing key is an explicit error, not a silent pass-through

## Expected result
- Non-ok HTTP response from Anthropic API: fail open (content passes; `flagged` inactive)
- Unparseable or non-JSON response body: fail open (content passes; `flagged` inactive)
- Network exception during fetch: fail open (content passes; `flagged` inactive)
- Missing Anthropic API key: throws error (does NOT fail open)
- Pattern matching (not LLM) is unaffected by any of these cases

## Failure indicators
- Non-ok API response causes node to throw or return `active: false` unexpectedly
- Network error causes unhandled exception propagating to the workflow
- Missing API key silently passes content instead of throwing
- LLM check runs even when `llmRules` is empty (should be skipped)

## Severity rationale
Failing closed on LLM API errors would silently block all content when the API is down, breaking every workflow that uses this node; the fail-open design is intentional and must be preserved.

## Source reference
`lib/nodes/content-guardrail.ts` lines 52 (LLM check guard: `!violation && useLlm && llmRules.trim()`), lines 54 (throws on missing key — NOT fail open), lines 62-98 (try/catch around the fetch: line 76 checks `if (llmRes.ok)` — non-ok responses silently skipped; line 92-94 catches JSON parse errors — fail open; lines 96-98 outer catch — network errors fail open).

## Notes
The LLM check is skipped entirely when `llmRules.trim()` is empty, preventing unnecessary API calls. The fail-open behavior applies only to the LLM check — pattern matches always block/flag regardless of API availability. Simulating an unparseable response is difficult in a live test; the most practical test is the network error or invalid-key (non-ok response) path.
