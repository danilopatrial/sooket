import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import type { IfNodeData } from "@/lib/node-types";
import { toText, resolveVars } from "./utils";

class IfNode implements INodeExecutor {
  async execute(node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext) {
    const inputSrc   = ctx.inputFor("input");
    const compareSrc = ctx.inputFor("compare");
    const dataSrc    = ctx.inputFor("data");

    if (!inputSrc) throw new Error("If node has no input connected");

    const inputResult = await ctx.evalInput(inputSrc);
    if (inputResult.active === false) return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };

    const inputVal = inputResult.value;
    const nodeData = (node.data as unknown) as IfNodeData;
    const operator = nodeData.operator ?? "==";
    const compareTo = resolveVars(nodeData.compareTo ?? "", ctx.vars);

    let compareVal: unknown = compareTo;
    if (compareSrc) {
      const r = await ctx.evalInput(compareSrc);
      compareVal = r.value;
    }

    const a   = toText(inputVal);
    const b   = toText(compareVal);
    const num = Number(inputVal);
    const cmp = Number(compareVal);

    let result: boolean;
    switch (operator) {
      case "==":         result = a === b; break;
      case "!=":         result = a !== b; break;
      case ">":          result = !isNaN(num) && !isNaN(cmp) && num > cmp;  break;
      case "<":          result = !isNaN(num) && !isNaN(cmp) && num < cmp;  break;
      case ">=":         result = !isNaN(num) && !isNaN(cmp) && num >= cmp; break;
      case "<=":         result = !isNaN(num) && !isNaN(cmp) && num <= cmp; break;
      case "contains":   result = a.includes(b);    break;
      case "startsWith": result = a.startsWith(b);  break;
      case "endsWith":   result = a.endsWith(b);    break;
      case "isEmpty":    result = inputVal === null || inputVal === undefined || a === ""; break;
      case "isTruthy":   result = !!inputVal;        break;
      default:           result = false;
    }

    let outVal: unknown = inputVal;
    if (dataSrc) {
      const dataResult = await ctx.evalInput(dataSrc);
      if (dataResult.active !== false) outVal = dataResult.value;
    }

    if (sourceHandle === "true"  &&  result) return { value: outVal, inputTokens: 0, outputTokens: 0 };
    if (sourceHandle === "false" && !result) return { value: outVal, inputTokens: 0, outputTokens: 0 };

    return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new IfNode();
