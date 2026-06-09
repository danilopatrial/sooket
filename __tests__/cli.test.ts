import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, statSync, existsSync, lstatSync, realpathSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  parseEnvFile,
  parseCliArgs,
  prepareDataDir,
  ensureExternalAliases,
} from "../bin/cli.mjs";

describe("parseEnvFile", () => {
  it("returns an empty object for empty input", () => {
    expect(parseEnvFile("")).toEqual({});
  });

  it("parses KEY=VALUE pairs and skips comments and blank lines", () => {
    const parsed = parseEnvFile("# comment\n\nFOO=bar\nBAZ=qux\n");
    expect(parsed).toEqual({ FOO: "bar", BAZ: "qux" });
  });

  it("keeps everything after the first equals sign", () => {
    expect(parseEnvFile("URL=https://x.test/?a=1&b=2")).toEqual({
      URL: "https://x.test/?a=1&b=2",
    });
  });

  it("strips surrounding quotes", () => {
    expect(parseEnvFile(`A="quoted"\nB='single'\nC="unbalanced'`)).toEqual({
      A: "quoted",
      B: "single",
      C: `"unbalanced'`,
    });
  });

  it("skips malformed lines and invalid keys", () => {
    const parsed = parseEnvFile("noequals\n=novalue\n1BAD=x\nGOOD=y\nSP ACE=z");
    expect(parsed).toEqual({ GOOD: "y" });
  });

  it("handles CRLF line endings", () => {
    expect(parseEnvFile("A=1\r\nB=2\r\n")).toEqual({ A: "1", B: "2" });
  });
});

describe("parseCliArgs", () => {
  it("defaults to the start command", () => {
    expect(parseCliArgs([])).toMatchObject({ command: "start", help: false, version: false });
  });

  it("accepts the execution-server command", () => {
    expect(parseCliArgs(["execution-server"]).command).toBe("execution-server");
  });

  it("rejects unknown commands", () => {
    expect(() => parseCliArgs(["bogus"])).toThrow(/Unknown command/);
  });

  it("rejects extra positionals", () => {
    expect(() => parseCliArgs(["start", "extra"])).toThrow(/Unexpected arguments/);
  });

  it("parses valid ports including boundaries", () => {
    expect(parseCliArgs(["-p", "1"]).port).toBe(1);
    expect(parseCliArgs(["--port", "65535"]).port).toBe(65535);
    expect(parseCliArgs(["-p", "3000"]).port).toBe(3000);
  });

  it.each(["0", "65536", "abc", "-1", "3.5", ""])("rejects invalid port %s", (p) => {
    expect(() => parseCliArgs([`--port=${p}`])).toThrow(/Invalid --port/);
  });

  it("parses host and treats a blank host as unset", () => {
    expect(parseCliArgs(["-H", "0.0.0.0"]).host).toBe("0.0.0.0");
    expect(parseCliArgs(["--host", "  "]).host).toBeUndefined();
    expect(parseCliArgs([]).host).toBeUndefined();
  });

  it("parses help and version flags", () => {
    expect(parseCliArgs(["--help"]).help).toBe(true);
    expect(parseCliArgs(["-v"]).version).toBe(true);
  });

  it("rejects unknown flags", () => {
    expect(() => parseCliArgs(["--bogus"])).toThrow();
  });
});

