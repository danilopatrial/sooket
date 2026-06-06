import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import type { TemplateStringNodeData } from "@/lib/node-types";
import { toText, resolveVars } from "./utils";

class TemplateStringNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const { template = "", slots = [] } = (node.data as unknown) as TemplateStringNodeData;

    // resolveNodeData may resolve a pure {{ expr }} to a non-string raw value
    if (typeof template !== "string") {
      return { value: template, inputTokens: 0, outputTokens: 0 };
    }

    let result = template;
    let totalIn = 0, totalOut = 0;

    for (const slot of slots) {
      if (!slot.name) continue;
      const src = ctx.inputFor(slot.name);
      let val: string;
      if (src) {
        const r = await ctx.evalInput(src);
        totalIn  += r.inputTokens;
        totalOut += r.outputTokens;
        val = toText(r.value);
      } else {
        val = resolveVars(slot.fallback ?? "", ctx.vars);
      }
      result = result.split(`{{${slot.name}}}`).join(val);
    }

    result = resolveVars(result, ctx.vars);
    return { value: result, inputTokens: totalIn, outputTokens: totalOut };
  }
}

export const execute = new TemplateStringNode();
