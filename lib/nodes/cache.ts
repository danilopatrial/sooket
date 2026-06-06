import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";

class CacheNode implements INodeExecutor {
  async execute(node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext) {
    const keySrc   = ctx.inputFor("key");
    const valueSrc = ctx.inputFor("value");

    if (!keySrc)   throw new Error("Cache node has no key input connected");
    if (!valueSrc) throw new Error("Cache node has no value input connected");

    const { ttl = 3600 } = (node.data as unknown) as import("@/lib/node-types").CacheNodeData;
    const safeTtl = Math.max(1, Math.floor(ttl));

    const keyResult = await ctx.evalInput(keySrc);
    const rawKey    = `wf:${ctx.workflow.id}:${JSON.stringify(keyResult.value)}`;

    const hashBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawKey));
    const cacheKey  = Array.from(new Uint8Array(hashBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const now = Math.floor(Date.now() / 1000);

    const cachedRaw = ctx.getCacheEntry(cacheKey, now);
    if (cachedRaw !== null) {
      let cached: unknown;
      try { cached = JSON.parse(cachedRaw); } catch { cached = cachedRaw; }
      const hitResult: EvalResult = { value: cached, inputTokens: 0, outputTokens: 0 };
      const hitFlag:   EvalResult = { value: true,   inputTokens: 0, outputTokens: 0 };
      ctx.cache.set(`${ctx.nodeId}:hit`, hitFlag);
      if (sourceHandle === "hit") return hitFlag;
      return hitResult;
    }

    const valueResult = await ctx.evalInput(valueSrc);
    if (valueResult.active === false) {
      return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
    }

    ctx.evictExpiredCacheEntries(now);

    const serialised = JSON.stringify(valueResult.value);
    ctx.setCacheEntry(cacheKey, serialised, now + safeTtl);

    const missFlag: EvalResult = { value: false, inputTokens: 0, outputTokens: 0 };
    ctx.cache.set(`${ctx.nodeId}:hit`, missFlag);

    if (sourceHandle === "hit") return missFlag;
    return {
      value:        valueResult.value,
      inputTokens:  valueResult.inputTokens,
      outputTokens: valueResult.outputTokens,
    };
  }
}

export const execute = new CacheNode();
