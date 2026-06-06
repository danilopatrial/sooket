import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import type { WebhookNodeData } from "@/lib/node-types";
import { toText, resolveVars } from "./utils";

class WebhookNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const nodeData = (node.data as unknown) as WebhookNodeData;
    const mode = nodeData.mode ?? "action";

    // Trigger mode: this node is the workflow entry point receiving an inbound
    // HTTP request via /api/webhooks/[slug]. Pass the request body downstream.
    if (mode === "trigger") {
      const value = ctx.body ?? {};
      return { value, inputTokens: 0, outputTokens: 0 };
    }

    // Action mode: fire-and-forget outbound HTTP request.
    const inputSrc = ctx.inputFor("input");
    if (!inputSrc) throw new Error("Webhook node has no input connected");
    const r = await ctx.evalInput(inputSrc);
    if (r.active === false) return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };

    const {
      url: configUrl = "",
      method         = "POST",
      headers        = [],
      bodyTemplate   = "",
    } = nodeData;

    const urlSrc  = ctx.inputFor("url");
    const bodySrc = ctx.inputFor("body");

    let webhookUrl = resolveVars(configUrl, ctx.vars);
    if (urlSrc) {
      const ur = await ctx.evalInput(urlSrc);
      if (ur.value !== undefined) webhookUrl = toText(ur.value);
    }

    const hasBody = method === "POST" || method === "PUT" || method === "PATCH";
    let requestBody: string | undefined;
    if (hasBody) {
      if (bodySrc) {
        const br = await ctx.evalInput(bodySrc);
        if (br.value !== undefined) requestBody = toText(br.value);
      } else if (bodyTemplate) {
        requestBody = resolveVars(bodyTemplate, ctx.vars);
      }
    }

    const httpHeaders: Record<string, string> = {};
    for (const h of headers) {
      if (h.key && h.value) httpHeaders[h.key] = resolveVars(h.value, ctx.vars);
    }

    if (webhookUrl) {
      fetch(webhookUrl, { method, headers: httpHeaders, body: requestBody }).catch(() => {});
    }

    return { value: r.value, inputTokens: r.inputTokens, outputTokens: r.outputTokens };
  }
}

export const execute = new WebhookNode();
