import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";

class SubWorkflowNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext): Promise<EvalResult> {
    const inputSrc = ctx.inputFor("input");
    if (!inputSrc) throw new Error("Sub-Workflow node has no input connected");

    const { slug = "" } = (node.data as unknown) as import("@/lib/node-types").SubWorkflowNodeData;
    if (!slug.trim()) throw new Error("Sub-Workflow node: no workflow slug configured");

    const inputResult = await ctx.evalInput(inputSrc);
    const inputValue = inputResult.value;

    const subInput: Record<string, unknown> =
      inputValue !== null && typeof inputValue === "object" && !Array.isArray(inputValue)
        ? (inputValue as Record<string, unknown>)
        : { input: inputValue };

    if (!ctx.executeSubWorkflow) {
      throw new Error("executeSubWorkflow is not available in this context");
    }

    const result = await ctx.executeSubWorkflow(slug.trim(), subInput);

    // Propagate token counts upward
    return {
      value: result.value,
      inputTokens: (inputResult.inputTokens ?? 0) + (result.inputTokens ?? 0),
      outputTokens: (inputResult.outputTokens ?? 0) + (result.outputTokens ?? 0),
      model: result.model,
    };
  }
}

export const execute = new SubWorkflowNode();

