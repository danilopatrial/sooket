---
id: NODE-AI-09
title: OpenAI node calls an OpenAI-compatible chat API
severity: high
source_files:
  - lib/nodes/openai.ts
  - components/canvas/nodes/OpenAINode.tsx
  - components/canvas/nodes/registry.ts
  - lib/nodes/registry.ts
---

## What this tests
Verifies that the OpenAI node sends an OpenAI `/chat/completions` request to a configurable base URL (default `https://api.openai.com/v1`), authenticates with the workflow's `openai` provider key, builds the system/history/user message array, and returns the assistant text plus token usage. Because it speaks the OpenAI-compatible shape, the same node also targets Together / Groq / OpenRouter and local servers (Ollama, LM Studio) by changing the base URL.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with an OpenAI node on the canvas, its `userPrompt` handle fed by an upstream value, and `output` reaching the Output node
- An `openai` provider key configured (Config → Provider Keys), or a local OpenAI-compatible server running

## Steps — canvas
1. Add the **OpenAI** node (AI category, emerald, "GPT & OpenAI-compatible"). Confirm:
   - a **Model** text input (default `gpt-4o-mini`),
   - a **Base URL** text input (default `https://api.openai.com/v1`),
   - a **System Prompt** field, a **Temperature** slider (0–2),
   - input handles `model`, `systemPrompt`, `temperature`, `history`, `userPrompt` and an `output` handle.
2. Edit the model / base URL / system prompt / temperature and confirm the values persist (onChange updates the node data).

## Steps — execution (OpenAI)
3. With an `openai` provider key set, connect a Text node ("Say hi in 3 words") to `userPrompt` and run via Debug. Confirm the node returns the model's text on `output`, and the execution log records input/output tokens.

## Steps — OpenAI-compatible (local) endpoint
4. Set **Base URL** to a local server, e.g. `http://localhost:11434/v1` (Ollama) and **Model** to a local model (e.g. `llama3`). Run. Confirm the request goes to `http://localhost:11434/v1/chat/completions` and a completion returns. (Local/loopback targets are allowed for the provider node; the SSRF egress guard applies to HTTP Request / Webhook nodes, not the LLM provider base URL.)

## Steps — missing key / errors
5. Remove the `openai` provider key and run → the node errors with "No OpenAI API key configured for this workflow".
6. With an invalid key, the upstream 401 is surfaced as `Upstream provider error: ...`.
7. Run with the `userPrompt` empty → "OpenAI node: user message is empty".

## Expected result
- Request: `POST {baseURL}/chat/completions` with `Authorization: Bearer <openai key>`, body `{ model, messages, temperature }`; trailing slashes on the base URL are trimmed.
- `messages` is `[system?, ...history, user]` — the system message is included only when a system prompt is set; valid `{role,content}` history entries (user/assistant) are forwarded.
- Response: returns `choices[0].message.content` as the value, with `prompt_tokens` / `completion_tokens` as input/output token counts.
- Connected `model` / `systemPrompt` / `temperature` handles override the configured values.
- Missing key, upstream error, and empty user message each produce a clear thrown error.

## Failure indicators
- The request omits the `Authorization: Bearer` header or hits the wrong path.
- A double slash appears in the URL (`/v1//chat/completions`) from an untrimmed base URL.
- The system message is sent even when the system prompt is empty.
- Token usage is not surfaced.
- Changing the base URL does not change the request target (local/compatible endpoints unusable).

## Severity rationale
Multi-provider support is a core capability gap; an LLM-middleware locked to a single vendor can't serve most real pipelines. A broken provider node blocks the entire AI use case for non-Anthropic users.

## Source reference
`lib/nodes/openai.ts` — reads the `openai` provider key via `ctx.getProviderKey("openai")`, resolves model/systemPrompt/temperature (with handle overrides) and `baseURL` (default `https://api.openai.com/v1`, trailing slash trimmed), builds `[system?, ...history, user]`, POSTs `{model, messages, temperature}` to `{baseURL}/chat/completions`, and returns `choices[0].message.content` + `usage.prompt_tokens`/`completion_tokens`. Registered in `lib/nodes/registry.ts` (`"openai": { 1: openai }`) and `components/canvas/nodes/registry.ts`.

## Notes
The node is OpenAI-compatible, so it also covers Together, Groq, OpenRouter, and local Ollama/LM Studio via the base URL. Unlike the Anthropic node (top-level `system` field), OpenAI carries the system prompt as the first message. The SSRF egress guard (SEC-14) is intentionally not applied to this node's base URL — pointing at a local model is a primary use case, and the base URL is author configuration rather than a request-body value. Code-level coverage: `__tests__/lib/nodes/http-nodes.test.ts` ("openai executor") and `__tests__/nodes/OpenAINode.test.tsx`.
