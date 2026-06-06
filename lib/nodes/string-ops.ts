import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import type { StringOpsNodeData } from "@/lib/node-types";
import { toText, resolveVars } from "./utils";

class StringOpsNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const inputSrc = ctx.inputFor("input");
    if (!inputSrc) throw new Error("String Ops node has no input connected");
    const r = await ctx.evalInput(inputSrc);
    const str = toText(r.value);
    const { op = "uppercase", sliceStart = 0, sliceEnd = 0, sliceEndEnabled = false } = (node.data as unknown) as StringOpsNodeData;
    const separator = resolveVars(((node.data as unknown) as StringOpsNodeData).separator ?? ",", ctx.vars);
    let result: unknown;
    switch (op) {
      case "uppercase": result = str.toUpperCase(); break;
      case "lowercase": result = str.toLowerCase(); break;
      case "trim":      result = str.trim(); break;
      case "split":     result = str.split(separator); break;
      case "slice":     result = sliceEndEnabled ? str.slice(sliceStart, sliceEnd) : str.slice(sliceStart); break;
      default:          result = str;
    }
    return { value: result, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new StringOpsNode();
