import { NextResponse } from "next/server";
import { AUTH_COOKIE, isLoopbackHost, resolveAuthToken, resolveHost, safeEqual } from "@/lib/security/auth";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Validate the shared secret and, on success, set the httpOnly `sooket_auth`
 * cookie so the browser dashboard can pass the proxy gate. This is a single
 * shared password — not a user account.
 */
export async function POST(request: Request) {
  const configured = resolveAuthToken();
  if (!configured) {
    return NextResponse.json(
      { error: "Authentication is not enabled on this instance." },
      { status: 400 },
    );
  }

  let token: unknown;
  try {
    const body = await request.json();
    token = (body as { token?: unknown })?.token;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof token !== "string" || !safeEqual(token, configured)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: AUTH_COOKIE,
    value: configured,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: !isLoopbackHost(resolveHost()),
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}
