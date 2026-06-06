import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import type { PiiRedactNodeData } from "@/lib/node-types";
import { toText } from "./utils";
import { PiiRedactor, PatternRecognizer, createDefaultRecognizers } from "@/lib/pii/index.js";

class PiiRedactNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const inputSrc = ctx.inputFor("input");
    let text = "";
    if (inputSrc) {
      const r = await ctx.evalInput(inputSrc);
      text = toText(r.value);
    }
    const { replacement, customPatterns } = (node.data as unknown) as PiiRedactNodeData;

    const recognizers = createDefaultRecognizers();

    if (customPatterns?.length) {
      class InlineRecognizer extends PatternRecognizer {
        constructor(label: string, regex: string) {
          super(label, [{ name: label, regex, score: 0.85 }]);
        }
      }
      for (const p of customPatterns) {
        if (p.label && p.regex) recognizers.push(new InlineRecognizer(p.label, p.regex));
      }
    }

    const redactor = new PiiRedactor(recognizers);
    const redacted = redactor.redact(text, { replacement: replacement || undefined });
    return { value: redacted, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new PiiRedactNode();
