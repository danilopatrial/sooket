import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";
import type { SchemaValidatorNodeData } from "@/lib/node-types";
import { parseSchema, validateValue, formatErrors } from "@/lib/schema-validate";

/**
 * Validate the incoming value against a configured JSON Schema. Two outputs:
 *   - `valid`   — the input passed through unchanged when it conforms
 *   - `invalid` — `{ valid: false, errors, message }` when it does not
 *
 * `action` controls the `valid` handle on a failure: "block" (default) makes it
 * inactive so the request can't proceed (validate-and-reject at the boundary);
 * "pass" lets the original input continue while the errors are still emitted on
 * `invalid` for an error edge / logging.
 */
class SchemaValidatorNode implements INodeExecutor {
  async execute(node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext) {
    const inputSrc = ctx.inputFor("input");
    if (!inputSrc) throw new Error("Schema Validator node has no input connected");

    const inputResult = await ctx.evalInput(inputSrc);
    if (inputResult.active === false) {
      return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
    }

    const { schema: schemaText = "", action = "block" } = (node.data as unknown) as SchemaValidatorNodeData;
    if (!schemaText.trim()) throw new Error("Schema Validator: no JSON Schema configured");

    let schema;
    try {
      schema = parseSchema(schemaText);
    } catch (err) {
      throw new Error(`Schema Validator: ${err instanceof Error ? err.message : String(err)}`);
    }

    const inTok = inputResult.inputTokens;
    const outTok = inputResult.outputTokens;
    const { valid, errors } = validateValue(inputResult.value, schema);

    let validResult: EvalResult;
    let invalidResult: EvalResult;

    if (valid) {
      validResult = { value: inputResult.value, inputTokens: inTok, outputTokens: outTok };
      invalidResult = { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
    } else {
      invalidResult = {
        value: { valid: false, errors, message: formatErrors(errors) },
        inputTokens: inTok,
        outputTokens: outTok,
      };
      validResult = action === "pass"
        ? { value: inputResult.value, inputTokens: inTok, outputTokens: outTok }
        : { value: undefined, active: false, inputTokens: inTok, outputTokens: outTok };
    }

    ctx.cache.set(`${ctx.nodeId}:valid`, validResult);
    ctx.cache.set(`${ctx.nodeId}:invalid`, invalidResult);
    if (sourceHandle === "invalid") return invalidResult;
    return validResult;
  }
}

export const execute = new SchemaValidatorNode();
