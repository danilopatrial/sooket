import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import { toText } from "./utils";
import { encode as gptEncode } from "gpt-tokenizer";

class TokenCounterNode implements INodeExecutor {
  async execute(_node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const inputSrc = ctx.inputFor("input");
    let text = "";
    if (inputSrc) {
      const r = await ctx.evalInput(inputSrc);
      if (r.active === false) return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
      text = toText(r.value);
    }
    return { value: gptEncode(text).length, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new TokenCounterNode();
