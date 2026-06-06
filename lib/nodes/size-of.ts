import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import { toText } from "./utils";

class SizeOfNode implements INodeExecutor {
  async execute(_node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const inputSrc = ctx.inputFor("input");
    let value: unknown = undefined;
    if (inputSrc) {
      const r = await ctx.evalInput(inputSrc);
      value = r.value;
    }
    let size: number;
    if (Array.isArray(value)) {
      size = value.length;
    } else if (value !== null && typeof value === "object") {
      size = Object.keys(value as object).length;
    } else {
      size = toText(value).length;
    }
    return { value: size, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new SizeOfNode();
