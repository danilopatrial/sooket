# Build

Before writing a single line of code, produce a **TODO list** covering every discrete task required to complete `$ARGUMENTS`. Each item must be scoped small enough that it can be implemented, tested, and verified independently before moving on.

---

## Mandatory execution protocol

Work through the TODO list **one item at a time**, strictly in order. For each item:

1. **Implement** — write the minimum code needed to satisfy that item only.
2. **Test edge cases** — before marking the item done, explicitly identify and test:
   - Empty / null / zero inputs
   - Boundary values (min, max, off-by-one)
   - Invalid types or malformed data
   - Concurrent or repeated calls where relevant
   - Any failure path the code is expected to handle
3. **Verify** — run the code (or the relevant test) and confirm it passes.
4. **Fix & repeat** — if any edge case fails or an error surfaces, fix it completely and re-run verification before moving to the next item. Do not carry broken code forward.
5. **Ensure** - Make sure the developed feature or snippet is working properly with the whole codebase.
6. **Check off** — only mark the item as finished after it is verified clean.

---

## Constraints

- **No skipping ahead.** Do not begin item N+1 while item N is unverified.
- **No silent assumptions.** If a requirement is ambiguous, state the assumption explicitly before implementing.
- **No placeholder code.** Every function, class, and module written must be functional and tested — no `pass`, `TODO`, or `...` left in delivered code.
- **Errors are blockers.** Any unhandled exception, failed assertion, or broken edge case stops progress until resolved.
- **Summarise after each item.** One-line confirmation: what was done, what was tested, result.

---

## Deliverable

When all items are checked off, provide:
- Final summary of what was built
- List of edge cases that were caught and fixed during the process
- Any known limitations or assumptions that were made explicit