import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import { resolveVars } from "./utils";

class TextNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const text = resolveVars(((node.data as unknown) as { text?: string }).text ?? "", ctx.vars);
    return { value: text, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new TextNode();
