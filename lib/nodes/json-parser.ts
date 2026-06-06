import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import type { JsonParserNodeData } from "@/lib/node-types";
import { resolvePath } from "./utils";

class JsonParserNode implements INodeExecutor {
  async execute(node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext) {
    const inputEdge = ctx.workflow.edges.find((e) => e.target === ctx.nodeId && e.targetHandle === "input");
    if (!inputEdge) throw new Error("JSON Parser has no input connected");

    let data: Record<string, unknown> = {};
    const inputSrc = ctx.workflow.nodes.find((n) => n.id === inputEdge.source);
    if (inputSrc) {
      const r = await ctx.evalInput({ node: inputSrc, sourceHandle: inputEdge.sourceHandle });
      if (typeof r.value === "string") {
        try { data = JSON.parse(r.value); } catch { data = {}; }
      } else if (r.value && typeof r.value === "object") {
        data = r.value as Record<string, unknown>;
      }
    }
    const fields = ((node.data as unknown) as JsonParserNodeData).fields ?? [];
    const field = fields.find((f) => f.id === sourceHandle);
    if (!field?.name) return { value: undefined, inputTokens: 0, outputTokens: 0 };
    const resolved = resolvePath(data, field.name);
    const result = resolved !== undefined ? resolved : (field.defaultValue ?? undefined);
    return { value: result, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new JsonParserNode();
