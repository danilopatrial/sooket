import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";

class WorkflowInputNode implements INodeExecutor {
  async execute(node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext) {
    if (sourceHandle === "headers") {
      const obj: Record<string, string> = {};
      ctx.reqHeaders.forEach((v, k) => { obj[k] = v; });
      return { value: obj, inputTokens: 0, outputTokens: 0 };
    }
    if (sourceHandle === "query") {
      const obj: Record<string, string> = {};
      try {
        new URL(ctx.reqCtx.url).searchParams.forEach((v, k) => { obj[k] = v; });
      } catch { /* malformed url — return empty */ }
      return { value: obj, inputTokens: 0, outputTokens: 0 };
    }
    if (sourceHandle === "method") {
      return { value: ctx.reqCtx.method, inputTokens: 0, outputTokens: 0 };
    }
    if (sourceHandle === "raw") {
      return { value: ctx.reqCtx.rawBody, inputTokens: 0, outputTokens: 0 };
    }
    if (sourceHandle === "ip") {
      return { value: ctx.reqCtx.ip, inputTokens: 0, outputTokens: 0 };
    }
    return { value: ctx.body, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new WorkflowInputNode();
