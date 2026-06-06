---
id: CONTRACT-AKEY-14
title: GET api-key stats returns 30-day metrics with 30 daily entries
severity: high
source_files:
  - app/api/workflows/[slug]/api-keys/[id]/stats/route.ts
---

## What this tests
Verifies that GET `/api/workflows/[slug]/api-keys/[id]/stats` returns the full 30-day metrics object with exactly 30 daily entries (zero-filled for days with no requests), and that a key belonging to a different workflow returns 404.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with at least one API key; substitute `slug` and key `id` below

## Steps
1. Fetch stats for a valid key:
   ```
   curl -s -o /tmp/akey14.json -w "%{http_code}" \
     http://localhost:3000/api/workflows/<slug>/api-keys/<id>/stats
   ```
2. Note the HTTP status code. Inspect the top-level fields:
   ```
   cat /tmp/akey14.json | python3 -c "
   import sys, json
   d = json.load(sys.stdin)
   print('period_days:', d['period_days'])
   print('total_requests:', d['total_requests'])
   print('total_requests_all_time:', d['total_requests_all_time'])
   print('total_tokens:', d['total_tokens'])
   print('avg_latency_ms:', d['avg_latency_ms'])
   print('daily count:', len(d['daily']))
   print('first day:', d['daily'][0])
   print('last day:', d['daily'][-1])
   "
   ```
3. Confirm all daily entries have the required shape:
   ```
   cat /tmp/akey14.json | python3 -c "
   import sys, json
   daily = json.load(sys.stdin)['daily']
   ok = all('day' in e and 'requests' in e for e in daily)
   print('all entries have day+requests:', ok)
   print('all requests are ints:', all(isinstance(e['requests'], int) for e in daily))
   print('ordered ascending:', daily == sorted(daily, key=lambda e: e['day']))
   "
   ```
4. Attempt to fetch stats for a key using the wrong workflow slug:
   ```
   curl -s -o /tmp/akey14b.json -w "%{http_code}" \
     http://localhost:3000/api/workflows/wrong-slug/api-keys/<id>/stats
   ```
   Note status. Inspect: `cat /tmp/akey14b.json`

## Expected result
Step 1 returns HTTP `200`. The response contains all fields: `period_days` (30), `total_requests`, `total_requests_all_time`, `total_tokens`, `total_input_tokens`, `total_output_tokens`, `avg_latency_ms`, `min_latency_ms`, `max_latency_ms`, `daily`. `daily` is an array of exactly 30 objects each with `{day: "YYYY-MM-DD", requests: <integer>}`, ordered oldest-first, with zero-filled entries for days with no traffic. Step 4 returns HTTP `404` with `{"error":"Key not found"}`.

## Failure indicators
- `daily` array has fewer or more than 30 entries
- Days with no traffic are omitted rather than zero-filled
- `daily` entries are not in ascending date order
- Any top-level metric field is absent
- Wrong-workflow slug returns anything other than 404

## Severity rationale
High: the stats endpoint drives the per-key usage dashboard; missing days or wrong field names break the 30-day bar chart in the UI.

## Source reference
`app/api/workflows/[slug]/api-keys/[id]/stats/route.ts` lines 62–69: loop fills 30 entries with `dailyMap.get(day) ?? 0` so the array is always exactly 30 elements; lines 16–21: JOIN with `w.slug` enforces workflow ownership, returns 404 if mismatch.
