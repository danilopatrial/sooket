---
id: CONTRACT-ACCT-03
title: GET /api/health returns status, uptime, and timestamp
severity: medium
source_files:
  - app/api/health/route.ts
---

## What this tests
The health endpoint returns a 200 JSON response with `status`, `uptime`, and `timestamp` fields.

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. Send a GET request to the health endpoint:
   ```
   curl -s -i http://localhost:3000/api/health
   ```

## Expected result
- HTTP status: `200`
- Response body is JSON with exactly:
  - `status`: the string `"ok"`
  - `uptime`: a non-negative integer (seconds since the server started)
  - `timestamp`: an ISO 8601 date string (e.g. `"2026-06-04T12:00:00.000Z"`)

Example:
```json
{"status":"ok","uptime":42,"timestamp":"2026-06-04T12:00:00.000Z"}
```

## Failure indicators
- HTTP status is not 200
- Response body is missing any of `status`, `uptime`, or `timestamp`
- `status` is not the string `"ok"`
- `uptime` is negative or not a number
- `timestamp` is not a valid ISO 8601 string

## Severity rationale
A broken health endpoint prevents monitoring and load-balancer liveness checks from working, but does not affect workflow execution directly.

## Source reference
`app/api/health/route.ts` — the GET handler returns `{status: "ok", uptime: Math.floor((Date.now() - startTime) / 1000), timestamp: new Date().toISOString()}` with status 200.

## Notes
`uptime` is measured from the module load time (`const startTime = Date.now()` at module scope), so it resets on server restart, not per-request.
