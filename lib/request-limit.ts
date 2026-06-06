/**
 * Request body size limiting.
 *
 * Both the live execution API (`/api/v1/chat`) and the webhook API
 * (`/api/webhooks/[slug]`) read the entire request body into memory. Without a
 * cap, a single large request could exhaust process memory. `readLimitedText`
 * enforces a byte ceiling: it rejects oversized bodies up-front via the
 * `Content-Length` header (fast path) and, because that header can be absent
 * (chunked transfer) or spoofed, also counts bytes while streaming and aborts
 * the moment the limit is crossed.
 */

/** Default maximum request body size: 1 MiB. */
export const DEFAULT_MAX_BODY_BYTES = 1_048_576;

/**
 * Resolve the configured body-size cap from `SOOKET_MAX_BODY_BYTES`, falling
 * back to {@link DEFAULT_MAX_BODY_BYTES}. A missing, empty, non-numeric, or
 * non-positive value yields the default.
 */
export function maxBodyBytes(): number {
  const raw = process.env.SOOKET_MAX_BODY_BYTES?.trim();
  if (!raw) return DEFAULT_MAX_BODY_BYTES;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_BODY_BYTES;
  return Math.floor(parsed);
}

/** Thrown by {@link readLimitedText} when the body exceeds the configured cap. */
export class RequestBodyTooLargeError extends Error {
  readonly limit: number;
  constructor(limit: number) {
    super(`Request body exceeds the ${limit}-byte limit`);
    this.name = "RequestBodyTooLargeError";
    this.limit = limit;
  }
}

/**
 * Read a request body as UTF-8 text, rejecting anything larger than `limit`
 * bytes with a {@link RequestBodyTooLargeError}.
 *
 * Counting is by bytes (not characters) so multi-byte UTF-8 is handled
 * correctly. A body of exactly `limit` bytes is allowed; `limit + 1` is not.
 */
export async function readLimitedText(
  request: Request,
  limit: number = maxBodyBytes(),
): Promise<string> {
  // Fast path: trust a present, well-formed Content-Length to reject early
  // without reading the stream. A missing or malformed value falls through to
  // the streaming check below, which is authoritative.
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    const len = Number(declared);
    if (Number.isFinite(len) && len > limit) {
      throw new RequestBodyTooLargeError(limit);
    }
  }

  const stream = request.body;
  if (!stream) {
    // No readable stream (e.g. an empty body). `text()` is bounded by whatever
    // the runtime already buffered; still guard the decoded byte length.
    const text = await request.text();
    if (new TextEncoder().encode(text).length > limit) {
      throw new RequestBodyTooLargeError(limit);
    }
    return text;
  }

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      received += value.byteLength;
      if (received > limit) {
        await reader.cancel();
        throw new RequestBodyTooLargeError(limit);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  if (chunks.length === 0) return "";
  if (chunks.length === 1) return new TextDecoder().decode(chunks[0]);

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}
