#!/usr/bin/env node
/**
 * `sooket` CLI — the npx/npm entry point.
 *
 * Unlike a git checkout, the installed package lives in npm's (possibly
 * ephemeral) cache, so nothing durable can be stored next to the code. All
 * state goes to a per-user data directory instead:
 *
 *   - SOOKET_DATA_DIR defaults to ~/.sooket (the repo default is ./data)
 *   - ENCRYPTION_SECRET is generated once and persisted to
 *     <dataDir>/.env (mode 0600) so encrypted values survive across runs;
 *     a secret already present in the environment always wins
 *
 * Commands:
 *   sooket                    start the Sooket server (next start)
 *   sooket execution-server   start the standalone execution server
 */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  appendFileSync,
  writeFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Parse a dotenv-style file into key/value pairs. Malformed lines are skipped. */
export function parseEnvFile(contents) {
  const result = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

/**
 * Load <dataDir>/.env into process.env (real environment wins) and make sure
 * ENCRYPTION_SECRET exists, generating + persisting one on first run.
 * Returns the resolved data directory.
 */
export function prepareDataDir(env = process.env) {
  const dataDir = env.SOOKET_DATA_DIR?.trim() || join(homedir(), ".sooket");
  mkdirSync(dataDir, { recursive: true });
  env.SOOKET_DATA_DIR = dataDir;

  const envFilePath = join(dataDir, ".env");
  if (existsSync(envFilePath)) {
    const fromFile = parseEnvFile(readFileSync(envFilePath, "utf8"));
    for (const [key, value] of Object.entries(fromFile)) {
      if (env[key] === undefined || env[key] === "") env[key] = value;
    }
  }

  if (!env.ENCRYPTION_SECRET?.trim()) {
    const secret = randomBytes(32).toString("hex");
    const line = `ENCRYPTION_SECRET=${secret}\n`;
    if (existsSync(envFilePath)) {
      appendFileSync(envFilePath, line, { mode: 0o600 });
    } else {
      writeFileSync(envFilePath, line, { mode: 0o600 });
    }
    env.ENCRYPTION_SECRET = secret;
    console.log(`[Sooket] Generated ENCRYPTION_SECRET and saved it to ${envFilePath}`);
  }

  return dataDir;
}

/**
 * Recreate the hashed external-alias symlinks Turbopack plants in
 * .next/**\/node_modules (npm pack strips them from the tarball; see
 * scripts/prepack-build.mjs, which records them in
 * .next-external-aliases.json). Idempotent: valid links are kept, broken ones
 * replaced. Returns the number of links ensured.
 */
export function ensureExternalAliases(root) {
  const manifestPath = join(root, ".next-external-aliases.json");
  if (!existsSync(manifestPath)) return 0;

  let aliases;
  try {
    aliases = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    console.warn(`[Sooket] Ignoring malformed ${manifestPath}`);
    return 0;
  }
  if (!Array.isArray(aliases)) return 0;

  const require = createRequire(join(root, "package.json"));
  let ensured = 0;
  for (const alias of aliases) {
    if (!alias || typeof alias.link !== "string" || typeof alias.package !== "string") continue;
    const linkPath = resolve(root, alias.link);
    if (!linkPath.startsWith(resolve(root, ".next") + "/") && !linkPath.startsWith(resolve(root, ".next") + "\\")) {
      console.warn(`[Sooket] Skipping alias outside .next: ${alias.link}`);
      continue;
    }

    let targetDir;
    try {
      targetDir = resolvePackageDir(require, alias.package);
    } catch {
      console.warn(`[Sooket] Cannot resolve ${alias.package} for alias ${alias.link}`);
      continue;
    }

    try {
      if (realpathSync(linkPath) === realpathSync(targetDir)) {
        ensured++;
        continue; // already correct
      }
    } catch {
      // missing or broken — (re)create below
    }

    try {
      rmSync(linkPath, { recursive: true, force: true });
      mkdirSync(dirname(linkPath), { recursive: true });
      symlinkSync(targetDir, linkPath, process.platform === "win32" ? "junction" : "dir");
      ensured++;
    } catch (error) {
      console.warn(`[Sooket] Failed to link ${alias.link}: ${error?.message ?? error}`);
    }
  }
  return ensured;
}

/** Locate the on-disk directory of an installed package by name. */
function resolvePackageDir(require, name) {
  try {
    return dirname(require.resolve(`${name}/package.json`));
  } catch {
    // package.json not exported — resolve the entry point and walk up
  }
  let dir = dirname(require.resolve(name));
  while (dir !== dirname(dir)) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        if (JSON.parse(readFileSync(pkgPath, "utf8")).name === name) return dir;
      } catch {
        // keep walking
      }
    }
    dir = dirname(dir);
  }
  throw new Error(`Cannot locate package directory for ${name}`);
}

