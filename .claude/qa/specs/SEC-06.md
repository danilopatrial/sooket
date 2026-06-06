---
id: SEC-06
title: Auth Validator node rejects tampered or expired JWTs
severity: critical
source_files:
  - lib/nodes/auth-validator.ts
  - lib/nodes/jwt-utils.ts
---

## What this tests
Verifies that the Auth Validator node in JWT mode rejects tokens with invalid signatures, expired `exp` claims, wrong algorithms, and malformed structure — and returns descriptive error messages for each case.

## Prerequisites
- A workflow with an Auth Validator node configured for HS256 mode with a known secret
- A tool to generate JWTs (e.g. jwt.io or `node -e "require('jsonwebtoken').sign(...)"`)
- The Debug panel is accessible

## Steps — valid JWT accepted

1. Generate a valid HS256 JWT signed with the configured secret (e.g. `my-secret`), with `exp` set to 1 hour in the future
2. In the Debug panel, set `Authorization: Bearer <valid-jwt>` in the headers
3. Run — `valid` output = `true`, `error` output = `""`

## Steps — tampered signature rejected

4. Take the valid JWT and change the last character of the signature part (the third `.`-separated segment)
5. Run with the tampered token — `valid` = `false`, `error` = `"Invalid signature"`

## Steps — expired JWT rejected

6. Generate a JWT with `exp` set to 1 second in the past (Unix timestamp)
7. Run — `valid` = `false`, `error` = `"Token expired"`
8. Verify the expiry check uses `Date.now() / 1000 > payload.exp` (strict greater-than — a token expiring at the exact current second is expired)

## Steps — wrong algorithm rejected

9. Generate a JWT signed with RS256 (or any algorithm other than HS256) but present it to an HS256-configured Auth Validator
10. Run — `valid` = `false`, `error` = `"Expected HS256, got RS256"` (error identifies both expected and actual algorithm)

## Steps — malformed token rejected

11. Send `Authorization: Bearer not.a.jwt` (three parts but invalid base64)
12. Run — `valid` = `false`, `error` = `"Invalid JWT format"` or similar parse error
13. Send `Authorization: Bearer onlyonepart`
14. Run — `valid` = `false`, `error` = `"Invalid JWT format"` (not 3 parts → `parseJwt` returns null)

## Steps — missing token

15. Send no `Authorization` header (or `Authorization: Bearer ` with empty token)
16. Run — `valid` = `false`, `error` = `"Missing token"`

## Steps — no secret configured

17. Clear the HS256 secret field in the Auth Validator config; run with a valid JWT
18. `valid` = `false`, `error` = `"No secret configured"`

## Expected result
- Valid HS256 JWT with future `exp`: `valid = true`, `error = ""`
- Tampered signature: `valid = false`, `error = "Invalid signature"`
- Expired token (`exp` in past): `valid = false`, `error = "Token expired"`
- Wrong algorithm in JWT header: `valid = false`, `error = "Expected HS256, got <actual>"`
- Malformed/non-3-part token: `valid = false`, `error = "Invalid JWT format"` or `"Missing token"`
- No secret: `valid = false`, `error = "No secret configured"`

## Failure indicators
- Tampered JWT returns `valid = true`
- Expired JWT returns `valid = true`
- No error message returned on rejection (empty string when `valid = false`)
- Wrong-algorithm JWT accepted as valid

## Severity rationale
JWT validation is an authentication control; accepting tampered or expired tokens would allow unauthorized access to workflow execution.

## Source reference
`lib/nodes/jwt-utils.ts` lines 18-33 (`parseJwt`: returns null for non-3-part or unparseable tokens), lines 35-46 (`verifyHS256`: exp check then HMAC verify), lines 50-77 (`verifyRS256`: exp check then JWKS fetch and RSA verify); `lib/nodes/auth-validator.ts` lines 55-68 (HS256 branch: algorithm check, secret check, `verifyHS256` call with error propagation).