describe("prepareDataDir", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sooket-cli-test-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates the data dir, generates a secret, and persists it with mode 0600", () => {
    const dataDir = join(dir, "nested", "data");
    const env: Record<string, string | undefined> = { SOOKET_DATA_DIR: dataDir };

    const resolved = prepareDataDir(env);

    expect(resolved).toBe(dataDir);
    expect(env.ENCRYPTION_SECRET).toMatch(/^[0-9a-f]{64}$/);
    const envFile = join(dataDir, ".env");
    expect(readFileSync(envFile, "utf8")).toContain(`ENCRYPTION_SECRET=${env.ENCRYPTION_SECRET}`);
    if (process.platform !== "win32") {
      // Windows has no POSIX permission bits — the mode option is a no-op
      // there and stat always reports 0o666.
      expect(statSync(envFile).mode & 0o777).toBe(0o600);
    }
  });

  it("reuses the same secret on repeated runs", () => {
    const env1: Record<string, string | undefined> = { SOOKET_DATA_DIR: dir };
    prepareDataDir(env1);
    const env2: Record<string, string | undefined> = { SOOKET_DATA_DIR: dir };
    prepareDataDir(env2);

    expect(env2.ENCRYPTION_SECRET).toBe(env1.ENCRYPTION_SECRET);
    const matches = readFileSync(join(dir, ".env"), "utf8").match(/ENCRYPTION_SECRET=/g);
    expect(matches).toHaveLength(1);
  });

  it("does not write a file when ENCRYPTION_SECRET is already in the environment", () => {
    const env: Record<string, string | undefined> = {
      SOOKET_DATA_DIR: dir,
      ENCRYPTION_SECRET: "from-env",
    };
    prepareDataDir(env);

    expect(env.ENCRYPTION_SECRET).toBe("from-env");
    expect(existsSync(join(dir, ".env"))).toBe(false);
  });

  it("loads other keys from an existing .env without overriding real env vars", () => {
    writeFileSync(join(dir, ".env"), "SOOKET_AUTH_TOKEN=file-token\nENCRYPTION_SALT=file-salt\n");
    const env: Record<string, string | undefined> = {
      SOOKET_DATA_DIR: dir,
      ENCRYPTION_SALT: "real-env-salt",
    };
    prepareDataDir(env);

    expect(env.SOOKET_AUTH_TOKEN).toBe("file-token");
    expect(env.ENCRYPTION_SALT).toBe("real-env-salt");
    // secret was missing from both → generated and appended, existing keys kept
    const contents = readFileSync(join(dir, ".env"), "utf8");
    expect(contents).toContain("SOOKET_AUTH_TOKEN=file-token");
    expect(contents).toMatch(/ENCRYPTION_SECRET=[0-9a-f]{64}/);
  });

  it("treats an empty env var as unset and fills it from the file", () => {
    writeFileSync(join(dir, ".env"), "ENCRYPTION_SECRET=aaaa\n");
    const env: Record<string, string | undefined> = {
      SOOKET_DATA_DIR: dir,
      ENCRYPTION_SECRET: "",
    };
    prepareDataDir(env);
    expect(env.ENCRYPTION_SECRET).toBe("aaaa");
  });
});

describe("ensureExternalAliases", () => {
  let root: string;

  function makeFakePackage(name: string) {
    const pkgDir = join(root, "node_modules", name);
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(join(pkgDir, "package.json"), JSON.stringify({ name, main: "index.js" }));
    writeFileSync(join(pkgDir, "index.js"), "module.exports = {};\n");
    return pkgDir;
  }

  function writeManifest(aliases: unknown) {
    writeFileSync(join(root, ".next-external-aliases.json"), JSON.stringify(aliases));
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "sooket-alias-test-"));
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "fake-root" }));
    mkdirSync(join(root, ".next"), { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("returns 0 when no manifest exists", () => {
    expect(ensureExternalAliases(root)).toBe(0);
  });

  it("returns 0 on a malformed or non-array manifest", () => {
    writeFileSync(join(root, ".next-external-aliases.json"), "{not json");
    expect(ensureExternalAliases(root)).toBe(0);
    writeManifest({ link: "x" });
    expect(ensureExternalAliases(root)).toBe(0);
  });

  it("creates a symlink for a resolvable alias, including scoped dirs", () => {
    const pkgDir = makeFakePackage("@scope/pkg");
    writeManifest([
      { link: ".next/server/node_modules/@scope/pkg-abc123", package: "@scope/pkg" },
    ]);

    expect(ensureExternalAliases(root)).toBe(1);
    const linkPath = join(root, ".next/server/node_modules/@scope/pkg-abc123");
    expect(readFileSync(join(linkPath, "package.json"), "utf8")).toContain("@scope/pkg");
    expect(statSync(linkPath).isDirectory()).toBe(true);
    expect(lstatSync(linkPath).isSymbolicLink()).toBe(true);
    expect(realpathSync(linkPath)).toBe(
      realpathSync(pkgDir)
    );
  });

  it("is idempotent across repeated calls", () => {
    makeFakePackage("plain-pkg");
    writeManifest([{ link: ".next/node_modules/plain-pkg-ff00", package: "plain-pkg" }]);
    expect(ensureExternalAliases(root)).toBe(1);
    expect(ensureExternalAliases(root)).toBe(1);
  });

  it("replaces a broken symlink", () => {
    const pkgDir = makeFakePackage("plain-pkg");
    const linkPath = join(root, ".next/node_modules/plain-pkg-ff00");
    mkdirSync(join(root, ".next/node_modules"), { recursive: true });
    symlinkSync(join(root, "does-not-exist"), linkPath, "dir");
    writeManifest([{ link: ".next/node_modules/plain-pkg-ff00", package: "plain-pkg" }]);

    expect(ensureExternalAliases(root)).toBe(1);
    expect(realpathSync(linkPath)).toBe(
      realpathSync(pkgDir)
    );
  });

  it("skips unresolvable packages and links outside .next without throwing", () => {
    makeFakePackage("plain-pkg");
    writeManifest([
      { link: ".next/node_modules/ghost-pkg-aa", package: "ghost-pkg" },
      { link: "lib/evil", package: "plain-pkg" },
      { link: 42, package: "plain-pkg" },
      null,
    ]);
    expect(ensureExternalAliases(root)).toBe(0);
    expect(existsSync(join(root, "lib/evil"))).toBe(false);
  });
});
