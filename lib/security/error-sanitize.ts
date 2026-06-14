import { randomUUID } from "node:crypto";

/**
 * Framework-agnostic sanitiser for errors that cross the public trust boundary
 * (the execution + webhook APIs). Kept free of Next.js / `server-only` / DB
 * imports so it can be unit-tested and reused anywhere.
 */

/** Generic message returned to callers in place of a raw internal error. */
export const GENERIC_EXECUTION_ERROR = "Internal error executing the workflow";

/**
 * Map an *unexpected* execution error (one not already classified into a safe
 * 4xx/504 message) to a response body safe to send to an untrusted caller.
 *
 * A raw engine error can carry internal detail — an upstream provider's response
 * body (the Anthropic/OpenAI nodes rethrow it verbatim), a stack trace, or a
 * filesystem path — so the caller receives only a generic message plus a
 * correlation `logId`. The full text is logged server-side under that id (and
 * remains in the execution record for the operator's Logs tab), so an operator
 * can still trace the failure from the id the caller quotes.
 *
 * @param rawError the internal error string (from `executeWorkflow`)
 * @param logger   injectable sink for the server-side line (defaults to console.error)
 */
export function sanitizeExecutionError(
  rawError: string,
  logger: (line: string) => void = (line) => console.error(line),
): { message: string; logId: string } {
  const logId = randomUUID();
  logger(`[exec ${logId}] workflow execution failed: ${rawError}`);
  return { message: GENERIC_EXECUTION_ERROR, logId };
}
