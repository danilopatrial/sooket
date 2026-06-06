# Spec File Template

Every spec file in `specs/` must follow this exact structure.
File name must match the checklist item ID exactly (e.g. `CANVAS-14.md`).

---

```markdown
---
id: ITEM-ID
title: Short descriptive title (max 10 words)
severity: critical | high | medium | low
source_files:
  - relative/path/to/file.ts
  - relative/path/to/another/file.tsx
---

## What this tests
One sentence. State the specific behavior being verified — not the feature in general.

## Prerequisites
- App is running at http://localhost:3000
- [Any specific data state needed, e.g. "At least one workflow exists"]
- [Any specific UI state, e.g. "Debug panel is open"]

## Steps
1. Navigate to [exact URL, e.g. `/workflow` or `/workflow/test-slug/config?tab=api-keys`]
2. [Exact action — be specific: "Click the 'New Workflow' button in the top right"]
3. [Next action]
4. [Continue until the behavior under test is triggered]

## Expected result
Describe precisely what should happen when the behavior works correctly:
- What the UI shows
- What the API returns (if testing an endpoint)
- What does NOT happen (if testing a guard/block)

## Failure indicators
- [Specific observable symptom that means the test failed]
- [Another failure indicator — be concrete, not vague]

## Severity rationale
[One sentence explaining why this severity was chosen]

## Source reference
[Exact file path and the specific behavior/line that defines this expectation]
Example: `lib/nodes/content-guardrail.ts` — `failsOpen` flag set to true in catch block

## Notes
[Optional: caveats, environment-specific behavior, known quirks, or things the agent should watch out for]
```

---

## Severity guide

| Severity | When to use |
|---|---|
| critical | App crashes, data loss, security breach, or core workflow execution broken |
| high | Feature doesn't work at all, or wrong behavior that would block a user |
| medium | Feature works but with a notable flaw, edge case failure, or missing feedback |
| low | Visual inconsistency, minor UX gap, or cosmetic issue |
