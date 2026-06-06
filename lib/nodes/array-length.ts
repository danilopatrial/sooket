import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";

class ArrayLengthNode implements INodeExecutor {
  async execute(_node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const inputSrc = ctx.inputFor("input");
    if (!inputSrc) throw new Error("Array Length node has no input connected");
    const r = await ctx.evalInput(inputSrc);
    const val = r.value;
    const length = Array.isArray(val) ? val.length
      : typeof val === "string" ? val.length
      : typeof val === "object" && val !== null ? Object.keys(val).length
      : 0;
    return { value: length, inputTokens: r.inputTokens, outputTokens: r.outputTokens };
  }
}

export const execute = new ArrayLengthNode();
