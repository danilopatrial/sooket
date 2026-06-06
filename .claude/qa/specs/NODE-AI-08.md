---
id: NODE-AI-08
title: Prompt Compression node compresses input via Haiku
severity: high
source_files:
  - components/canvas/nodes/PromptCompressionNode.tsx
  - lib/nodes/prompt-compression.ts
---

## What this tests
Verifies that the Prompt Compression node calls `claude-haiku-4-5-20251001` to summarize its input, respects the configurable compression prompt and optional target-word limit, and returns the compressed text as its output.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Prompt Compression node exists on the canvas
- An Anthropic provider key is configured for the workflow
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a Prompt Compression node
2. Observe the node header: title **Prompt Compression**, subtitle **compress via Haiku · saves tokens**, violet Minimize2 icon
3. Confirm one left-side input handle labeled **input** and one right-side handle labeled **output**
4. Observe the **Compression Prompt** field — default text should be: `Summarize the following concisely, preserving all key information:`
5. Observe the **Target Words** field — labeled **Target Words — optional**, placeholder `e.g. 150`, empty by default
6. Enter `150` in the Target Words field and verify it is accepted (numeric, min 1, step 10)
7. Clear the Target Words field — value should revert to empty (null), not zero

## Steps — execution

8. Wire the Prompt Compression node so it receives a long text input (e.g. several paragraphs from a Text node)
9. Open the Debug panel and send a test request
10. Expand the Prompt Compression node trace row — the output value must be a string shorter than the input, representing the Haiku-generated summary
11. If Target Words was set to `150`, the compression prompt sent to Haiku will end with `in under 150 words.` — verify the output is noticeably shorter
12. Verify the trace shows non-zero `inputTokens` and `outputTokens` (accumulated from the Haiku API call)
13. Remove the Anthropic provider key from the workflow, re-run — expect an error: `Prompt Compression: no Anthropic API key configured for this workflow`
14. Disconnect the input handle and re-run (with key restored) — expect an error: `Prompt Compression node has no input connected`

## Expected result
- Node always calls `claude-haiku-4-5-20251001` with `max_tokens: 2048` (model is hardcoded)
- Compression prompt defaults to `Summarize the following concisely, preserving all key information:`
- When Target Words is set to N: the instruction sent to Haiku is `<compressionPrompt> in under N words.`
- When Target Words is empty: the instruction is just the compression prompt, no word-count suffix
- Output is the compressed text string returned by Haiku
- Token counts in the trace reflect the Haiku API usage added to any upstream tokens

## Failure indicators
- Output is identical to the input (no compression occurred)
- Output is undefined or empty for a non-empty input
- Error is thrown when a valid Anthropic key is configured and input is connected
- Target Words field accepts zero or negative values
- Trace shows zero input/output tokens after a successful Haiku call

## Severity rationale
This node is used to reduce token costs before calling a more expensive model; failure silently passes uncompressed (large) text downstream, directly increasing API costs.

## Source reference
`lib/nodes/prompt-compression.ts` lines 35-38 (hardcoded `claude-haiku-4-5-20251001`, `max_tokens: 2048`), lines 23-25 (target-words instruction suffix); `components/canvas/nodes/PromptCompressionNode.tsx` lines 9-10 (default compression prompt), lines 113-130 (Target Words numeric input, min 1, step 10).

## Notes
The model used for compression (`claude-haiku-4-5-20251001`) is hardcoded in the executor and is not configurable via the node UI. The node requires the same Anthropic provider key as the Anthropic node.
