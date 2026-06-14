---
id: EDGE-11
title: Docker image builds on glibc base; embedder loads onnxruntime lazily
severity: high
source_files:
  - Dockerfile
  - .dockerignore
  - lib/complexity/embedder.ts
  - .github/workflows/docker.yml
---

## What this tests
Verifies that the production Docker image builds end to end — specifically that (a) the base image is glibc (`node:22-slim`), not musl (`node:22-alpine`), so `onnxruntime-node`'s glibc-only prebuilt `.so` can load, and (b) `lib/complexity/embedder.ts` imports `@huggingface/transformers` lazily (dynamic `import()`), so `next build`'s "Collecting page data" phase for `/api/complexity` does not eagerly load the native runtime. Together these unblock `docker build` (previously failed with `ld-linux-x86-64.so.2: No such file or directory`).

## Prerequisites
- Docker installed and the daemon reachable
- A clean checkout of the branch (no local `.next`, `data/`, or `.env.local` required — `.dockerignore` excludes them)

## Steps — image builds
1. From the repo root run:
   ```bash
   docker build -t sooket:local .
   ```
2. Watch the `builder` stage run `npm run build`. Confirm the "Collecting page data ..." phase completes and the build finishes successfully (exit 0).

## Steps — lazy import (no eager native load at build)
3. Confirm `lib/complexity/embedder.ts` has only `import type { ... } from "@huggingface/transformers"` at the top and pulls the runtime via `const { pipeline } = await import("@huggingface/transformers")` inside `getEmbedder()`.
4. Run the build locally too: `SOOKET_STANDALONE=1 npm run build` — it should complete and emit `.next/standalone/server.js` with no onnxruntime/`ld-linux` errors.

## Steps — context hygiene
5. Confirm `.dockerignore` excludes `node_modules`, `.next`, `.git`, `data`, `*.db*`, and `.env`/`.env.*` (but keeps `.env.example`), so the live SQLite DB and secrets are never baked into the image.

## Steps — runtime (complexity endpoint works in-container)
6. Run the image and exercise a workflow that uses the Complexity Score node (or `POST /api/complexity`). The score is returned, proving `onnxruntime-node` loads at runtime on the glibc base.

## Steps — CI guard
7. Confirm `.github/workflows/docker.yml` has a `build` job (no push) gated on `pull_request` and branch pushes (`if: !startsWith(github.ref, 'refs/tags/')`), so an unbuildable image fails CI before it can land on `main`. The `publish` job stays gated to release tags / `workflow_dispatch`.

## Expected result
- `docker build -t sooket:local .` succeeds; no `ld-linux-x86-64.so.2` / "Failed to collect page data for /api/complexity" error.
- `lib/complexity/embedder.ts` performs the transformers import lazily; the top-level import is type-only.
- `.dockerignore` keeps `data/`, `*.db`, and `.env*` (except `.env.example`) out of the image.
- The Complexity Score node / `/api/complexity` works inside the running container.
- CI builds the image on PRs and branch pushes (no push), and only publishes on tags.

## Failure indicators
- `docker build` fails during "Collecting page data" with `Error loading shared library ld-linux-x86-64.so.2` or `onnxruntime`.
- The base image is `node:*-alpine` again, or the runner stage uses `addgroup`/`adduser` (alpine) instead of `groupadd`/`useradd` (Debian).
- `lib/complexity/embedder.ts` regains a top-level runtime `import { pipeline } from "@huggingface/transformers"`.
- The built image contains `data/sooket.db` or `.env.local`.
- CI has no PR/branch docker build job (an unbuildable image can land on `main`).

## Severity rationale
A broken image blocks every Docker deployment, including every hosted (sooket.cloud) tenant image — high impact on releasing/operating the product, though it does not affect an already-running instance.

## Source reference
`Dockerfile` — `FROM node:22-slim` base + Debian `groupadd`/`useradd` in the runner stage. `lib/complexity/embedder.ts` — `import type { FeatureExtractionPipeline }` at top, `const { pipeline } = await import("@huggingface/transformers")` inside `getEmbedder()`. `.dockerignore` — excludes deps/build artifacts/VCS/`data`/`*.db`/`.env*`. `.github/workflows/docker.yml` — `build` job (`push: false`, `if: !startsWith(github.ref, 'refs/tags/')`) and tag-gated `publish` job.

## Notes
Code-level regression coverage: `__tests__/lib/embedder-lazy-import.test.ts` asserts the top-level import is type-only and that a dynamic `import("@huggingface/transformers")` exists. The glibc-vs-musl dimension can only be exercised by an actual `docker build`, which is what the new CI `build` job runs on every PR.
