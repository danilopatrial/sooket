# Sooket Documentation

Sooket is a visual API middleware platform: build a workflow on a canvas and
expose it as a live HTTP endpoint that runs **in the request path** and returns
the result to the caller. It runs as a single Next.js process against a local
SQLite file — no cloud, no external services.

These guides cover getting Sooket running and calling it. They are intentionally
basic; per-node reference docs and example workflows will land here as the
project matures.

## Guides

- **[Getting started](getting-started.md)** — install, first run, and the
  example workflow that ships on a fresh install.
- **[Configuration](configuration.md)** — environment variables and where data
  is stored.
- **[API usage](api-usage.md)** — call a workflow over `POST /api/v1/chat`,
  manage `sk-wf-*` keys, and the instance management key.
- **[Webhooks](webhooks.md)** — the token-gated `/api/webhooks/[slug]` endpoint.

For the full architecture, node catalogue, and database schema, see
[AGENTS.md](../AGENTS.md) in the repo root.
