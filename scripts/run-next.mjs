/**
 * Cross-platform launcher for `next dev` / `next start`.
 *
 * The npm scripts used to inline `next dev -H ${SOOKET_HOST:-127.0.0.1}`, but
 * that POSIX parameter expansion is not understood by cmd.exe — on Windows the
 * literal string was passed to Next.js and the server failed to bind. This
 * resolves the host in Node (mirroring server/index.ts) and runs the Next CLI's
 * JS entry directly with the current node, sidestepping the `next`/`next.cmd`
 * bin shim entirely.
 *
 * Usage: node scripts/run-next.mjs <dev|start> [extra next args]
 */
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const mode = process.argv[2];
if (mode !== "dev" && mode !== "start") {
  console.error(`[Sooket] run-next.mjs: expected "dev" or "start", got "${mode}"`);
  process.exit(1);
}

// Default to loopback-only; SOOKET_HOST opts into a wider bind. An empty value
// is treated as unset (matches server/index.ts).
const host = process.env.SOOKET_HOST?.trim() || "127.0.0.1";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nextEntry = resolve(root, "node_modules/next/dist/bin/next");

const child = spawn(
  process.execPath,
  [nextEntry, mode, "-H", host, ...process.argv.slice(3)],
  { stdio: "inherit" }
);
child.on("exit", (code) => process.exit(code ?? 0));
