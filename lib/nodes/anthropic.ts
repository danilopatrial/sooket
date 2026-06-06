import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import type { AnthropicNodeData } from "@/lib/node-types";
import { toText, resolveVars } from "./utils";

const NO_TEMPERATURE_MODELS = new Set(["claude-opus-4-7", "claude-sonnet-4-6"]);

class AnthropicNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const anthropicApiKey = await ctx.getProviderKey("anthropic");
    if (!anthropicApiKey) throw new Error("No Anthropic API key configured for this workflow");

    const aData = (node.data as unknown) as AnthropicNodeData;
    let model        = aData.model        ?? "claude-sonnet-4-6";
    let systemPrompt = resolveVars(aData.systemPrompt ?? "", ctx.vars);
    let temperature  = aData.temperature  ?? 0.7;
    let userMessage  = "";

    const modelSrc = ctx.inputFor("model");
    if (modelSrc) {
      const r = await ctx.evalInput(modelSrc);
      if (r.value !== undefined) model = toText(r.value).trim() || model;
    }

    const sysSrc = ctx.inputFor("systemPrompt");
    if (sysSrc) {
      const r = await ctx.evalInput(sysSrc);
      if (r.value !== undefined) systemPrompt = toText(r.value);
    }

    const tempSrc = ctx.inputFor("temperature");
    if (tempSrc) {
      const r = await ctx.evalInput(tempSrc);
      if (r.value !== undefined) temperature = Number(r.value);
    }

    const userSrc = ctx.inputFor("userPrompt");
    if (userSrc) {
      const r = await ctx.evalInput(userSrc);
      if (r.active === false) return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
      userMessage = toText(r.value);
    }

    if (!userMessage.trim()) throw new Error("Anthropic node: user message is empty — connect a value to the userPrompt handle");

    type Message = { role: "user" | "assistant"; content: string };
    let historyMessages: Message[] = [];
    const historySrc = ctx.inputFor("history");
    if (historySrc) {
      const r = await ctx.evalInput(historySrc);
      if (r.active !== false && Array.isArray(r.value)) {
        historyMessages = (r.value as unknown[]).filter(
          (m): m is Message =>
            m !== null &&
            typeof m === "object" &&
            (typeof (m as Message).role === "string") &&
            (typeof (m as Message).content === "string") &&
            ((m as Message).role === "user" || (m as Message).role === "assistant")
        );
      }
    }

    const anthropicPayload: Record<string, unknown> = {
      model,
      system: systemPrompt,
      messages: [...historyMessages, { role: "user", content: userMessage }],
      max_tokens: 8192,
    };
    if (!NO_TEMPERATURE_MODELS.has(model)) {
      anthropicPayload.temperature = temperature;
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(anthropicPayload),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      throw new Error(`Upstream provider error: ${errText}`);
    }

    const resBody = await anthropicRes.json() as {
      content: Array<{ type: string; text: string }>;
      usage: { input_tokens: number; output_tokens: number };
    };

    return {
      value: resBody.content.find((c) => c.type === "text")?.text ?? "",
      inputTokens: resBody.usage.input_tokens,
      outputTokens: resBody.usage.output_tokens,
      model,
    };
  }
}

export const execute = new AnthropicNode();
