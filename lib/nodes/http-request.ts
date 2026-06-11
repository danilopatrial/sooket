import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";
import type { HttpRequestNodeData } from "@/lib/node-types";
import { toText, resolveVars } from "./utils";
import { assertEgressAllowed } from "@/lib/security/ssrf";

class HttpRequestNode implements INodeExecutor {
  async execute(node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext) {
    const urlSrc  = ctx.inputFor("url");
    const bodySrc = ctx.inputFor("body");

    const { url: configUrl = "", method = "GET", headers = [], timeout = 10000 } = (node.data as unknown) as HttpRequestNodeData;

    let requestUrl = resolveVars(configUrl, ctx.vars);
    if (urlSrc) {
      const r = await ctx.evalInput(urlSrc);
      if (r.value !== undefined) requestUrl = toText(r.value);
    }

    let requestBody: string | undefined;
    if (bodySrc && method !== "GET") {
      const r = await ctx.evalInput(bodySrc);
      requestBody = r.value === null || r.value === undefined ? undefined : toText(r.value);
    }

    const httpHeaders: Record<string, string> = {};
    for (const h of headers) {
      if (h.key && h.value) httpHeaders[h.key] = resolveVars(h.value, ctx.vars);
    }

    // SSRF guard: reject internal/private targets before opening any connection.
    await assertEgressAllowed(requestUrl);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    let responseStatus = 0;
    let responseOk = false;
    let responseBodyVal: unknown = "";

    try {
      const res = await fetch(requestUrl, {
        method,
        headers: httpHeaders,
        body: requestBody,
        signal: controller.signal,
      });
      clearTimeout(timer);
      responseStatus = res.status;
      responseOk     = res.ok;

      const contentType = res.headers?.get("content-type") ?? "";
      const isText =
        contentType === "" ||
        contentType.startsWith("text/") ||
        contentType === "application/json" ||
        contentType === "application/ld+json" ||
        contentType.startsWith("application/json;") ||
        contentType.startsWith("application/ld+json;");

      if (isText) {
        const responseText = await res.text();
        responseBodyVal = responseText;
        try { responseBodyVal = JSON.parse(responseText); } catch { /* keep as string */ }
      } else {
        const buffer = Buffer.from(await res.arrayBuffer());
        const mimeType = contentType.split(";")[0].trim();

        let fileName = "file";
        const disposition = res.headers?.get("content-disposition") ?? "";
        const fnMatch = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\r\n]+)["']?/i);
        if (fnMatch?.[1]) {
          fileName = decodeURIComponent(fnMatch[1].trim());
        } else {
          try {
            const urlPath = new URL(requestUrl).pathname;
            const segment = urlPath.split("/").pop() ?? "";
            if (segment) fileName = segment;
          } catch { /* keep default */ }
        }

        if (ctx.binaryData !== undefined && ctx.executionId !== undefined) {
          responseBodyVal = await ctx.binaryData.write(buffer, mimeType, fileName, ctx.executionId);
        } else {
          responseBodyVal = {
            _binary: true,
            base64: buffer.toString("base64"),
            mimeType,
          };
        }
      }
    } catch (err) {
      clearTimeout(timer);
      // fetch only rejects on network-level failure (DNS, connection refused, or an
      // aborted/timed-out request) — never on an HTTP error status. Fail loudly like
      // every other node so a request that never reached the server isn't mistaken
      // for an empty 200 body; HTTP error statuses still flow through ok/status below.
      // Strip the query string from the reported URL so interpolated secrets
      // (e.g. ?api_key=…) don't leak into error messages, traces, or logs.
      let target = requestUrl;
      try { const u = new URL(requestUrl); target = `${u.protocol}//${u.host}${u.pathname}`; } catch { /* use raw */ }
      if (controller.signal.aborted) {
        throw new Error(`HTTP Request to ${target} timed out after ${timeout} ms`);
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`HTTP Request to ${target} failed: ${message}`);
    }

    const bodyResult:   EvalResult = { value: responseBodyVal, inputTokens: 0, outputTokens: 0 };
    const statusResult: EvalResult = { value: responseStatus,  inputTokens: 0, outputTokens: 0 };
    const okResult:     EvalResult = { value: responseOk,      inputTokens: 0, outputTokens: 0 };
    ctx.cache.set(`${ctx.nodeId}:res-body`, bodyResult);
    ctx.cache.set(`${ctx.nodeId}:status`,   statusResult);
    ctx.cache.set(`${ctx.nodeId}:ok`,       okResult);

    if (sourceHandle === "status") return statusResult;
    if (sourceHandle === "ok")     return okResult;
    return bodyResult;
  }
}

export const execute = new HttpRequestNode();
