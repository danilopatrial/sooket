import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import type { JsonBuilderNodeData } from "@/lib/node-types";

class JsonBuilderNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const fields = ((node.data as unknown) as JsonBuilderNodeData).fields ?? [];
    const obj: Record<string, unknown> = {};
    let totalIn = 0, totalOut = 0;
    for (const f of fields) {
      if (!f.key) continue;
      const src = ctx.inputFor(f.id);
      if (src) {
        const r = await ctx.evalInput(src);
        totalIn  += r.inputTokens;
        totalOut += r.outputTokens;
        obj[f.key] = r.value;
      } else if (f.fallback !== undefined) {
        obj[f.key] = f.fallback;
      }
    }
    return { value: obj, inputTokens: totalIn, outputTokens: totalOut };
  }
}

export const execute = new JsonBuilderNode();
