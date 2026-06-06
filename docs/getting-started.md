# Getting started

## Prerequisites

- **Node ≥ 22** — Sooket uses the built-in `node:sqlite` module, which is only
  available from Node 22 onward. Check yours with `node -v`.
- **npm** — the project standardizes on npm (not pnpm or yarn). It ships with
  Node, so installing Node covers this too.

### Installing or upgrading Node

If `node -v` prints nothing, or a version below `v22`, install or upgrade first.

**macOS / Linux** — the simplest path is [nvm](https://github.com/nvm-sh/nvm):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# reopen your terminal, then:
nvm install 22 && nvm use 22       # `nvm use` alone picks up the repo's .nvmrc
```

**Windows** — install [nvm-windows](https://github.com/coreybutler/nvm-windows)
(`nvm install 22 && nvm use 22`), or download the LTS installer from
[nodejs.org](https://nodejs.org).

**Any platform without a version manager** — download the LTS installer from
[nodejs.org](https://nodejs.org).

Then confirm both are ready before continuing:

```bash
node -v    # >= v22
npm -v
```

## Install and run

```bash
git clone https://github.com/danilopatrial/sooket.git
cd sooket
npm run setup                        # handles the sharp/Node 26 prebuilt-binary issue
npm run build
npm start                            # -> http://localhost:3000
```

`npm run setup` installs without running the failing `sharp` native build (it has
no prebuilt binary for Node 26+ yet); on Node 22 a plain `npm install` also works.

On the first `npm start` (or `npm run dev`), a `predev`/`prestart` hook runs
`scripts/ensure-env.mjs`, which creates a `.env.local` with a randomly generated
`ENCRYPTION_SECRET` — the key used to encrypt stored provider keys, credentials,
and variables at rest. It will **not** overwrite an existing `.env.local` or
clobber an `ENCRYPTION_SECRET` you already set in the environment. See
[Configuration](configuration.md) for all the knobs.

> Working on Sooket itself? Use `npm run dev` for the same app with hot reload.

Both `npm start` and `npm run dev` bind to `127.0.0.1` by default — Sooket's
management API is unauthenticated by design, so it stays on loopback. To change
the bind address, set `SOOKET_HOST` (and read the security note in
[Configuration](configuration.md) first).

### With Docker

```bash
ENCRYPTION_SECRET=$(openssl rand -hex 32) docker compose up
# -> http://127.0.0.1:3000
```

The provided Compose setup publishes to loopback only and persists the database
to a mounted `./data` volume.

## The example workflow

A fresh install ships with one workflow — **API Guard (example)** — so there's
something to open and inspect on first run. Open
`http://localhost:3000/workflow` and you'll find:

```
Input -> Rate Limiter -> PII Redact -> HTTP Request -> Output
```

It puts rate limiting and PII redaction in front of an upstream API: callers
over the limit are rejected before any work happens, PII is scrubbed before the
request is forwarded, and the upstream response comes back through the same
endpoint.

It ships **inactive**, the HTTP Request node points at a placeholder URL, and a
**Default Key** (an `sk-wf-*` key) is already created for it. To run it for real:

1. Point the HTTP Request node at your API.
2. Toggle the workflow **active**.
3. Call it with its `sk-wf-*` key (see [API usage](api-usage.md)).

> The example is seeded once and never re-added — if you delete it, it won't
> come back.

## Build your own

Open the canvas, drag nodes from the palette, connect them, and finish the graph
with an **Output** node (its result is what the caller receives). Save, then
create an `sk-wf-*` key from the workflow's settings and call it — see
**[API usage](api-usage.md)**.
