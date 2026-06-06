import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import { resolveVars } from "./utils";

class NullCheckNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const inputSrc    = ctx.inputFor("input");
    const fallbackSrc = ctx.inputFor("fallback");
    const staticFallback = resolveVars(((node.data as unknown) as import("@/lib/node-types").NullCheckNodeData).fallback ?? "", ctx.vars);

    let inputVal: unknown = undefined;
    if (inputSrc) {
      const r = await ctx.evalInput(inputSrc);
      if (r.active === false) return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
      inputVal = r.value;
    }

    if (inputVal !== null && inputVal !== undefined) {
      return { value: inputVal, inputTokens: 0, outputTokens: 0 };
    }

    if (fallbackSrc) {
      const r = await ctx.evalInput(fallbackSrc);
      return { value: r.value, inputTokens: r.inputTokens, outputTokens: r.outputTokens };
    }
    return { value: staticFallback, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new NullCheckNode();
