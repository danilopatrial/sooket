# Findings Executor

You are fixing one open finding from the QA findings log per loop iteration.
Each iteration is fully self-contained — you read the finding, diagnose the root cause, implement the fix, verify it, and close the finding. You never rely on prior iteration memory.

---

## Step 1 — Pick the next open finding

Read the findings file:
```
/home/apollo/Sooket/.claude/qa/findings.md
```

Scan every entry (separated by `---`). Select the **first** entry whose `**Status**` field is `fail`, `warning`, or `blocker` (i.e. not `fixed`).

Note the **ITEM-ID** (e.g. `API-03`) and the short title.

If no open finding exists, output:
> All findings are resolved. Nothing to do.

Then stop.

---

## Step 2 — Load the spec

Read the spec for that item:
```
/home/apollo/Sooket/.claude/qa/specs/[ITEM-ID].md
```

Extract:
- **Source files** listed under `source_files:` in the frontmatter — these are the primary suspects
- **Expected result** — the exact behaviour the code must produce
- **Failure indicators** — the specific symptoms that were observed
- **Steps to reproduce** — the exact sequence that triggers the bug

Also re-read the **"What was observed"** and **"Notes"** sections from the finding entry so you understand what the QA run actually saw.

---

## Step 3 — Read the source and understand the defect

Read every file listed in `source_files` in full. Then read any directly related files (e.g. types, helpers, db schema) that those files import or that the spec references.

Reason through the code against the expected behaviour. Identify the exact line(s) or logic gap that produces the observed failure. State your diagnosis explicitly before touching any file:

> **Root cause:** [One or two sentences naming the file, function, and the specific incorrect behaviour.]

If you cannot locate a plausible root cause after reading the source files, widen the search — grep for the relevant symbol names, read callers, read tests — before giving up.

---

## Step 4 — Plan the fix

Produce a numbered TODO list. Each item must be:
- Scoped to a single logical change (one function, one branch, one schema tweak)
- Small enough to implement and verify independently
- Ordered so later items never depend on unfinished earlier ones

Do not begin implementation until the list is written.

---

## Step 5 — Implement, one item at a time

Work through the TODO list strictly in order. For each item:

1. **Implement** — write the minimum change needed. No refactoring beyond the scope of the fix.
2. **Check types** — if TypeScript is involved, ensure the change compiles cleanly. Run:
   ```bash
   npx tsc --noEmit 2>&1 | head -40
   ```
3. **Run the full test suite** — after every item:
   ```bash
   npm --prefix /home/apollo/Sooket test 2>&1 | tail -30
   ```
   All tests must pass before moving to the next item. If a test fails, fix it completely first — do not carry a broken test forward.
4. **Check off** — mark the item done (both in the checklist.md and in the findings.md) and summarise in one line: what changed, what was tested, result.

**Constraints:**
- No `any` types. No `as` casts outside test code. Follow the TypeScript rules in AGENTS.md.
- No placeholder code. Every changed function must be complete and correct.
- No silent regressions. If adding a fix requires updating an existing test, update it and confirm it still tests the right behaviour.
- No scope creep. Fix only what the finding describes. Do not clean up nearby code unrelated to the defect.

---

## Step 6 — Verify the fix against the spec

Ensure the dev server is running:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

If the response is not `200`, start it:
```bash
npm --prefix /home/apollo/Sooket run dev &
sleep 5
```

Replay the **Steps to reproduce** from the spec exactly as written. Use the same tool the spec implies (curl for API specs, Puppeteer for UI specs). Compare the actual result against **Expected result** from the spec line by line.

If the observed behaviour now matches the expected result, the fix is confirmed. If it does not, return to Step 3 — your diagnosis was incomplete. Do not mark the finding fixed until the spec's expected result is fully satisfied.

---

## Step 7 — Run the full test suite one final time

```bash
npm --prefix /home/apollo/Sooket test 2>&1 | tail -40
```

Every test must pass. If a pre-existing test fails that was passing before your changes, revert or correct your change until the suite is green again. The fix is not done until the suite is clean.

---

## Step 8 — Close the finding

Open `/home/apollo/Sooket/.claude/qa/findings.md`.

Locate the entry for this ITEM-ID and update **only** the `**Status**` line and append a `**Fixed**` line immediately after it:

```markdown
- **Status**: fixed
- **Fixed**: YYYY-MM-DD — [One sentence describing what was changed and why it resolves the failure]
```

Do not alter any other content in the entry.

---

## Step 9 — Update the checklist

Open `/home/apollo/Sooket/.claude/qa/checklist.md`.

Find the line for this ITEM-ID. Change its status bracket from `[!]` to `[x]`.

Change only that bracket. Do not edit anything else in the file.

---

## Step 10 — Commit the fix

Stage only the files you changed as part of the fix (do not use `git add -A`):

```bash
git -C /home/apollo/Sooket add <file1> <file2> ...
```

Also stage the updated QA files:
```bash
git -C /home/apollo/Sooket add .claude/qa/findings.md .claude/qa/checklist.md
```

Commit with a message that identifies the finding ID and describes what was fixed:

```bash
git -C /home/apollo/Sooket commit -m "$(cat <<'EOF'
fix([ITEM-ID]): [one-line description of what was wrong and how it was fixed]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

If the commit is rejected by a pre-commit hook, fix the reported issue, re-stage the affected files, and commit again. Do not use `--no-verify`.

---

## Step 11 — Stop

Output a one-paragraph summary:
- What the defect was
- What was changed to fix it
- How many tests passed after the fix
- Confirmation that the spec's expected result is now observed

Then stop. The loop will re-invoke you and you will repeat from Step 1 on the next open finding.

---

## Rules

- **Never skip Step 3.** Read the source before writing a single character of fix code.
- **Never skip Step 7.** The test suite must be green before closing any finding.
- **Never Push Any Code** Only commit following the template at AGENTS.md.
- **One finding per iteration.** Do not process multiple findings in a single run.
- **No `TODO` or `...` in delivered code.** Every changed function must be complete.
- **Never mark `fixed` unless Step 6 confirmed the expected result is observed.**
- **If Puppeteer is needed and not installed**, run `npm install puppeteer --no-save` in the project root before using it.
- **If the fix requires a DB migration**, apply it via the schema init in `lib/db/index.ts` — never run raw `ALTER TABLE` against the live database file.


## Safety Harness (permissions are skipped — you are the last line of defense)

You may be running with --dangerously-skip-permissions. No human will review
your actions before they execute. Therefore:

**Before any destructive or wide-reaching action:**
- NEVER run: `rm -rf`, `git push --force`, `git reset --hard`, `git clean -fd`,
  bulk file deletions, or DB migrations/drops — unless I explicitly requested
  that exact action in this conversation.
- NEVER modify files outside the project root.
- NEVER touch: `.env*`, credentials, lockfiles, or CI/CD configs unless the
  task explicitly requires it. If it does, state what you're changing and why
  before doing it.

**Before editing existing code:**
- Read the file and its callers/imports first. Do not edit code you haven't read.
- Prefer the smallest diff that accomplishes the task. No drive-by refactors,
  renames, or "improvements" outside the requested scope.

**After editing:**
- Verify your change compiles/passes: run the type checker, linter, or relevant
  tests before declaring done.
- If verification fails, fix it or report the failure — never leave the codebase
  in a broken state silently.

**When uncertain:**
- If an action is irreversible or its blast radius is unclear, stop and ask
  instead of proceeding.