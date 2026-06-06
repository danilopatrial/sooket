import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import { toText } from "./utils";

class TypeCastNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const inputSrc = ctx.inputFor("input");
    if (!inputSrc) throw new Error("Type Cast node has no input connected");
    const r = await ctx.evalInput(inputSrc);
    const { target = "string" } = (node.data as unknown) as import("@/lib/node-types").TypeCastNodeData;
    let result: unknown;
    switch (target) {
      case "number": result = Number(r.value); break;
      case "boolean": {
        const v = r.value;
        if (typeof v === "boolean") {
          result = v;
        } else if (typeof v === "number") {
          result = v !== 0;
        } else {
          const s = String(v ?? "").trim().toLowerCase();
          result = s !== "" && s !== "false" && s !== "0" && s !== "no" && s !== "off";
        }
        break;
      }
      default: result = toText(r.value); break;
    }
    return { value: result, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new TypeCastNode();
