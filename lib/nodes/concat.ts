import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import { toText, resolveVars } from "./utils";

class ConcatNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const { inputCount = 2 } = (node.data as unknown) as { separator?: string; inputCount?: number };
    const separator = resolveVars(((node.data as unknown) as { separator?: string }).separator ?? "", ctx.vars);
    const parts: string[] = [];
    for (let i = 0; i < inputCount; i++) {
      const src = ctx.inputFor(`input-${i}`);
      if (src) {
        const r = await ctx.evalInput(src);
        if (r.active === false) return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
        parts.push(toText(r.value));
      }
    }
    return { value: parts.join(separator), inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new ConcatNode();
