import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";
import type { RateLimiterNodeData } from "@/lib/node-types";
import { toText } from "./utils";

class RateLimiterNode implements INodeExecutor {
  async execute(node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext) {
    const inputSrc = ctx.inputFor("input");
    const keySrc   = ctx.inputFor("key");

    if (!inputSrc) throw new Error("Rate Limiter node has no input connected");

    const inputResult = await ctx.evalInput(inputSrc);
    if (inputResult.active === false) return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };

    const {
      keySource     = "ip",
      windowSeconds = 60,
      limit         = 100,
      action        = "block",
      delayMs       = 1000,
    } = (node.data as unknown) as RateLimiterNodeData;

    const safeWindow = Math.max(1, Math.floor(windowSeconds));
    const safeLimit  = Math.max(1, Math.floor(limit));

    let keyValue: string;
    if (keySource === "ip") {
      keyValue = ctx.reqCtx.ip || "unknown";
    } else if (keySource === "custom" && keySrc) {
      const kr = await ctx.evalInput(keySrc);
      keyValue = toText(kr.value) || "unknown";
    } else {
      keyValue = ctx.workflow.id.toString();
    }

    const rawKey      = `rl:${ctx.workflow.id}:${keySource}:${keyValue}`;
    const hashBytes   = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawKey));
    const counterKey  = Array.from(new Uint8Array(hashBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const now         = Math.floor(Date.now() / 1000);
    // Fixed-window (tumbling) bucket: the counter resets at each window boundary.
    // This is NOT a sliding window — a burst straddling a boundary can pass twice
    // the limit across the two adjacent buckets.
    const windowStart = Math.floor(now / safeWindow) * safeWindow;

    setImmediate(() => ctx.evictExpiredRateLimitCounters(windowStart));

    const count = ctx.incrementRateLimitCounter(counterKey, windowStart);

    if (count > safeLimit) {
      if (action === "delay") {
        await new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, delayMs)));
        const outputResult:  EvalResult = { value: inputResult.value, inputTokens: 0, outputTokens: 0 };
        const blockedResult: EvalResult = { value: false, active: false, inputTokens: 0, outputTokens: 0 };
        ctx.cache.set(`${ctx.nodeId}:output`,  outputResult);
        ctx.cache.set(`${ctx.nodeId}:blocked`, blockedResult);
        if (sourceHandle === "blocked") return blockedResult;
        return outputResult;
      }

      const blockedMsg    = `Rate limit exceeded: ${count}/${safeLimit} requests in ${safeWindow}s window`;
      const outputResult:  EvalResult = { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
      const blockedResult: EvalResult = { value: blockedMsg, inputTokens: 0, outputTokens: 0 };
      ctx.cache.set(`${ctx.nodeId}:output`,  outputResult);
      ctx.cache.set(`${ctx.nodeId}:blocked`, blockedResult);
      if (sourceHandle === "blocked") return blockedResult;
      return outputResult;
    }

    const outputResult:  EvalResult = { value: inputResult.value, inputTokens: 0, outputTokens: 0 };
    const blockedResult: EvalResult = { value: false, active: false, inputTokens: 0, outputTokens: 0 };
    ctx.cache.set(`${ctx.nodeId}:output`,  outputResult);
    ctx.cache.set(`${ctx.nodeId}:blocked`, blockedResult);
    if (sourceHandle === "blocked") return blockedResult;
    return outputResult;
  }
}

export const execute = new RateLimiterNode();
