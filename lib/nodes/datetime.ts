import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import { toText } from "./utils";

class DatetimeNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const { mode = "now", formatStr = "ISO" } = (node.data as unknown) as import("@/lib/node-types").DateTimeNodeData;
    let date: Date;
    if (mode === "format") {
      const inputSrc = ctx.inputFor("input");
      if (!inputSrc) throw new Error("Date/Time node in format mode has no input connected");
      const r = await ctx.evalInput(inputSrc);
      date = new Date(toText(r.value));
    } else {
      date = new Date();
    }
    let result: unknown;
    switch (formatStr) {
      case "ISO":    result = date.toISOString(); break;
      case "unix":   result = Math.floor(date.getTime() / 1000); break;
      case "locale": result = date.toLocaleString(); break;
      default:       result = date.toISOString(); break;
    }
    return { value: result, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new DatetimeNode();
