import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";
import type { LanguageDetectNodeData } from "@/lib/node-types";
import { toText } from "./utils";
import { francAll } from "franc-min";

class LanguageDetectNode implements INodeExecutor {
  async execute(node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext): Promise<EvalResult> {
    const { routes = [], hasDefault = true } = (node.data as unknown) as LanguageDetectNodeData;

    const inputSrc = ctx.inputFor("input");
    if (!inputSrc) throw new Error("Language Detect node has no input connected");

    const inputResult = await ctx.evalInput(inputSrc);
    if (inputResult.active === false) {
      return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
    }

    const text       = toText(inputResult.value);
    const scores     = francAll(text);
    const detected   = scores[0]?.[0] ?? "und";
    const confidence = scores[0]?.[1] ?? 0;
    const tokens     = { inputTokens: inputResult.inputTokens, outputTokens: inputResult.outputTokens };

    if (sourceHandle === "lang")       return { value: detected,   ...tokens };
    if (sourceHandle === "confidence") return { value: confidence, ...tokens };

    const passThrough = { value: inputResult.value, ...tokens };

    const matchedRoute = detected !== "und"
      ? routes.find((r) => r.lang === detected)
      : undefined;

    if (matchedRoute && sourceHandle === matchedRoute.id) return passThrough;
    if (!matchedRoute && hasDefault && sourceHandle === "default") return passThrough;

    return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new LanguageDetectNode();
