import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";
import type { AuthValidatorNodeData } from "@/lib/node-types";
import { toText, resolveVars, getNestedValue } from "./utils";
import { parseJwt, verifyHS256, verifyRS256 } from "./jwt-utils";

class AuthValidatorNode implements INodeExecutor {
  async execute(node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext) {
    const {
      mode       = "jwt",
      headerName = "Authorization",
      algorithm  = "HS256",
      secret:     rawSecret  = "",
      jwksUrl:    rawJwksUrl = "",
      claims     = [],
      apiKeys:    rawApiKeys = [],
    } = (node.data as unknown) as AuthValidatorNodeData;
    const secret  = resolveVars(rawSecret, ctx.vars);
    const jwksUrl = resolveVars(rawJwksUrl, ctx.vars);
    const apiKeys = (rawApiKeys as string[]).map((k) => resolveVars(k, ctx.vars));

    const stripBearer = (s: string) => s.startsWith("Bearer ") ? s.slice(7).trim() : s.trim();

    let token = "";
    const tokenSrc = ctx.inputFor("token");
    if (tokenSrc) {
      const r = await ctx.evalInput(tokenSrc);
      if (r.value && typeof r.value === "object") {
        const obj = r.value as Record<string, unknown>;
        const raw = String(obj[headerName] ?? obj[headerName.toLowerCase()] ?? "");
        token = stripBearer(raw);
      } else {
        token = stripBearer(toText(r.value));
      }
    } else {
      const raw = ctx.reqHeaders.get(headerName) ?? ctx.reqHeaders.get(headerName.toLowerCase()) ?? "";
      token = stripBearer(raw);
    }

    let valid    = false;
    let errorMsg = "";
    let payload: Record<string, unknown> = {};

    if (mode === "apikey") {
      if (!token) {
        errorMsg = "Missing API key";
      } else if (apiKeys.length > 0 && (apiKeys as string[]).includes(token)) {
        valid = true;
      } else {
        errorMsg = "Invalid API key";
      }
    } else {
      const parsed = parseJwt(token);
      if (!parsed) {
        errorMsg = token ? "Invalid JWT format" : "Missing token";
      } else {
        const alg = String(parsed.header.alg ?? "");
        if (algorithm === "HS256") {
          if (alg !== "HS256") {
            errorMsg = `Expected HS256, got ${alg || "none"}`;
          } else if (!secret) {
            errorMsg = "No secret configured";
          } else {
            const res = await verifyHS256(parsed, secret);
            valid = res.valid;
            errorMsg = res.error ?? "";
            if (res.valid) payload = parsed.payload;
          }
        } else {
          if (alg !== "RS256") {
            errorMsg = `Expected RS256, got ${alg || "none"}`;
          } else if (!jwksUrl) {
            errorMsg = "No JWKS URL configured";
          } else {
            const res = await verifyRS256(parsed, jwksUrl);
            valid = res.valid;
            errorMsg = res.error ?? "";
            if (res.valid) payload = parsed.payload;
          }
        }
      }
    }

    const validResult: EvalResult = { value: valid,    inputTokens: 0, outputTokens: 0 };
    const errorResult: EvalResult = { value: errorMsg, inputTokens: 0, outputTokens: 0 };
    ctx.cache.set(`${ctx.nodeId}:valid`, validResult);
    ctx.cache.set(`${ctx.nodeId}:error`, errorResult);
    for (const claim of claims as Array<{ id: string; name: string }>) {
      const claimVal = valid ? getNestedValue(payload, claim.name) : undefined;
      ctx.cache.set(`${ctx.nodeId}:${claim.id}`, { value: claimVal, inputTokens: 0, outputTokens: 0 });
    }

    if (sourceHandle === "error") return errorResult;
    if (sourceHandle && sourceHandle !== "valid") {
      return ctx.cache.get(`${ctx.nodeId}:${sourceHandle}`) ?? { value: undefined, inputTokens: 0, outputTokens: 0 };
    }
    return validResult;
  }
}

export const execute = new AuthValidatorNode();
