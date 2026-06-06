import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";
import type { ABSplitNodeData } from "@/lib/node-types";

class AbSplitNode implements INodeExecutor {
  async execute(node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext): Promise<EvalResult> {
    const { branches = [] } = (node.data as unknown) as ABSplitNodeData;

    const inputSrc = ctx.inputFor("input");
    if (!inputSrc) throw new Error("A/B Split node has no input connected");

    const inputResult = await ctx.evalInput(inputSrc);
    if (inputResult.active === false) {
      return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
    }

    if (branches.length === 0) throw new Error("A/B Split: no branches configured");

    const totalWeight = branches.reduce((s, b) => s + (b.weight ?? 0), 0);
    if (totalWeight !== 100) {
      throw new Error(`A/B Split: branch weights must sum to 100 (currently ${totalWeight})`);
    }

    const r = Math.random();
    let cumulative = 0;
    let selectedId: string | null = null;
    for (const branch of branches) {
      cumulative += (branch.weight ?? 0) / 100;
      if (r < cumulative) { selectedId = branch.id; break; }
    }
    // Floating-point safety: fall through to last branch
    if (selectedId === null) selectedId = branches[branches.length - 1].id;

    const passThrough = {
      value:        inputResult.value,
      inputTokens:  inputResult.inputTokens,
      outputTokens: inputResult.outputTokens,
    };

    if (sourceHandle === selectedId) return passThrough;
    return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new AbSplitNode();
