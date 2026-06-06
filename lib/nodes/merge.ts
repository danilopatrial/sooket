import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import type { MergeNodeData } from "@/lib/node-types";
import { toText } from "./utils";

class MergeNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const {
      mode       = "first",
      inputCount = 2,
      separator  = "",
      slotKeys   = [] as string[],
    } = (node.data as unknown) as MergeNodeData;

    interface MergeResult { index: number; value: unknown; inTok: number; outTok: number }
    const active: MergeResult[] = [];

    for (let i = 0; i < inputCount; i++) {
      const src = ctx.inputFor(`input-${i}`);
      if (!src) continue;
      const r = await ctx.evalInput(src);
      if (r.active === false) continue;
      active.push({ index: i, value: r.value, inTok: r.inputTokens, outTok: r.outputTokens });
    }

    if (active.length === 0) return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };

    const totalIn  = active.reduce((s, r) => s + r.inTok,  0);
    const totalOut = active.reduce((s, r) => s + r.outTok, 0);

    if (mode === "first") {
      const first = active[0];
      return { value: first.value, inputTokens: first.inTok, outputTokens: first.outTok };
    }

    if (mode === "join") {
      return { value: active.map((r) => toText(r.value)).join(separator), inputTokens: totalIn, outputTokens: totalOut };
    }

    const obj: Record<string, unknown> = {};
    for (const r of active) {
      const key = (slotKeys as string[])[r.index] ?? `field${r.index}`;
      obj[key] = r.value;
    }
    return { value: obj, inputTokens: totalIn, outputTokens: totalOut };
  }
}

export const execute = new MergeNode();