/** Parse CLI argv (without node + script). Throws Error with a message on bad input. */
export function parseCliArgs(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      port: { type: "string", short: "p" },
      host: { type: "string", short: "H" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
    allowPositionals: true,
  });

  if (positionals.length > 1) {
    throw new Error(`Unexpected arguments: ${positionals.slice(1).join(" ")}`);
  }
  const command = positionals[0] ?? "start";
  if (command !== "start" && command !== "execution-server") {
    throw new Error(`Unknown command "${command}". Available: start, execution-server`);
  }

  let port;
  if (values.port !== undefined) {
    port = Number(values.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid --port "${values.port}". Expected an integer between 1 and 65535.`);
    }
  }

  return {
    command,
    port,
    host: values.host?.trim() || undefined,
    help: values.help ?? false,
    version: values.version ?? false,
  };
}

const USAGE = `Usage: sooket [command] [options]

Commands:
  start              Start the Sooket server (default)
  execution-server   Start the standalone workflow execution server

Options:
  -p, --port <n>     Port to listen on (default: 3000, execution server: 3001)
  -H, --host <host>  Host to bind (default: 127.0.0.1; see SOOKET_HOST)
  -h, --help         Show this help
  -v, --version      Show version

Data directory: ~/.sooket (override with SOOKET_DATA_DIR). The encryption
secret is stored in <dataDir>/.env on first run.`;

function main() {
  let args;
  try {
    args = parseCliArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[Sooket] ${error instanceof Error ? error.message : error}`);
    console.error(USAGE);
    process.exit(1);
  }

  if (args.help) {
    console.log(USAGE);
    return;
  }
  if (args.version) {
    const pkg = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
    console.log(pkg.version);
    return;
  }

  prepareDataDir();

  // Loopback-only by default; --host / SOOKET_HOST opt into a wider bind
  // (lib/security/auth.ts warns at startup when exposed without a token).
  const host = args.host || process.env.SOOKET_HOST?.trim() || "127.0.0.1";
  process.env.SOOKET_HOST = host;

  let child;
  if (args.command === "execution-server") {
    if (args.port !== undefined) process.env.EXECUTION_PORT = String(args.port);
    child = spawn(process.execPath, [join(packageRoot, "server/run.mjs")], {
      cwd: packageRoot,
      stdio: "inherit",
    });
  } else {
    ensureExternalAliases(packageRoot);
    const require = createRequire(join(packageRoot, "package.json"));
    const nextBin = require.resolve("next/dist/bin/next");
    const port = args.port ?? (Number(process.env.PORT) || 3000);
    child = spawn(
      process.execPath,
      [nextBin, "start", "-H", host, "-p", String(port)],
      { cwd: packageRoot, stdio: "inherit" }
    );
  }

  child.on("exit", (code) => process.exit(code ?? 0));
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => child.kill(signal));
  }
}

// Run only when executed directly (the npm bin shim is a symlink — realpath
// resolves it); importing this module for tests stays side-effect free.
const invokedAs = process.argv[1];
if (invokedAs) {
  let isDirect = false;
  try {
    isDirect = realpathSync(invokedAs) === fileURLToPath(import.meta.url);
  } catch {
    isDirect = false;
  }
  if (isDirect) main();
}
