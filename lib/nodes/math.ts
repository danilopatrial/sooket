import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";

class MathNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const aSrc = ctx.inputFor("a");
    const bSrc = ctx.inputFor("b");
    const { operator = "+", defaultA = 0, defaultB = 0 } = (node.data as unknown) as import("@/lib/node-types").MathNodeData;

    let a = defaultA;
    let b = defaultB;
    if (aSrc) {
      const r = await ctx.evalInput(aSrc);
      if (r.value !== undefined) {
        a = Number(r.value);
        if (isNaN(a)) throw new Error(`Math node: input A received a non-numeric value ("${r.value}")`);
      }
    }
    if (bSrc) {
      const r = await ctx.evalInput(bSrc);
      if (r.value !== undefined) {
        b = Number(r.value);
        if (isNaN(b)) throw new Error(`Math node: input B received a non-numeric value ("${r.value}")`);
      }
    }

    let result: number;
    switch (operator) {
      case "+":   result = a + b; break;
      case "-":   result = a - b; break;
      case "*":   result = a * b; break;
      case "/":   if (b === 0) throw new Error("Math node: division by zero"); result = a / b; break;
      case "%":   if (b === 0) throw new Error("Math node: modulo by zero"); result = a % b; break;
      case "**":  result = a ** b; break;
      case "min": result = Math.min(a, b); break;
      case "max": result = Math.max(a, b); break;
      case "abs": result = Math.abs(a); break;
      default:    result = 0;
    }
    return { value: result, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new MathNode();
