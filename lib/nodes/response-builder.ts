import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import type { ResponseBuilderNodeData } from "@/lib/node-types";
import { resolveVars } from "./utils";

class ResponseBuilderNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const { status: staticStatus = 200, headers: staticHeaders = [] } = (node.data as unknown) as ResponseBuilderNodeData;

    let statusCode = staticStatus;
    const statusSrc = ctx.inputFor("status");
    if (statusSrc) {
      const r = await ctx.evalInput(statusSrc);
      if (r.value !== undefined) statusCode = Number(r.value);
    }

    let bodyVal: unknown = undefined;
    const bodyEdges = ctx.workflow.edges.filter(
      (e) => e.target === ctx.nodeId && e.targetHandle === "body"
    );
    if (bodyEdges.length > 0) {
      let bodyResult = null;
      for (const edge of bodyEdges) {
        const src = ctx.workflow.nodes.find((n) => n.id === edge.source);
        if (!src) continue;
        const r = await ctx.evalInput({ node: src, sourceHandle: edge.sourceHandle });
        if (r.active !== false) { bodyResult = r; break; }
      }
      if (!bodyResult) return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
      bodyVal = bodyResult.value;
    }

    const rbHeaders: Record<string, string> = {};
    for (const h of staticHeaders) {
      if (!h.key) continue;
      const headerSrc = ctx.inputFor(`header-${h.id}`);
      if (headerSrc) {
        const r = await ctx.evalInput(headerSrc);
        if (r.value !== undefined) rbHeaders[h.key] = String(r.value);
      } else if (h.value) {
        rbHeaders[h.key] = resolveVars(h.value, ctx.vars);
      }
    }

    return {
      value: { __rb: true, status: statusCode, headers: rbHeaders, body: bodyVal },
      inputTokens: 0,
      outputTokens: 0,
    };
  }
}

export const execute = new ResponseBuilderNode();
