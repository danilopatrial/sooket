import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import { toText } from "./utils";

class PromptCompressionNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const inputSrc = ctx.inputFor("input");
    if (!inputSrc) throw new Error("Prompt Compression node has no input connected");

    const inputResult = await ctx.evalInput(inputSrc);
    if (inputResult.active === false) return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };

    const text = toText(inputResult.value);

    const {
      compressionPrompt = "Summarize the following concisely, preserving all key information:",
      targetWords       = null,
    } = (node.data as unknown) as { compressionPrompt?: string; targetWords?: number | null };

    const anthropicApiKey = await ctx.getProviderKey("anthropic");
    if (!anthropicApiKey) throw new Error("Prompt Compression: no Anthropic API key configured for this workflow");

    const instruction = targetWords && targetWords > 0
      ? `${compressionPrompt} in under ${targetWords} words.`
      : compressionPrompt;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":           anthropicApiKey,
        "anthropic-version":   "2023-06-01",
        "Content-Type":        "application/json",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages:   [{ role: "user", content: `${instruction}\n\n${text}` }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Prompt Compression: Anthropic API error ${res.status}: ${errBody}`);
    }

    const resBody = await res.json() as {
      content: Array<{ type: string; text: string }>;
      usage:   { input_tokens: number; output_tokens: number };
    };

    const compressed   = resBody.content.find((c) => c.type === "text")?.text ?? "";
    const inputTokens  = inputResult.inputTokens  + resBody.usage.input_tokens;
    const outputTokens = inputResult.outputTokens + resBody.usage.output_tokens;

    return { value: compressed, inputTokens, outputTokens };
  }
}

export const execute = new PromptCompressionNode();
