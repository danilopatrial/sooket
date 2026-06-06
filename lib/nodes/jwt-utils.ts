function base64urlToBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const buf = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export interface ParsedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: Uint8Array<ArrayBuffer>;
  signingInput: string;
}

export function parseJwt(token: string): ParsedJwt | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const decode = (s: string) =>
      JSON.parse(new TextDecoder().decode(base64urlToBytes(s))) as Record<string, unknown>;
    return {
      header:       decode(parts[0]),
      payload:      decode(parts[1]),
      signature:    base64urlToBytes(parts[2]),
      signingInput: `${parts[0]}.${parts[1]}`,
    };
  } catch {
    return null;
  }
}

export async function verifyHS256(parsed: ParsedJwt, secret: string): Promise<{ valid: boolean; error?: string }> {
  if (typeof parsed.payload.exp === "number" && Date.now() / 1000 > parsed.payload.exp) {
    return { valid: false, error: "Token expired" };
  }
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );
  const ok = await crypto.subtle.verify(
    "HMAC", key, parsed.signature, new TextEncoder().encode(parsed.signingInput)
  );
  return ok ? { valid: true } : { valid: false, error: "Invalid signature" };
}

interface JwkKey { kid?: string; kty: string; [k: string]: unknown }

export async function verifyRS256(parsed: ParsedJwt, jwksUrl: string): Promise<{ valid: boolean; error?: string }> {
  if (typeof parsed.payload.exp === "number" && Date.now() / 1000 > parsed.payload.exp) {
    return { valid: false, error: "Token expired" };
  }
  let jwks: { keys: JwkKey[] };
  try {
    const res = await fetch(jwksUrl);
    if (!res.ok) return { valid: false, error: `JWKS fetch failed (${res.status})` };
    jwks = await res.json() as { keys: JwkKey[] };
  } catch {
    return { valid: false, error: "Failed to fetch JWKS" };
  }
  const kid = parsed.header.kid as string | undefined;
  const jwk = kid ? jwks.keys.find((k) => k.kid === kid) : jwks.keys[0];
  if (!jwk) return { valid: false, error: "No matching key found in JWKS" };
  try {
    const key = await crypto.subtle.importKey(
      "jwk", jwk as unknown as JsonWebKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]
    );
    const ok = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5", key, parsed.signature, new TextEncoder().encode(parsed.signingInput)
    );
    return ok ? { valid: true } : { valid: false, error: "Invalid signature" };
  } catch {
    return { valid: false, error: "Key import or verification failed" };
  }
}
