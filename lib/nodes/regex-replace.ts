import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import { toText, resolveVars } from "./utils";

class RegexReplaceNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const inputSrc   = ctx.inputFor("input");
    const patternSrc = ctx.inputFor("pattern");
    const replaceSrc = ctx.inputFor("replace");

    let str = "";
    if (inputSrc) {
      const r = await ctx.evalInput(inputSrc);
      str = toText(r.value);
    }

    let pattern = resolveVars(((node.data as unknown) as import("@/lib/node-types").RegexReplaceNodeData).pattern ?? "", ctx.vars);
    if (patternSrc) {
      const r = await ctx.evalInput(patternSrc);
      if (r.value !== undefined) pattern = toText(r.value);
    }

    let replace = resolveVars(((node.data as unknown) as import("@/lib/node-types").RegexReplaceNodeData).replace ?? "", ctx.vars);
    if (replaceSrc) {
      const r = await ctx.evalInput(replaceSrc);
      if (r.value !== undefined) replace = toText(r.value);
    }

    const flags = String(((node.data as unknown) as import("@/lib/node-types").RegexReplaceNodeData).flags ?? "g");
    if (!pattern) return { value: str, inputTokens: 0, outputTokens: 0 };
    let re: RegExp;
    try {
      re = new RegExp(pattern, flags);
    } catch {
      throw new Error(`Regex Replace: invalid pattern "${pattern}" with flags "${flags}"`);
    }
    return { value: str.replace(re, replace), inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new RegexReplaceNode();
