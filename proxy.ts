/**
 * Optional shared-secret gate for Sooket's management surface.
 *
 * Next 16 renamed the `middleware` file convention to `proxy` (see
 * node_modules/next/dist/docs/.../file-conventions/proxy.md). This runs on the
 * Node.js runtime before any route renders.
 *
 * Behavior:
 *   - When SOOKET_AUTH_TOKEN is unset/empty → no-op (current open behavior).
 *   - When set → every gated request must present the secret, either as
 *     `Authorization: Bearer <token>` (programmatic) or the `sooket_auth`
 *     httpOnly cookie (browser, set via /unlock).
 *   - The execution/webhook/health endpoints and the unlock flow stay public
 *     (see isPublicPath) — they carry their own auth or are needed to log in.
 *
 * This is a single shared secret, NOT a user-account system.
 */
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, isAuthorized, isPublicPath, resolveAuthToken } from "@/lib/security/auth";

export const config = {
  // Run on everything except Next internals and static assets; per-path
  // exemptions are handled in code via isPublicPath so they stay testable.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export function proxy(request: NextRequest) {
  const token = resolveAuthToken();
  if (!token) return NextResponse.next(); // gate disabled

  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const authHeader = request.headers.get("authorization");
  const cookieValue = request.cookies.get(AUTH_COOKIE)?.value ?? null;
  if (isAuthorized(token, authHeader, cookieValue)) return NextResponse.next();

  // Unauthorized: APIs get JSON 401, browser navigations get redirected to /unlock.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/unlock";
  url.search = "";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}
