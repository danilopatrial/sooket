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

    const sandbox: Record<string, unknown> = {
      input:      inputResult.value,
      JSON,
      Math,
      Number,
      String,
      Boolean,
      Array,
      Object,
      Date,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      Infinity,
      NaN,
      // Timers so user code can perform async delays (retry loops, polling).
      // Without setTimeout the async timeout guard below could never be reached.
      setTimeout,
      clearTimeout,
      // Silenced console so users can log without side-effects leaking
      console: { log: () => {}, warn: () => {}, error: () => {}, info: () => {} },
    };

    vm.createContext(sandbox);

    // Wrap in async IIFE so users can write `return x` at top level and use await
    const wrapped = `(async function(input) {\n${code}\n})(input)`;

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
