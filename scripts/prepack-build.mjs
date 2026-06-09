/**
 * Production build for the npm tarball (`prepack`).
 *
 * Runs `next build` against a throwaway data directory and a random
 * ENCRYPTION_SECRET so nothing from the maintainer's machine — the local
 * SQLite database, .env.local secrets — can be baked into the published
 * `.next` output. Explicit child env vars take precedence over .env.local
 * inside Next.js, so this isolation holds even when .env.local exists.
 *
 * SOOKET_STANDALONE is stripped: the npm package is served by `next start`,
 * which does not run with standalone output (that mode is Docker-only).
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  lstatSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "package.json"));
const nextBin = require.resolve("next/dist/bin/next");

const tempDataDir = mkdtempSync(join(tmpdir(), "sooket-prepack-"));

const env = { ...process.env };
delete env.SOOKET_STANDALONE;
env.SOOKET_DATA_DIR = tempDataDir;
env.ENCRYPTION_SECRET = randomBytes(32).toString("hex");
delete env.ENCRYPTION_SALT;

console.log(`[Sooket] prepack: building with isolated data dir ${tempDataDir}`);

let status;
try {
  ({ status } = spawnSync(process.execPath, [nextBin, "build"], {
    cwd: root,
    env,
    stdio: "inherit",
  }));
} finally {
  rmSync(tempDataDir, { recursive: true, force: true });
}

if (status !== 0) {
  console.error(`[Sooket] prepack: next build failed (exit ${status ?? "signal"})`);
  process.exit(status ?? 1);
}

// Turbopack externalizes serverExternalPackages behind hashed aliases
// (e.g. @huggingface/transformers-<hash>) resolved through symlinks it plants
// in .next/**/node_modules. npm pack strips every node_modules directory from
// the tarball, so record alias → package-name mappings in a manifest; the CLI
// (bin/sooket.mjs) recreates the symlinks on the consumer's machine.
const SKIP_DIRS = new Set(["cache", "dev", "static", "diagnostics", "build"]);

function collectAliases(dir, nextDir, aliases) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const entryPath = join(dir, entry.name);
    if (entry.name === "node_modules") {
      collectAliasLinks(entryPath, aliases);
    } else if (entry.isDirectory() && !(dir === nextDir && SKIP_DIRS.has(entry.name))) {
      collectAliases(entryPath, nextDir, aliases);
    }
  }
}

function collectAliasLinks(nodeModulesDir, aliases, scope = "") {
  for (const entry of readdirSync(nodeModulesDir, { withFileTypes: true })) {
    const entryPath = join(nodeModulesDir, entry.name);
    if (!scope && entry.name.startsWith("@") && entry.isDirectory()) {
      collectAliasLinks(entryPath, aliases, entry.name);
      continue;
    }
    if (!lstatSync(entryPath).isSymbolicLink()) continue;
    let packageName;
    try {
      packageName = JSON.parse(
        readFileSync(join(realpathSync(entryPath), "package.json"), "utf8")
      ).name;
    } catch {
      console.warn(`[Sooket] prepack: skipping unresolvable alias ${entryPath}`);
      continue;
    }
    aliases.push({
      link: relative(root, entryPath).split(sep).join("/"),
      package: packageName,
    });
  }
}

const aliases = [];
collectAliases(join(root, ".next"), join(root, ".next"), aliases);
writeFileSync(
  join(root, ".next-external-aliases.json"),
  JSON.stringify(aliases, null, 2) + "\n"
);
console.log(
  `[Sooket] prepack: recorded ${aliases.length} external alias(es) in .next-external-aliases.json`
);
