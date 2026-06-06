import { describe, it, expect, afterEach } from "vitest";
import {
  readLimitedText,
  maxBodyBytes,
  RequestBodyTooLargeError,
  DEFAULT_MAX_BODY_BYTES,
} from "@/lib/request-limit";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** A Request whose body is a string — undici sets a Content-Length header. */
function stringRequest(text: string): Request {
  return new Request("http://localhost/x", { method: "POST", body: text });
}

/**
 * A Request whose body is a stream with NO Content-Length header — exercises
 * the streaming (authoritative) enforcement path. `chunks` lets us split the
 * payload to cover the multi-chunk merge.
 */
function streamRequest(chunks: string[]): Request {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return new Request("http://localhost/x", {
    method: "POST",
    body: stream,
    // `duplex` is required by undici for streamed request bodies.
    duplex: "half",
  } as RequestInit);
}

afterEach(() => {
  delete process.env.SOOKET_MAX_BODY_BYTES;
});

// ─── readLimitedText ──────────────────────────────────────────────────────────

describe("readLimitedText", () => {
  it("returns the body when under the limit", async () => {
    const text = await readLimitedText(stringRequest("hello world"), 1024);
    expect(text).toBe("hello world");
  });

  it("returns an empty string for an empty body", async () => {
    const text = await readLimitedText(stringRequest(""), 1024);
    expect(text).toBe("");
  });

  it("reassembles a multi-chunk streamed body", async () => {
    const text = await readLimitedText(streamRequest(["foo", "bar", "baz"]), 1024);
    expect(text).toBe("foobarbaz");
  });

  it("rejects via the Content-Length fast path", async () => {
    // 100-byte string body → Content-Length: 100, limit 10.
    await expect(readLimitedText(stringRequest("x".repeat(100)), 10)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });

  it("rejects an oversized streamed body with no Content-Length", async () => {
    await expect(
      readLimitedText(streamRequest(["x".repeat(50)]), 10),
    ).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it("rejects when the limit is crossed mid-stream (chunked)", async () => {
    // Each chunk is 6 bytes; total 18 > limit 10. The 2nd chunk crosses it.
    await expect(
      readLimitedText(streamRequest(["aaaaaa", "bbbbbb", "cccccc"]), 10),
    ).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it("allows a body of exactly the limit (boundary)", async () => {
    const text = await readLimitedText(streamRequest(["12345"]), 5);
    expect(text).toBe("12345");
  });

  it("rejects a body one byte over the limit (off-by-one)", async () => {
    await expect(readLimitedText(streamRequest(["123456"]), 5)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });

  it("counts bytes, not characters, for multi-byte UTF-8", async () => {
    // "é" is 2 bytes in UTF-8; 4 chars = 8 bytes.
    const payload = "é".repeat(4);
    expect(new TextEncoder().encode(payload).length).toBe(8);
    // 8-byte limit allows it; 7-byte limit rejects it even though it is 4 chars.
    expect(await readLimitedText(streamRequest([payload]), 8)).toBe(payload);
    await expect(readLimitedText(streamRequest([payload]), 7)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });

  it("error carries the limit that was exceeded", async () => {
    try {
      await readLimitedText(streamRequest(["x".repeat(20)]), 10);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RequestBodyTooLargeError);
      expect((err as RequestBodyTooLargeError).limit).toBe(10);
    }
  });

  it("uses the env-configured limit when none is passed", async () => {
    process.env.SOOKET_MAX_BODY_BYTES = "4";
    await expect(readLimitedText(streamRequest(["abcde"]))).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
    expect(await readLimitedText(streamRequest(["abcd"]))).toBe("abcd");
  });
});

// ─── maxBodyBytes ─────────────────────────────────────────────────────────────

describe("maxBodyBytes", () => {
  it("defaults to 1 MiB when unset", () => {
    expect(maxBodyBytes()).toBe(DEFAULT_MAX_BODY_BYTES);
    expect(DEFAULT_MAX_BODY_BYTES).toBe(1_048_576);
  });

  it("reads a valid numeric override", () => {
    process.env.SOOKET_MAX_BODY_BYTES = "2048";
    expect(maxBodyBytes()).toBe(2048);
  });

  it("floors a fractional override", () => {
    process.env.SOOKET_MAX_BODY_BYTES = "2048.9";
    expect(maxBodyBytes()).toBe(2048);
  });

  it.each(["", "   ", "abc", "0", "-100", "NaN"])(
    "falls back to the default for invalid value %j",
    (value) => {
      process.env.SOOKET_MAX_BODY_BYTES = value;
      expect(maxBodyBytes()).toBe(DEFAULT_MAX_BODY_BYTES);
    },
  );
});
