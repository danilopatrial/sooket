---
id: NODE-AI-03
title: Anthropic node max output tokens hardcoded to 8192
severity: low
source_files:
  - components/canvas/nodes/AnthropicNode.tsx
  - lib/nodes/anthropic.ts
---

## What this tests
Verifies that the Anthropic node sends `max_tokens: 8192` to the Anthropic API and that no UI control exists to override this value.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with an Anthropic node and a connected userPrompt input exists
- An Anthropic provider key is configured for the workflow
- The Debug panel is accessible

## Steps
1. Navigate to the canvas for the workflow and click the Anthropic node to inspect its configuration panel
2. Confirm there is no "Max tokens", "Max output tokens", or similar field visible anywhere on the node body
3. Open the Debug panel (click the bug/debug icon in the canvas toolbar)
4. In the Sandbox tab, enter a JSON body that provides a user message, e.g. `{"message": "Say hello"}`
5. Click **Run** to execute the workflow
6. After execution completes, expand the Anthropic node's trace row in the execution result
7. Inspect the raw output — the Anthropic API response will include a `usage` object; verify the `output_tokens` value is ≤ 8192
8. To confirm the payload, open browser DevTools → Network tab, re-run the debug request, and locate the call to `POST /api/workflows/[slug]/debug`; inspect the response's node trace to confirm no `max_tokens` override beyond 8192

## Expected result
- The Anthropic node UI contains no field for configuring max output tokens
- All executions allow the model up to 8192 output tokens (`max_tokens: 8192` is always sent in the Anthropic API request)
- The execution trace's `outputTokens` field never exceeds 8192

## Failure indicators
- A "Max tokens" or similar input field appears on the Anthropic node
- The Anthropic API call includes a `max_tokens` value other than 8192

## Severity rationale
8192 is the standard output ceiling for Haiku and Sonnet and avoids silently truncating long responses. Severity is low because the value is intentional and matches Anthropic's recommended default.

## Source reference
`lib/nodes/anthropic.ts` line 67 — `max_tokens: 8192` set unconditionally in `anthropicPayload`; `components/canvas/nodes/AnthropicNode.tsx` — no max_tokens field rendered anywhere in the component body.

## Notes
This is a deliberate product constraint. 8192 covers the output window of all current Claude models (Haiku, Sonnet, Opus). The spec verifies the constant is enforced, not that it is user-configurable.
