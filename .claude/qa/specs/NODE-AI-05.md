---
id: NODE-AI-05
title: Complexity node returns score, tier, and signal chips
severity: medium
source_files:
  - components/canvas/nodes/ComplexityNode.tsx
  - lib/nodes/complexity.ts
---

## What this tests
Verifies that the Complexity Score node displays a live 0–1 score, a tier badge (simple/medium/complex), and heuristic signal chips in the canvas preview, and that execution emits the score via the `score` handle and the tier string via the `tier` handle.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Complexity Score node exists on the canvas

## Steps
1. Navigate to the canvas containing a Complexity Score node
2. Observe the node header: title **Complexity Score**, subtitle **score prompt 0 – 1**, amber gauge icon
3. Confirm the node has one left-side input handle (**prompt**) and two right-side output handles labeled **score (0–1)** and **tier**
4. In the **Test Prompt** field, type a short simple phrase (e.g. `Hello`)
5. Wait up to 300 ms — observe the large numeric score (3 decimal places, e.g. `0.123`) appear in emerald/green color, a **simple** tier badge (green pill), a token count line (e.g. `2 tokens`), and zero or more amber signal chips under **Signals**
6. Clear the field and type a longer, technically complex prompt (e.g. a multi-step reasoning question with code)
7. Observe the score increase; if it enters the ambiguous band (roughly 0.25–0.70), the header briefly shows **scoring…** in amber while the embedding API is called, then the method indicator switches from **(heuristic)** to **(embedding)**
8. Observe the tier badge changes color and label: **simple** = green, **medium** = amber, **complex** = red
9. Clear the Test Prompt — score reverts to **–.–––** and tier shows **no input**
10. Open the Debug panel, wire the Complexity Score node so its `prompt` input is connected, and send a test request with a simple input
11. Expand the Complexity Score node trace row — the output on the `score` handle must be a number between 0 and 1; the output on the `tier` handle must be one of `simple`, `medium`, or `complex`

## Expected result
- Canvas live preview: score displayed as 3-decimal monospace float with color coding (emerald < 0.45, amber 0.45–0.70, red ≥ 0.70)
- Tier badge displayed as an uppercase pill: **SIMPLE** (emerald), **MEDIUM** (amber), or **COMPLEX** (red)
- Heuristic signals appear as small amber chips under the **Signals** label when present
- Token count displayed as `N tokens` in muted mono text below the score
- Empty input shows **–.–––** score and **no input** label
- Execution: `score` handle outputs a float 0–1; `tier` handle outputs the string `simple`, `medium`, or `complex`

## Failure indicators
- Score display does not update after typing in the Test Prompt field
- Tier badge is absent or shows a value other than simple/medium/complex
- Signal chips section is missing entirely (it should be absent only when there are no signals, not always)
- Execution trace shows the score or tier handle output is undefined or a non-numeric/non-string value
- Score color does not change as the score crosses the 0.45 and 0.70 thresholds

## Severity rationale
The Complexity Score node drives routing decisions in multi-tier LLM pipelines; incorrect tier output would send traffic to the wrong downstream node.

## Source reference
`components/canvas/nodes/ComplexityNode.tsx` lines 22-31 (tier/score color mapping), lines 186-231 (score, tier, token count, and signals display); `lib/nodes/complexity.ts` lines 18-33 (heuristic + embedding blending, dual handle output).

## Notes
The "scoring…" loading state and method indicator (`(heuristic)` vs `(embedding)`) are canvas-only UI elements — they do not appear in execution traces. The scoring debounce on the canvas is 300 ms (line 123 of `ComplexityNode.tsx`).
