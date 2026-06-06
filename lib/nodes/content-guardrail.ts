import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";
import type { ContentGuardrailNodeData } from "@/lib/node-types";
import { toText, resolveVars } from "./utils";

class ContentGuardrailNode implements INodeExecutor {
  async execute(node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext) {
    const inputSrc = ctx.inputFor("input");
    if (!inputSrc) throw new Error("Content Guardrail node has no input connected");

    const inputResult = await ctx.evalInput(inputSrc);
    if (inputResult.active === false) return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };

    const text = toText(inputResult.value);

    const { patterns = [], useLlm = false, llmRules = "", action = "block" } = (node.data as unknown) as ContentGuardrailNodeData;

    let violation    = false;
    let violationMsg = "";

    for (const pattern of patterns) {
      const raw = resolveVars(pattern.text ?? "", ctx.vars).trim();
      if (!raw) continue;
      const terms = raw.split(",").map((t) => t.trim()).filter(Boolean);
      for (const term of terms) {
        try {
          const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
          if (re.test(text)) {
            violation    = true;
            violationMsg = `Pattern match: "${term}"`;
            break;
          }
        } catch {
          // malformed term — skip silently
        }
      }
      if (violation) break;
    }

    let llmInputTokens  = 0;
    let llmOutputTokens = 0;

    if (!violation && useLlm && llmRules.trim()) {
      const anthropicApiKey = await ctx.getProviderKey("anthropic");
      if (!anthropicApiKey) throw new Error("Content Guardrail (LLM mode): no Anthropic API key configured for this workflow");

      const guardrailPrompt =
        `You are a content safety classifier. Check whether the following text violates any of these rules:\n${llmRules}\n\n` +
        `Text to check:\n${text}\n\n` +
        `Reply with only valid JSON in this exact format: {"violation":boolean,"reason":string}`;

      try {
        const llmRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key":           anthropicApiKey,
            "anthropic-version":   "2023-06-01",
            "Content-Type":        "application/json",
          },
          body: JSON.stringify({
            model:      "claude-haiku-4-5-20251001",
            max_tokens: 128,
            messages:   [{ role: "user", content: guardrailPrompt }],
          }),
        });

        if (llmRes.ok) {
          const llmBody = await llmRes.json() as {
            content: Array<{ type: string; text: string }>;
            usage:   { input_tokens: number; output_tokens: number };
          };
          llmInputTokens  = llmBody.usage.input_tokens;
          llmOutputTokens = llmBody.usage.output_tokens;
          const rawText   = llmBody.content.find((c) => c.type === "text")?.text ?? "";
          try {
            const parsed = JSON.parse(rawText.trim()) as { violation?: unknown; reason?: unknown };
            if (parsed.violation === true) {
              violation    = true;
              violationMsg = typeof parsed.reason === "string" && parsed.reason
                ? `LLM: ${parsed.reason}`
                : "LLM: content policy violation";
            }
          } catch {
            // unparseable JSON — fail open
          }
        }
      } catch {
        // network error — fail open
      }
    }

    const totalIn  = inputResult.inputTokens  + llmInputTokens;
    const totalOut = inputResult.outputTokens + llmOutputTokens;

    if (violation) {
      const flaggedResult: EvalResult = { value: violationMsg, inputTokens: totalIn, outputTokens: totalOut };
      const safeResult:    EvalResult = action === "block"
        ? { value: undefined, active: false, inputTokens: totalIn, outputTokens: totalOut }
        : { value: inputResult.value,        inputTokens: totalIn, outputTokens: totalOut };

      ctx.cache.set(`${ctx.nodeId}:output`,  safeResult);
      ctx.cache.set(`${ctx.nodeId}:flagged`, flaggedResult);
      if (sourceHandle === "flagged") return flaggedResult;
      return safeResult;
    }

    const outputResult:  EvalResult = { value: inputResult.value, inputTokens: totalIn, outputTokens: totalOut };
    const flaggedResult: EvalResult = { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
    ctx.cache.set(`${ctx.nodeId}:output`,  outputResult);
    ctx.cache.set(`${ctx.nodeId}:flagged`, flaggedResult);
    if (sourceHandle === "flagged") return flaggedResult;
    return outputResult;
  }
}

export const execute = new ContentGuardrailNode();
