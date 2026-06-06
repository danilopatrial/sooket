import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";
import { toText } from "./utils";
import { embedText } from "@/lib/complexity/embedder";

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

class SemanticCacheNode implements INodeExecutor {
  async execute(node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext) {
    const keySrc   = ctx.inputFor("key");
    const valueSrc = ctx.inputFor("value");

    if (!keySrc)   throw new Error("Semantic Cache node has no key input connected");
    if (!valueSrc) throw new Error("Semantic Cache node has no value input connected");

    const { ttl = 3600, threshold = 0.85 } = (node.data as unknown) as import("@/lib/node-types").SemanticCacheNodeData;
    const safeTtl       = Math.max(1, Math.floor(ttl));
    const safeThreshold = Math.min(1, Math.max(0, threshold));

    const keyResult = await ctx.evalInput(keySrc);
    const keyText   = toText(keyResult.value);

    const queryEmbedding = await embedText(keyText);

    const now  = Math.floor(Date.now() / 1000);
    const rows = ctx.getSemanticCacheEntries(now);

    let bestScore = -1;
    let bestValue: unknown = undefined;

    for (const row of rows) {
      let rowEmbedding: number[];
      try { rowEmbedding = JSON.parse(row.embedding) as number[]; } catch { continue; }
      if (!Array.isArray(rowEmbedding) || rowEmbedding.length !== queryEmbedding.length) continue;

      const score = cosineSimilarity(queryEmbedding, rowEmbedding);
      if (score > bestScore) {
        bestScore = score;
        try { bestValue = JSON.parse(row.value); } catch { bestValue = row.value; }
      }
    }

    if (bestScore >= safeThreshold) {
      const hitResult: EvalResult = { value: bestValue, inputTokens: 0, outputTokens: 0 };
      const hitFlag:   EvalResult = { value: true,      inputTokens: 0, outputTokens: 0 };
      ctx.cache.set(`${ctx.nodeId}:hit`, hitFlag);
      if (sourceHandle === "hit") return hitFlag;
      return hitResult;
    }

    const valueResult = await ctx.evalInput(valueSrc);
    if (valueResult.active === false) {
      return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
    }

    setImmediate(() => ctx.evictExpiredSemanticCacheEntries(now));

    ctx.insertSemanticCacheEntry(
      JSON.stringify(queryEmbedding),
      JSON.stringify(valueResult.value),
      now + safeTtl
    );

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

export const execute = new SemanticCacheNode();
