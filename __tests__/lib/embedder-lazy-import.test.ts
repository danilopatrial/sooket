/**
 * Regression guard for TODO §7: `lib/complexity/embedder.ts` must NOT import the
 * runtime of `@huggingface/transformers` at module top level. A top-level
 * runtime import makes `next build` load `onnxruntime-node` just to collect page
 * data for `/api/complexity` — and its prebuilt `.so` is glibc-only, which broke
 * the (musl) Docker image. The runtime must be pulled in lazily via dynamic
 * import so the native module loads only when the embedder is actually used.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(process.cwd(), "lib/complexity/embedder.ts"),
  "utf8"
);

const PKG = "@huggingface/transformers";

describe("embedder transformers import is lazy", () => {
  it("has no top-level runtime (value) import of @huggingface/transformers", () => {
    // Match `import ... from "@huggingface/transformers"` that is NOT `import type`.
    const lines = source.split("\n");
    const eager = lines.filter(
      (l) =>
        /^\s*import\s/.test(l) &&
        l.includes(PKG) &&
        !/^\s*import\s+type\b/.test(l)
    );
    expect(eager).toEqual([]);
  });

  it("keeps a type-only import for the pipeline type", () => {
    expect(source).toMatch(
      new RegExp(`import\\s+type\\s*\\{[^}]*\\}\\s*from\\s*["']${PKG}["']`)
    );
  });

  it("loads the runtime via dynamic import() inside a function", () => {
    expect(source).toMatch(
      new RegExp(`await\\s+import\\(\\s*["']${PKG}["']\\s*\\)`)
    );
  });
});
