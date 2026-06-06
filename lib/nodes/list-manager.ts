import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";
import { toText } from "./utils";

class ListManagerNode implements INodeExecutor {
  async execute(node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext) {
    const valueSrc  = ctx.inputFor("value");
    const actionSrc = ctx.inputFor("action");

    if (!valueSrc) throw new Error("List Manager node has no value input connected");

    const valueResult = await ctx.evalInput(valueSrc);
    if (valueResult.active === false) return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };

    const entryValue = toText(valueResult.value).trim();

    const VALID_ENTRY_TYPES = ["value", "ip", "cidr", "header"] as const;
    type EntryType = typeof VALID_ENTRY_TYPES[number];
    const nodeData = (node.data as unknown) as import("@/lib/node-types").ListManagerNodeData;
    let resolvedAction = nodeData.action ?? "add";
    const entryType: EntryType = VALID_ENTRY_TYPES.includes(nodeData.entryType as EntryType)
      ? (nodeData.entryType as EntryType)
      : "value";
    if (actionSrc) {
      const ar = await ctx.evalInput(actionSrc);
      const av = toText(ar.value).trim().toLowerCase();
      if (av === "add" || av === "remove") resolvedAction = av;
    }

    let success = false;
    let errorMsg = "";

    if (!entryValue) {
      errorMsg = "value is empty";
    } else {
      try {
        if (resolvedAction === "add") {
          ctx.addAccessListEntry(entryValue, entryType);
        } else {
          ctx.removeAccessListEntry(entryValue);
        }
        success = true;
      } catch (err) {
        errorMsg = err instanceof Error ? err.message : String(err);
      }
    }

    const valueOut:   EvalResult = { value: valueResult.value, inputTokens: 0, outputTokens: 0 };
    const successOut: EvalResult = { value: success,           inputTokens: 0, outputTokens: 0 };
    const errorOut:   EvalResult = { value: errorMsg,          inputTokens: 0, outputTokens: 0 };
    ctx.cache.set(`${ctx.nodeId}:value`,   valueOut);
    ctx.cache.set(`${ctx.nodeId}:success`, successOut);
    ctx.cache.set(`${ctx.nodeId}:error`,   errorOut);

    if (sourceHandle === "success") return successOut;
    if (sourceHandle === "error")   return errorOut;
    return valueOut;
  }
}

export const execute = new ListManagerNode();
