import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import { toText, resolveVars } from "./utils";

class PickNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const inputSrc = ctx.inputFor("input");
    const keySrc   = ctx.inputFor("key");
    if (!inputSrc) throw new Error("Pick node has no object input connected");

    const objResult = await ctx.evalInput(inputSrc);
    if (objResult.active === false) return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };

    let pickKey: string;
    if (keySrc) {
      const kr = await ctx.evalInput(keySrc);
      pickKey = toText(kr.value);
    } else {
      pickKey = resolveVars(toText(((node.data as unknown) as import("@/lib/node-types").PickNodeData).key ?? ""), ctx.vars);
    }

    const obj = objResult.value;
    let result: unknown;
    if (Array.isArray(obj)) {
      const idx = parseInt(pickKey, 10);
      result = !isNaN(idx) ? obj[idx] : undefined;
    } else if (obj !== null && typeof obj === "object") {
      result = (obj as Record<string, unknown>)[pickKey];
    } else {
      result = undefined;
    }

    return { value: result, inputTokens: objResult.inputTokens, outputTokens: objResult.outputTokens };
  }
}

export const execute = new PickNode();
