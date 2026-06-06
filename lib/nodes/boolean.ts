import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";

class BooleanNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, _ctx: NodeContext) {
    const value = ((node.data as unknown) as { value?: boolean }).value ?? false;
    return { value, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new BooleanNode();
