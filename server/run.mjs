/**
 * Programmatic jiti runner for the standalone execution server.
 *
 * Configures aliases before loading the TypeScript entry point so that:
 *  - @/ path aliases (from tsconfig.json) are resolved correctly
 *  - server-only is stubbed (it throws in non-Next.js contexts)
 */
import { createJiti } from "jiti";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const jiti = createJiti(import.meta.url, {
  alias: {
    "server-only": resolve(__dirname, "stubs/server-only.ts"),
    "@": root,
  },
});

await jiti.import("./index.ts");
