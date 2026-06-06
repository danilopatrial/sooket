---
id: NODE-AI-07
title: Sentiment node score, label, and routing handles
severity: medium
source_files:
  - components/canvas/nodes/SentimentNode.tsx
  - lib/nodes/sentiment.ts
---

## What this tests
Verifies that the Sentiment node outputs a −1…+1 score and a label via dedicated handles, routes the original input value through the matching `positive`, `neutral`, or `negative` handle, and shows a live canvas preview with word chips and configurable thresholds.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Sentiment node exists on the canvas
- For execution steps: the node has its `input` handle connected and the workflow is testable via the Debug panel

## Steps — canvas live preview

1. Navigate to the canvas containing a Sentiment node
2. Observe the node header: title **Sentiment**, subtitle **score text −1 → +1**, rose SmilePlus icon
3. Confirm five right-side output handles are visible, labeled in the **Outputs** section: **score (−1…+1)**, **label**, **positive →**, **neutral →**, **negative →**
4. In the **Test Text** field, type a clearly positive phrase (e.g. `I love this, it is absolutely wonderful!`)
5. Verify immediately (no debounce delay):
   - Score is a green (emerald) signed float with `+` prefix and 3 decimal places (e.g. `+0.450`)
   - Label badge shows **POSITIVE** in a green pill
   - Word count line reads `N scored words`
   - Green `+word` chips appear for positive AFINN words; red `−word` chips for any negative words found
6. Clear the field and type a negative phrase (e.g. `This is terrible, awful, and I hate it`)
7. Verify: score is red with a `−` prefix, label badge shows **NEGATIVE** in red
8. Clear the field — score reverts to **±.–––** and label shows **no input**
9. In the **Thresholds** section, confirm two numeric inputs: **Positive ≥** (default `0.05`) and **Negative ≤** (default `-0.05`); change **Positive ≥** to `0.50` and observe that a previously borderline-positive text may shift to **NEUTRAL**

## Steps — execution routing

10. Open the Debug panel; ensure the Sentiment node's `input` is connected to a text source and each routing handle (`positive`, `neutral`, `negative`) is connected to distinct Output nodes (or observed in the trace)
11. Send a test request with a positive text input
12. Expand the Sentiment trace row — `score` handle output is a number, `label` handle output is `"positive"`, `positive` handle passes the original input value through, `neutral` and `negative` handles return `{active: false}`
13. Repeat with a neutral text (e.g. `The box is on the table`) — `neutral` handle passes through, `positive` and `negative` are inactive
14. Repeat with a negative text — `negative` handle passes through, others are inactive

## Expected result
- Canvas: signed score (−1…+1, 3 decimals), colored label badge (emerald/white/red), word chips with `+`/`−` prefixes, configurable positive/negative thresholds
- Empty input: score shows `±.–––`, label shows `no input`
- Execution: `score` = float, `label` = string `"positive"` | `"neutral"` | `"negative"`
- Routing handles pass the **original input value** through on match; return `active: false` on mismatch
- Disconnected `input` handle throws an error (node requires a connected input)

## Failure indicators
- Score does not update immediately when Test Text is typed
- Label badge color does not match sentiment (e.g. POSITIVE shown in red)
- Word chips absent for text with clear AFINN hits
- Routing handles all pass through simultaneously (only the matching one should be active)
- `score` or `label` handles return `undefined` or `active: false` during normal execution
- Threshold changes have no effect on the resulting label

## Severity rationale
Incorrect routing handle activation would silently send content to the wrong downstream branch, corrupting pipeline logic.

## Source reference
`components/canvas/nodes/SentimentNode.tsx` lines 25-50 (output handle definitions and color mapping), lines 159-199 (score/label/word-chips display), lines 203-239 (threshold inputs); `lib/nodes/sentiment.ts` lines 25-33 (per-handle routing logic).

## Notes
The `positive`, `neutral`, and `negative` handles pass the **original upstream input value** (not the score) through to the next node — they act as conditional routers, not value transformers. Only one of the three routing handles will be active per execution.
