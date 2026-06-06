import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";

class NumberNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, _ctx: NodeContext) {
    const d = (node.data as unknown) as { fixedValue?: number | null; value?: number };
    return { value: d.fixedValue ?? d.value ?? 0, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new NumberNode();
