# Seed Data Reference

Created on 2026-06-03. Use these when specs require pre-existing workflows.
The execution loop reads this file at the start of every iteration to get the QA Harness slug.

## Workflows

### QA Harness — `vKuroqe70F`
The primary test workflow. Recreated 2026-06-05 (original `3v7MOhFbXR` was accidentally deleted during DESIGN-07 testing).
Configured with:
- Text node → Output node
- 1 API key: `sk-wf-cb2e...faec`
- 1 preset: "Basic test"
- 1 variable: `TEST_VAR = hello-world`
- 1 access list entry: `192.168.1.1` (ip, label: "Test IP")

---

### `aymm3I1iSz` — Full workflow (Input → Anthropic → Output)
- Has nodes: workflowInput, anthropic, workflowOutput
- Has 1 API key: `sk-wf-e41b...3171` (id: 516)
- Has 1 preset: "Basic test"
- Has 1 variable: `TEST_VAR`
- Has 1 access list entry: `192.168.1.1` (ip, label: "Test IP")
- Debug runs: 1 (failed — no Anthropic key, expected)
- Canvas URL: http://localhost:3000/workflow/aymm3I1iSz
- Config URL: http://localhost:3000/workflow/aymm3I1iSz/config

### `3v7MOhFbXR` — Simple workflow (Text → Output)
- Has nodes: workflowInput, text, workflowOutput
- Has 1 API key (auto-created)
- Has 4 successful debug executions (log history populated)
- Canvas URL: http://localhost:3000/workflow/3v7MOhFbXR
- Config URL: http://localhost:3000/workflow/3v7MOhFbXR/config

## Notes
- Neither workflow is set to `is_active=true` — activate one before testing API endpoint tests (API-01 etc.)
- Anthropic node tests require a real provider key — add one via the Provider Keys tab first
- The simple workflow (`3v7MOhFbXR`) is the safest for most canvas and config tab tests
