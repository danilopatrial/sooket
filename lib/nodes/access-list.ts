import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";
import { toText } from "./utils";

class AccessListNode implements INodeExecutor {
  async execute(node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext) {
    const inputSrc = ctx.inputFor("input");
    if (!inputSrc) throw new Error("Access List node has no input connected");

    const inputResult = await ctx.evalInput(inputSrc);
    if (inputResult.active === false) return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };

    const inputStr = toText(inputResult.value).toLowerCase();
    const listSet = new Set(ctx.getAccessList().map((v) => v.toLowerCase()));

    const { mode = "whitelist" } = (node.data as unknown) as import("@/lib/node-types").AccessListNodeData;
    const inList = listSet.has(inputStr);
    const passes = mode === "whitelist" ? inList : !inList;

    const matchResult: EvalResult = { value: inList,  inputTokens: 0, outputTokens: 0 };
    const passResult:  EvalResult = passes
      ? { value: inputResult.value, inputTokens: 0, outputTokens: 0 }
      : { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
    const blockResult: EvalResult = !passes
      ? { value: inputResult.value, inputTokens: 0, outputTokens: 0 }
      : { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };

    ctx.cache.set(`${ctx.nodeId}:match`, matchResult);
    ctx.cache.set(`${ctx.nodeId}:pass`,  passResult);
    ctx.cache.set(`${ctx.nodeId}:block`, blockResult);

    if (sourceHandle === "match") return matchResult;
    if (sourceHandle === "block") return blockResult;
    return passResult;
  }
}

export const execute = new AccessListNode();
