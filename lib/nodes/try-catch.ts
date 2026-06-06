import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";

class TryCatchNode implements INodeExecutor {
  async execute(_node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext) {
    const trySrc = ctx.inputFor("try");
    if (!trySrc) throw new Error("Try/Catch node has no try input connected");

    let tryResult: EvalResult;
    let caughtError: string | null = null;

    try {
      tryResult = await ctx.evalInput(trySrc);
    } catch (err) {
      caughtError = err instanceof Error ? err.message : String(err);
      tryResult = { value: undefined, inputTokens: 0, outputTokens: 0 };
    }

    if (caughtError !== null) {
      const errorResult:    EvalResult = { value: caughtError, inputTokens: 0, outputTokens: 0 };
      const inactiveResult: EvalResult = { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
      ctx.cache.set(`${ctx.nodeId}:result`, inactiveResult);
      ctx.cache.set(`${ctx.nodeId}:error`,  errorResult);
      if (sourceHandle === "result") return inactiveResult;
      return errorResult;
    }

    if (tryResult.active === false) {
      return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
    }

    const successResult: EvalResult = {
      value:        tryResult.value,
      inputTokens:  tryResult.inputTokens,
      outputTokens: tryResult.outputTokens,
    };
    const inactiveError: EvalResult = { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
    ctx.cache.set(`${ctx.nodeId}:result`, successResult);
    ctx.cache.set(`${ctx.nodeId}:error`,  inactiveError);
    if (sourceHandle === "error") return inactiveError;
    return successResult;
  }
}

export const execute = new TryCatchNode();
