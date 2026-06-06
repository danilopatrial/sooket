---
id: NODE-AI-04
title: Token Counter node uses GPT tokenizer not Claude tokenizer
severity: low
source_files:
  - components/canvas/nodes/TokenCounterNode.tsx
  - lib/nodes/token-counter.ts
---

## What this tests
Verifies that the Token Counter node uses the GPT tokenizer (`gpt-tokenizer`) for both its canvas live-preview and its execution output, and that the node header clearly labels this so users understand counts may diverge from actual Claude token usage.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Token Counter node exists on the canvas

## Steps
1. Navigate to the canvas containing a Token Counter node
2. Observe the node header: it should display the title **Token Counter** and the subtitle **count tokens via GPT tokenizer**
3. In the **Test Prompt** field on the node body, type any text (e.g. `Hello, world!`)
4. Observe the large numeric readout below the separator line — it should update immediately (no save/run required) to show the token count as a violet monospace integer
5. Clear the Test Prompt field — the readout must revert to **–––** (three dashes)
6. Open the Debug panel, wire the Token Counter node into the workflow so it receives a text input, and send a test request with body `{"message": "Hello, world!"}`
7. Expand the Token Counter node trace row in the execution result
8. Verify the output value is an integer (the token count of the input text), not a string and not the original text

## Expected result
- Node header subtitle reads exactly: **count tokens via GPT tokenizer**
- Live preview in Test Prompt field updates synchronously as text is typed, showing a violet integer token count
- Empty Test Prompt shows **–––** instead of a count
- Execution output is an integer representing the GPT-tokenized count of the connected input text
- The count is based on the `gpt-tokenizer` library; for the same text, it may differ from the token count reported by the Anthropic API

## Failure indicators
- Node header subtitle does not mention "GPT tokenizer" (or mentions "Claude tokenizer")
- Live preview does not update as text is typed in the Test Prompt field
- Execution output is a string, undefined, or the original input text rather than an integer
- Token count is always zero regardless of input

## Severity rationale
Using GPT tokenization for Claude workloads is a known approximation; incorrect counts are misleading but not service-breaking, making this low severity.

## Source reference
`components/canvas/nodes/TokenCounterNode.tsx` line 7 (`import { encode } from "gpt-tokenizer"`), line 37 (`setTokenCount(encode(testPrompt).length)`), line 62 (subtitle: "count tokens via GPT tokenizer"); `lib/nodes/token-counter.ts` line 4 (`import { encode as gptEncode } from "gpt-tokenizer"`) and line 15 (`value: gptEncode(text).length`).

## Notes
The live preview on the canvas (Test Prompt) is independent of the execution path — it runs client-side in the browser using the same `gpt-tokenizer` library. The test prompt value is not passed to the executor; execution reads from the connected `input` handle only.
