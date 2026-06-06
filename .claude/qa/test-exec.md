# QA Execution Loop Prompt

You are executing QA tests for the Sooket webapp, one checklist item per loop iteration.
Each iteration is fully self-contained — you read the spec, gather context, test the behavior, record findings, and update the checklist. You never rely on prior iteration memory.

---

## Step 1 — Load the test workflow context

Before anything else, read the seed data file to get the slug of the QA Harness workflow:
```
/home/apollo/Sooket/.claude/qa/seed-data.md
```

Find the entry named **"QA Harness"** and note its slug. Every test that requires a pre-existing workflow must use this slug. Use its canvas URL (`http://localhost:3000/workflow/[slug]`) and config URL (`http://localhost:3000/workflow/[slug]/config`) throughout the test steps.

If the seed data file has no "QA Harness" entry, stop and output:
> BLOCKED: QA Harness workflow not found in seed-data.md. Ask the user to create it and update the file.

---

## Step 2 — Ensure the dev server is running

Check if the app is already running:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

If the response is NOT `200`, start it:
```bash
npm --prefix /home/apollo/Sooket run dev
```
Run it in the background and wait 5 seconds before proceeding.

---

## Step 3 — Find the next item to test

Read the checklist:
```
/home/apollo/Sooket/.claude/qa/checklist.md
```

Find the first item with status `[ ]` (pending). Skip items marked `[x]`, `[!]`, or `[-]`.

Note the item ID (e.g. `CANVAS-14`) and its description.

---

## Step 4 — Read the spec file

Read the spec for that item:
```
/home/apollo/Sooket/.claude/qa/specs/[ITEM-ID].md
```

If the spec file does not exist, mark the item `[-]` (skipped) in the checklist with a note "no spec file" and go back to Step 2 for the next item.

From the spec, extract:
- **Prerequisites** — set these up before testing
- **Steps** — the exact actions to perform
- **Expected result** — what correct behavior looks like
- **Failure indicators** — what to watch for

---

## Step 5 — Execute the test

Choose the right tool based on what the spec tests:

### For UI tests (canvas, panels, config tabs, forms, navigation)

Use Puppeteer. Run a Node.js script via Bash:

```bash
node -e "
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  // --- YOUR TEST STEPS HERE ---
  await page.goto('http://localhost:3000[PATH]');
  await page.waitForSelector('[SELECTOR]', { timeout: 5000 });
  // interact, screenshot, observe...
  await page.screenshot({ path: '/tmp/qa-[ITEM-ID].png' });

  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
"
```

After running, read the screenshot:
```
/tmp/qa-[ITEM-ID].png
```

For complex interactions, break into multiple Puppeteer scripts rather than one large one.

### For API tests (API-*, SEC-* that test endpoints)

Use curl:
```bash
curl -s -X POST http://localhost:3000/api/[path] \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [key-if-needed]" \
  -d '{"key": "value"}' | jq .
```

Compare the response to the expected result in the spec.

### For execution engine tests (ENGINE-*, EXPR-*)

Set up a minimal workflow via the API, execute it via the debug endpoint, and inspect the trace:
```bash
# Create a workflow
SLUG=$(curl -s -X POST http://localhost:3000/api/workflows \
  -H "Content-Type: application/json" | jq -r '.slug')

# Run debug execution
curl -s -X POST http://localhost:3000/api/workflows/$SLUG/debug \
  -H "Content-Type: application/json" \
  -d '{"message": "test input"}' | jq .
```

### For node tests (NODE-*)

Use the debug panel via Puppeteer, or directly via the debug API endpoint with a crafted workflow JSON containing just the node under test.

---

## Step 6 — Evaluate the result

Compare what you observed against the spec's **Expected result** and **Failure indicators**.

**Pass** — behavior exactly matches the expected result, no failure indicators triggered.

**Fail** — one or more failure indicators are present, or expected result was not observed.

**Warning** — behavior mostly correct but with a notable gap (e.g. missing feedback, slightly wrong output).

If you cannot complete a test (e.g. Puppeteer can't find an element, the workflow state is missing), note it as a **blocker** and describe what prevented the test.

---

## Step 7 — Record findings (if any)

If the result is **fail**, **warning**, or **blocker**, append to the findings file:
```
/home/apollo/Sooket/.claude/qa/findings.md
```

Use this exact format:

```markdown
---

## [ITEM-ID] — [Short title from spec]

- **Status**: fail | warning | blocker
- **Severity**: critical | high | medium | low  ← copy from spec
- **Date**: 2026-06-03

### What was observed
[Describe exactly what happened — what was seen, what the API returned, what the screenshot shows]

### Expected
[Copy the expected result from the spec]

### Failure indicator triggered
[Which specific failure indicator from the spec was triggered]

### Steps to reproduce
1. [Exact step]
2. [Exact step]

### Screenshot
[`/tmp/qa-[ITEM-ID].png` if applicable]

### Notes
[Any additional context — environment state, suspected cause, related items]
```

If the result is **pass**, do not write anything to findings.md.

---

## Step 8 — Update the checklist

Open `/home/apollo/Sooket/.claude/qa/checklist.md` and update the item's status:

- Pass → `[x]`
- Fail or Warning → `[!]`
- Skipped (no spec, can't test) → `[-]`

Change only the status bracket for that single item. Do not edit anything else in the file.

---

## Step 9 — Stop

After completing exactly one checklist item, stop.
The loop will re-invoke you and you will repeat from Step 1.

---

## Rules

- **Never skip Step 3.** Always read the spec before testing. Never test from memory.
- **Never assume UI element names.** If unsure what a button or field is called, take a screenshot first and look.
- **Never mark `[x]` unless you actually ran the test.** If you couldn't test it, use `[-]`.
- **One item per iteration.** Do not process multiple items in a single run.
- **Keep findings concrete.** "Button does nothing" is better than "UX issue detected."
- **If Puppeteer is not installed**, run `npm install puppeteer --no-save` in the project root before using it.
