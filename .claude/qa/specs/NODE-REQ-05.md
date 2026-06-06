---
id: NODE-REQ-05
title: Auth Validator node JWT HS256/RS256 and API key validation modes
severity: critical
source_files:
  - components/canvas/nodes/AuthValidatorNode.tsx
  - lib/nodes/auth-validator.ts
---

## What this tests
Verifies that the Auth Validator node validates bearer tokens (JWT HS256 or RS256) and static API keys, exposes `valid`/`error` output handles, and extracts configurable JWT claims into per-claim output handles.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with an Auth Validator node exists on the canvas
- The Debug panel is accessible
- For JWT tests: a valid HS256-signed JWT and its secret are available
- For API key tests: a known valid key string is available

## Steps — canvas configuration

1. Navigate to the canvas containing an Auth Validator node
2. Observe the node header: title **Auth Validator**, subtitle **JWT · HS256** (default), emerald ShieldCheck icon; mode tabs **JWT** and **Key** in the top-right
3. In the **Token source** field, verify the default value is `Authorization`; this is the request header the node reads the token from
4. In JWT mode, observe the **Algorithm** toggle: **HS256** and **RS256** buttons
5. With **HS256** selected, verify a **Secret** field appears (placeholder `your-jwt-secret or $MY_SECRET`)
6. Click **RS256** — the Secret field is replaced by a **JWKS URL** field (placeholder `https://your-issuer/.well-known/jwks.json`); header subtitle updates to **JWT · RS256**
7. Click back to **HS256**
8. In the **Claims to extract** section, click **Add claim** — a new input row appears (placeholder `e.g. sub, email, roles`) with an × button; add two claims: `sub` and `email`
9. Verify two additional output handles appear in the **Outputs** section labeled `sub` and `email`; click × on `email` — the row and its handle disappear
10. Click the **Key** tab — all JWT fields (algorithm, secret, claims) are replaced by a **Valid API keys** section; subtitle updates to **API Key**
11. Click **Add key** twice — two input rows appear (placeholder `sk-… or $MY_API_KEY`); enter keys and verify × removes them
12. Switch back to **JWT** tab

## Steps — execution (JWT HS256)

13. Set algorithm to **HS256**, enter the test JWT secret, add claim `sub`
14. Open the Debug panel; send a request with header `Authorization: Bearer <valid-HS256-JWT>`
15. Expand the Auth Validator trace: `valid` = `true`, `error` = `""`, `sub` handle = the subject claim value from the token payload
16. Repeat with a tampered or expired token — `valid` = `false`, `error` contains a descriptive message (e.g. `"Invalid signature"` or `"Token expired"`), `sub` handle = `undefined`
17. Send a request with no `Authorization` header — `valid` = `false`, `error` = `"Missing token"`

## Steps — execution (API key mode)

18. Switch to **Key** mode; add the test key value (e.g. `my-secret-key`)
19. Send a request with header `Authorization: my-secret-key`
20. Trace: `valid` = `true`, `error` = `""`
21. Send with an incorrect key — `valid` = `false`, `error` = `"Invalid API key"`
22. Send with no header — `valid` = `false`, `error` = `"Missing API key"`

## Expected result
- JWT mode: subtitle shows `JWT · HS256` or `JWT · RS256` per selection; HS256 shows Secret field, RS256 shows JWKS URL field
- API key mode: subtitle shows **API Key**; Valid API keys list is shown instead of JWT fields
- Claims section is JWT-only; each claim name gets its own output handle and output row
- `valid` output: boolean
- `error` output: string — empty on success, descriptive error message on failure
- Claim outputs: JWT payload value for the named claim when valid; `undefined` when invalid
- Bearer prefix (`Bearer `) is stripped from the token before validation
- `tokenSource` handle overrides the header name dynamically when connected

## Failure indicators
- Subtitle does not update when switching algorithm or mode
- Secret field visible in RS256 mode (should show JWKS URL instead)
- JWT fields visible in API key mode
- Claim output handles do not appear/disappear as claims are added/removed
- `valid` returns `true` for an invalid or expired JWT
- `error` is `undefined` instead of an empty string on success
- Bearer prefix not stripped — token validation fails for valid `Authorization: Bearer <token>` headers

## Severity rationale
An auth validation bypass allows unauthenticated callers to reach protected downstream nodes; this is critical.

## Source reference
`components/canvas/nodes/AuthValidatorNode.tsx` lines 141-143 (subtitle by mode/algorithm), lines 193-208 (HS256/RS256 algorithm toggle), lines 212-253 (conditional Secret vs JWKS URL field), lines 255-285 (claims section); `lib/nodes/auth-validator.ts` lines 24-40 (token extraction with Bearer strip), lines 46-83 (API key and JWT validation branches), lines 86-98 (output routing with per-claim cache).

## Notes
Claim values are only extracted when `valid === true`; invalid tokens always return `undefined` for all claim handles. Variable interpolation (`$VAR_NAME`) is supported in the secret, JWKS URL, and API key fields via `resolveVars`. The `secret` input handle on the left side can dynamically override the configured secret for HS256 mode.
