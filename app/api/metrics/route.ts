import { getDb } from "@/lib/db";
import { executionSemaphore } from "@/lib/concurrency";
import { renderMetrics, PROMETHEUS_CONTENT_TYPE } from "@/lib/metrics";

// Prometheus scrape endpoint. NOT in `isPublicPath()`, so when SOOKET_AUTH_TOKEN
// is set the proxy gates it like the rest of the management surface (a scraper
// sends `Authorization: Bearer <token>`); when unset it is open like the
// dashboard. Operational counters/gauges are derived from the existing tables
// plus the live execution semaphore — see lib/metrics.ts.
export async function GET() {
  const body = renderMetrics(getDb(), executionSemaphore);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": PROMETHEUS_CONTENT_TYPE,
      "Cache-Control": "no-store",
    },
  });
}
