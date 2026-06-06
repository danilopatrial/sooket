import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";
import type { RetryNodeData } from "@/lib/node-types";

class RetryNode implements INodeExecutor {
  async execute(node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext) {
    const inputSrc = ctx.inputFor("input");
    if (!inputSrc) throw new Error("Retry node has no input connected");

    const { maxAttempts = 3, backoff = "exponential", baseDelayMs = 1000, maxDelayMs = 30000 } = (node.data as unknown) as RetryNodeData;

    const attempts   = Math.max(1, Math.min(10, maxAttempts));
    // Cap a single backoff delay. Without this, "10 attempts, exponential, 1 s base"
    // would wait 1000 × 2^8 = 256 s on the last attempt alone. Fall back to 30 s for
    // missing/zero/negative/non-finite values.
    const safeMaxDelay = Number.isFinite(maxDelayMs) && maxDelayMs > 0 ? Math.floor(maxDelayMs) : 30000;
    const upstreamId = inputSrc.node.id;

    const clearUpstreamCache = () => {
      for (const key of ctx.cache.keys()) {
        if (key === upstreamId || key.startsWith(`${upstreamId}:`)) ctx.cache.delete(key);
      }
    };

    const calcDelay = (attempt: number): number => {
      const base = Math.max(0, baseDelayMs);
      let delay: number;
      switch (backoff) {
        case "linear":      delay = base * attempt; break;
        case "exponential": delay = base * Math.pow(2, attempt - 1); break;
        default:            delay = base; break;
      }
      return Math.min(delay, safeMaxDelay);
    };

    let lastError = "Retry exhausted";

    for (let attempt = 1; attempt <= attempts; attempt++) {
      if (attempt > 1) {
        clearUpstreamCache();
        const delay = calcDelay(attempt - 1);
        if (delay > 0) await new Promise<void>((res) => setTimeout(res, delay));
      }

      try {
        const result = await ctx.evalInput(inputSrc);
        if (result.active === false) {
          return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
        }
        if (sourceHandle === "failed") {
          return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
        }
        return {
          value:        result.value,
          inputTokens:  result.inputTokens,
          outputTokens: result.outputTokens,
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    const failedResult:   EvalResult = { value: lastError,   inputTokens: 0, outputTokens: 0 };
    const inactiveResult: EvalResult = { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
    ctx.cache.set(`${ctx.nodeId}:output`, inactiveResult);
    ctx.cache.set(`${ctx.nodeId}:failed`, failedResult);
    if (sourceHandle === "output") return inactiveResult;
    return failedResult;
  }
}

export const execute = new RetryNode();
