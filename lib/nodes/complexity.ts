import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import { toText } from "./utils";
import { scoreHeuristics } from "@/lib/complexity/heuristics";
import { blendScores, scoreToTier } from "@/lib/complexity/blender";
import { scoreEmbedding } from "@/lib/complexity/embedder";

class ComplexityNode implements INodeExecutor {
  async execute(_node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext) {
    const promptSrc = ctx.inputFor("prompt");
    let prompt = "";
    if (promptSrc) {
      const r = await ctx.evalInput(promptSrc);
      if (r.active === false) return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
      prompt = toText(r.value);
    }

    const h = scoreHeuristics(prompt);
    let score = h.score;

    if (prompt.trim() && h.score >= 0.25 && h.score <= 0.70) {
      try {
        const embeddingScore = await scoreEmbedding(prompt);
        score = blendScores(h.score, embeddingScore);
      } catch { /* fall back to heuristic score */ }
    }

    const tier = scoreToTier(score);
    ctx.cache.set(`${ctx.nodeId}:score`, { value: score, inputTokens: 0, outputTokens: 0 });
    ctx.cache.set(`${ctx.nodeId}:tier`,  { value: tier,  inputTokens: 0, outputTokens: 0 });

    if (sourceHandle === "tier") return { value: tier,  inputTokens: 0, outputTokens: 0 };
    return                              { value: score, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new ComplexityNode();
