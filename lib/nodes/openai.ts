import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import type { OpenAINodeData } from "@/lib/node-types";
import { toText, resolveVars } from "./utils";

/**
 * OpenAI-compatible chat node. Talks the OpenAI `/chat/completions` shape, so a
 * single node covers OpenAI plus any compatible endpoint (Together, Groq,
 * OpenRouter, a local Ollama / LM Studio server, …) via a configurable
 * `baseURL`. Mirrors the Anthropic node's input handles; the provider key is
 * read under the `"openai"` provider name.
 */
const DEFAULT_BASE_URL = "https://api.openai.com/v1";

class OpenAINode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const apiKey = await ctx.getProviderKey("openai");
    if (!apiKey) throw new Error("No OpenAI API key configured for this workflow");

    const data = (node.data as unknown) as OpenAINodeData;
    let model        = data.model        ?? "gpt-4o-mini";
    let systemPrompt = resolveVars(data.systemPrompt ?? "", ctx.vars);
    let temperature  = data.temperature  ?? 0.7;
    const baseUrl    = (resolveVars(data.baseURL ?? "", ctx.vars).trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
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

    if (!userMessage.trim()) throw new Error("OpenAI node: user message is empty — connect a value to the userPrompt handle");

    type Message = { role: "system" | "user" | "assistant"; content: string };
    let historyMessages: Message[] = [];
    const historySrc = ctx.inputFor("history");
    if (historySrc) {
      const r = await ctx.evalInput(historySrc);
      if (r.active !== false && Array.isArray(r.value)) {
        historyMessages = (r.value as unknown[]).filter(
          (m): m is Message =>
            m !== null &&
            typeof m === "object" &&
            typeof (m as Message).role === "string" &&
            typeof (m as Message).content === "string" &&
            ((m as Message).role === "user" || (m as Message).role === "assistant")
        );
      }
    }

    const messages: Message[] = [];
    if (systemPrompt.trim()) messages.push({ role: "system", content: systemPrompt });
    messages.push(...historyMessages, { role: "user", content: userMessage });

    const payload: Record<string, unknown> = { model, messages, temperature };

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Upstream provider error: ${errText}`);
    }

    const resBody = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    return {
      value: resBody.choices?.[0]?.message?.content ?? "",
      inputTokens: resBody.usage?.prompt_tokens ?? 0,
      outputTokens: resBody.usage?.completion_tokens ?? 0,
      model,
    };
  }
}

export const execute = new OpenAINode();
