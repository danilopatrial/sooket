/**
 * Boundary error sanitiser: an unexpected execution error is reduced to a
 * generic message + correlation id for the caller, while the full text is
 * emitted to the server-side log under that same id.
 */
import { describe, it, expect, vi } from "vitest";
import { sanitizeExecutionError, GENERIC_EXECUTION_ERROR } from "@/lib/security/error-sanitize";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("sanitizeExecutionError", () => {
  it("returns the generic message, never the raw error", () => {
    const raw = "Upstream provider error: {\"key\":\"sk-secret\",\"path\":\"/srv/app/x\"}";
    const { message } = sanitizeExecutionError(raw, () => {});
    expect(message).toBe(GENERIC_EXECUTION_ERROR);
    expect(message).not.toContain("sk-secret");
    expect(message).not.toContain("/srv/app");
    expect(message).not.toContain("Upstream");
  });

  it("returns a UUID correlation id", () => {
    const { logId } = sanitizeExecutionError("boom", () => {});
    expect(logId).toMatch(UUID_RE);
  });

  it("logs the raw error under the same correlation id", () => {
    const lines: string[] = [];
    const { logId } = sanitizeExecutionError("Custom Code runtime error: boom", (l) => lines.push(l));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(logId);
    expect(lines[0]).toContain("Custom Code runtime error: boom");
  });

  it("produces a fresh correlation id per call", () => {
    const a = sanitizeExecutionError("x", () => {}).logId;
    const b = sanitizeExecutionError("x", () => {}).logId;
    expect(a).not.toBe(b);
  });

  it("defaults to console.error when no logger is supplied", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { logId } = sanitizeExecutionError("kaboom");
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain(logId);
    expect(spy.mock.calls[0][0]).toContain("kaboom");
    spy.mockRestore();
  });
});
