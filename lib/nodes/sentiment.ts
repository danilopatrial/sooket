import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";
import { toText } from "./utils";

class SentimentNode implements INodeExecutor {
  async execute(node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext): Promise<EvalResult> {
    const inputSrc = ctx.inputFor("input");
    if (!inputSrc) throw new Error("Sentiment node has no input connected");

    const inputResult = await ctx.evalInput(inputSrc);
    if (inputResult.active === false)
      return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };

    const text = toText(inputResult.value);
    const tokens = { inputTokens: inputResult.inputTokens, outputTokens: inputResult.outputTokens };

    const {
      positiveThreshold = 0.05,
      negativeThreshold = -0.05,
    } = (node.data as unknown) as { positiveThreshold?: number; negativeThreshold?: number };

    const { analyzeSentiment } = await import("@/lib/sentiment");
    const result = analyzeSentiment(text, positiveThreshold, negativeThreshold);

    if (sourceHandle === "score") return { value: result.score, ...tokens };
    if (sourceHandle === "label") return { value: result.label, ...tokens };

    const passThrough = { value: inputResult.value, ...tokens };
    if (sourceHandle === "positive" && result.label === "positive") return passThrough;
    if (sourceHandle === "negative" && result.label === "negative") return passThrough;
    if (sourceHandle === "neutral"  && result.label === "neutral")  return passThrough;

    return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new SentimentNode();
