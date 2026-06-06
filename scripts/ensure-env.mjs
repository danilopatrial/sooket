/**
 * Ensures a usable .env.local exists for local `npm run dev` / `npm start`.
 *
 * Sooket refuses to boot without ENCRYPTION_SECRET (see instrumentation.ts), so
 * a fresh clone would otherwise need a manual setup step. This generates one for
 * the user — but only when it's safe to:
 *   - skips if ENCRYPTION_SECRET is already set in the environment (Docker, CI,
 *     or a user who exported it);
 *   - skips if .env.local already exists (never clobber the user's file).
 *
 * The secret stays in .env.local — visible and overridable. Run before dev/start
 * via the predev/prestart npm hooks.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envLocalPath = resolve(root, ".env.local");
const envExamplePath = resolve(root, ".env.example");

if (process.env.ENCRYPTION_SECRET?.trim()) {
  // Already configured via the environment (Docker/CI/exported) — nothing to do.
  process.exit(0);
}

if (existsSync(envLocalPath)) {
  // User already has a .env.local — leave it untouched.
  process.exit(0);
}

const secretLine = `ENCRYPTION_SECRET=${randomBytes(32).toString("hex")}`;

// Seed from .env.example so the generated file keeps its documented optional
// vars; fall back to a bare secret line if the template is missing.
let contents;
if (existsSync(envExamplePath)) {
  const template = readFileSync(envExamplePath, "utf8");
  contents = /^ENCRYPTION_SECRET=.*$/m.test(template)
    ? template.replace(/^ENCRYPTION_SECRET=.*$/m, secretLine)
    : `${secretLine}\n${template}`;
} else {
  contents = `${secretLine}\n`;
}

writeFileSync(envLocalPath, contents);
console.log(
  "[Sooket] Generated .env.local with a random ENCRYPTION_SECRET. Edit it to customize."
);
