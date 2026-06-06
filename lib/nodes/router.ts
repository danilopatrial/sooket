import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";
import type { RouterNodeData } from "@/lib/node-types";
import { toText } from "./utils";

class RouterNode implements INodeExecutor {
  async execute(node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext): Promise<EvalResult> {
    const { cases = [], hasDefault = false } = (node.data as unknown) as RouterNodeData;

    const inputSrc = ctx.inputFor("input");
    const dataSrc  = ctx.inputFor("data");
    if (!inputSrc) throw new Error("Router node has no input connected");

    const inputResult = await ctx.evalInput(inputSrc);
    if (inputResult.active === false) {
      return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
    }

    const inputStr = toText(inputResult.value);

    let outVal: unknown = inputResult.value;
    if (dataSrc) {
      const dataResult = await ctx.evalInput(dataSrc);
      if (dataResult.active !== false) outVal = dataResult.value;
    }

    const passThrough = {
      value:        outVal,
      inputTokens:  inputResult.inputTokens,
      outputTokens: inputResult.outputTokens,
    };

    const matchedCase = cases.find((c) => {
      const raw = inputResult.value;
      if (typeof raw === "number") {
        const numMatch = Number(c.match);
        return !isNaN(numMatch) && raw === numMatch;
      }
      if (typeof raw === "boolean") return String(raw) === c.match;
      return inputStr === c.match;
    });

    if (matchedCase && sourceHandle === matchedCase.id) return passThrough;
    if (!matchedCase && hasDefault && sourceHandle === "default") return passThrough;

    return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new RouterNode();
