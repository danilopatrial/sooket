import vm from "node:vm";
import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";

/**
 * Detects the error thrown when `vm.Script`'s synchronous `{ timeout }` limit is
 * exceeded by an infinite/blocking loop. Node throws an `Error` with code
 * `ERR_SCRIPT_EXECUTION_TIMEOUT` and a message like
 * `"Script execution timed out after 5000ms"`; some runtimes surface it as a
 * `DOMException` whose message contains "timed out". Both must be treated as a
 * synchronous timeout so they are not mislabeled as a compile/parse error.
 */
export function isScriptTimeoutError(err: unknown): boolean {
  if (
    typeof err === "object" && err !== null &&
    "code" in err && err.code === "ERR_SCRIPT_EXECUTION_TIMEOUT"
  ) {
    return true;
  }
  const message = err instanceof Error ? err.message : String(err);
  return /timed out/i.test(message);
}

class CustomCodeNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const inputSrc = ctx.inputFor("input");
    if (!inputSrc) throw new Error("Custom Code node has no input connected");

    const inputResult = await ctx.evalInput(inputSrc);
    if (inputResult.active === false) return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };

    const { code = "" } = (node.data as unknown) as import("@/lib/node-types").CustomCodeNodeData;
    if (!code.trim()) throw new Error("Custom Code node: no code provided");

    // Hardened sandbox. node:vm is NOT a guaranteed security boundary, but the
    // trivial one-liner escape — `input.constructor.constructor("return process")()`
    // — works only when a *host-realm* object (a primordial like Object, or a host
    // function like setTimeout) is reachable from sandboxed code, because its
    // constructor chain leads back to the host `Function`. We close that vector by:
    //   1. Using a null-prototype context with NO host primordials injected. The vm
    //      context already has its own context-local intrinsics (Object, Array,
    //      JSON, Math, Number, Date, Promise, Map, Set, RegExp, parseInt, …), so user
    //      code keeps them — but their constructor chain stays inside the context.
    //   2. NOT exposing any host functions (no host setTimeout/clearTimeout/console).
    //      Timer callbacks would also outlive the sandbox and run uncaught on the
    //      host event loop, so dropping them removes a stability hazard too. Async
    //      still works via the context's own Promise intrinsic.
    //   3. Deep-cloning `input` into the context with JSON.parse, so even `input`
    //      carries context-local prototypes rather than a live host-object handle.
    // This is defense-in-depth hardening, not a hard isolate — treat workflow-edit
    // access as privileged regardless.
    const sandbox: Record<string, unknown> = Object.create(null);
    vm.createContext(sandbox);

    // Serialise input to a JSON literal embedded in the script; the context rebuilds
    // it with its own JSON.parse. A non-serializable input (BigInt, circular) is a
    // caller error, surfaced before the script runs.
    let inputJsonLiteral: string;
    try {
      const serialized = JSON.stringify(inputResult.value === undefined ? null : inputResult.value);
      // top-level functions/symbols stringify to `undefined` → treat as null
      inputJsonLiteral = JSON.stringify(serialized ?? "null");
    } catch {
      throw new Error("Custom Code error: input value is not JSON-serializable");
    }

    // Wrap in async IIFE so users can write `return x` at top level and use await.
    // The prelude installs a silenced, context-local console as a global property
    // (not a lexical const) so user code may still shadow `console` without a
    // redeclaration error.
    const wrapped =
`(async function(input) {
(function(){ const c = { log(){}, warn(){}, error(){}, info(){} }; globalThis.console = c; })();
${code}
})(JSON.parse(${inputJsonLiteral}))`;

    let promise: Promise<unknown>;
    try {
      promise = new vm.Script(wrapped).runInContext(sandbox, { timeout: 5000 }) as Promise<unknown>;
    } catch (err) {
      // The vm's { timeout } only catches *synchronous* overruns (an infinite loop
      // before the first await). A timeout is a runtime failure — the code parsed
      // and ran — so report it under the same "runtime error" prefix and message as
      // the async-overrun guard below, rather than as a separate top-level class or
      // lumped in with genuine SyntaxErrors from malformed code. This lets callers
      // detect any Custom Code timeout by matching the single "runtime error" prefix.
      if (isScriptTimeoutError(err)) {
        throw new Error("Custom Code runtime error: Custom Code timed out after 5 s");
      }
      throw new Error(`Custom Code compile/parse error: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Reject at 5500 ms — 500 ms after the vm's 5000 ms synchronous timeout — so a
    // synchronous overrun is always reported by the vm path above and never races
    // with this async-overrun guard. The observable async limit is still ~5 s.
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Custom Code timed out after 5 s")), 5500)
    );

    let result: unknown;
    try {
      result = await Promise.race([promise, timeoutPromise]);
    } catch (err) {
      throw new Error(`Custom Code runtime error: ${err instanceof Error ? err.message : String(err)}`);
    }

    return { value: result, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new CustomCodeNode();
