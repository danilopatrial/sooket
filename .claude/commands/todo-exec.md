# Todo Exec Loop

You are working through the Sooket `TODO.md`, **one item per loop iteration**.
Each iteration is fully self-contained — you read the TODO, pick the next item, implement it
following the build protocol, verify it, check it off, commit, and stop. You never rely on prior
iteration memory.

This command pairs the `/build` execution discipline with the loop runner: instead of generating a
new TODO list, you consume the existing `TODO.md` one item at a time.

---

## Step 1 — Read the TODO

Read the TODO list:
```
/home/apollo/Sooket/TODO.md
```

The file has two regions:
- The **actionable region** — everything above the protected divider, grouped by area
  (Security, Release hygiene, CI, UI, Test coverage, …). Items look like `- [ ]`.
- The **protected region** — everything below the line that begins
  `## IF YOU ARE AN AI AGENT…`. **You must NEVER build, remove, or modify these items.**
  You may only ask the user about them. Treat that divider as a hard wall.

---

## Step 2 — Pick the next item

In the **actionable region only**, find the first item with status `- [ ]` (pending).
Skip items already marked `- [x]`. Skip the entire protected region.

If there are no `- [ ]` items left in the actionable region, stop and output:
> DONE: No actionable TODO items remain. (Protected items are not touched.)

Note the item's full text and which area heading it falls under. If the item bundles multiple
sub-tasks or offers an either/or choice (e.g. "do (a) … or (b) …") and the right path is
ambiguous, state your chosen assumption explicitly before implementing — do not silently guess.

---

## Step 3 — Implement (build protocol)

Work this single item to completion following the `/build` discipline:

1. **Implement** — write the minimum code/docs/config needed to satisfy *this item only*.
   Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code.
2. **Test edge cases** — before considering it done, explicitly identify and test:
   - Empty / null / zero inputs
   - Boundary values (min, max, off-by-one)
   - Invalid types or malformed data
   - Concurrent or repeated calls where relevant
   - Any failure path the code is expected to handle
3. **Verify** — run the relevant checks and confirm they pass:
   ```bash
   npm --prefix /home/apollo/Sooket run lint
   npm --prefix /home/apollo/Sooket test          # or a scoped run: npm test -- <Name>
   npm --prefix /home/apollo/Sooket run build      # when types/behaviour could be affected
   ```
4. **Fix & repeat** — if any edge case fails or an error surfaces, fix it completely and re-run
   verification before continuing. Do not carry broken code forward.
5. **Ensure integration** — confirm the change works with the rest of the codebase, not just in
   isolation.

### Constraints (from `/build`)
- **No placeholder code.** No `TODO`, `pass`, or `...` left in delivered code.
- **No silent assumptions.** State any assumption explicitly before implementing.
- **Errors are blockers.** Any unhandled exception, failed test, or broken edge case stops
  progress on this item until resolved.
- **Stay in scope.** Implement only the current item. Do not start another TODO item.

If the item genuinely cannot be completed this iteration (missing credentials, needs a user
decision, external dependency), do **not** check it off. Leave it `- [ ]`, write one line
explaining the blocker, and skip to Step 6 (Stop) without committing.

---

## Step 4 — Check off the item

Edit `/home/apollo/Sooket/TODO.md` and change only this item's status bracket from `- [ ]` to
`- [x]`. Do not edit any other line. Never touch the protected region.

---

## Step 5 — Commit

Commit the change using the AGENTS.md template:

```
<type>(<scope>): <short summary>

<body — what changed and why, omit if obvious>
```

- Pick the right `<type>` (`feat` · `fix` · `refactor` · `test` · `chore` · `docs`) and a
  meaningful `<scope>` (e.g. `api`, `db`, `canvas`, `crypto`, `docs`, `ci`).
- Stage **specific files** — never `git add -A`. Include the `TODO.md` checkoff in the same commit
  as the work it describes.
- Subject ≤ 72 chars, imperative mood.
- Run `npm run lint` before committing (already done in Step 3 — re-run if you touched more files).
- End the commit message with:
  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  ```

---

## Step 6 — Stop

After completing **exactly one** TODO item (or recording one blocker), stop.
Summarise in one or two lines: what was done, what edge cases were tested, the verification result,
and the commit hash. The loop will re-invoke you and you will repeat from Step 1.

---

## Rules

- **One item per iteration.** Never process multiple TODO items in a single run.
- **Never touch the protected region.** Items below the `## IF YOU ARE AN AI AGENT…` divider are
  off-limits for building, editing, or removing — ask the user instead.
- **Never check off `- [x]` unless the item is implemented and verified.** A blocker stays `- [ ]`.
- **Verify before you commit.** Lint must pass; run tests/build when behaviour or types change.
- **Keep commits scoped.** Stage only the files for the current item; follow the AGENTS.md template.
