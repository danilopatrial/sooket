import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { KeyDashboardPanel } from "@/components/workflow-config/KeyDashboardPanel";

interface DailyEntry { day: string; requests: number }

function makeApiKey() {
  return {
    id: 1,
    label: "Default Key",
    key_hint: "sk-wf-…abcd",
    scopes: ["execute"],
    rate_limit_override: null,
    expires_at: null,
    last_used_at: null,
    is_active: true,
    created_at: "2026-06-01T00:00:00.000Z",
  };
}

function makeStats(daily: DailyEntry[]) {
  return {
    period_days: 30,
    total_requests: daily.reduce((s, d) => s + d.requests, 0),
    total_requests_all_time: daily.reduce((s, d) => s + d.requests, 0),
    total_tokens: 0,
    total_input_tokens: 0,
    total_output_tokens: 0,
    avg_latency_ms: 0,
    min_latency_ms: 0,
    max_latency_ms: 0,
    daily,
  };
}

function thirtyDays(requestsPerDay: number): DailyEntry[] {
  return Array.from({ length: 30 }, (_, i) => ({
    day: `2026-05-${String(i + 1).padStart(2, "0")}`,
    requests: requestsPerDay,
  }));
}

function mockFetchWith(daily: DailyEntry[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(makeStats(daily)),
      })
    )
  );
}

describe("KeyDashboardPanel — daily requests chart", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a 30-bar SVG chart when every day has zero requests", async () => {
    mockFetchWith(thirtyDays(0));
    const { container } = render(
      <KeyDashboardPanel slug="wf-a" apiKey={makeApiKey()} onClose={() => {}} />
    );

    // Wait for the async stats fetch to resolve and the chart to render.
    await waitFor(() => {
      expect(container.querySelector("svg")).not.toBeNull();
    });

    // 30 bars must always be present, even with no usage history.
    expect(container.querySelectorAll("svg rect")).toHaveLength(30);
    // The old empty-state text must no longer short-circuit the chart.
    expect(screen.queryByText("No requests in the last 30 days")).toBeNull();
  });

  it("renders a 30-bar SVG chart when days have requests", async () => {
    const daily = thirtyDays(0);
    daily[5].requests = 12;
    daily[20].requests = 3;
    mockFetchWith(daily);
    const { container } = render(
      <KeyDashboardPanel slug="wf-a" apiKey={makeApiKey()} onClose={() => {}} />
    );

    await waitFor(() => {
      expect(container.querySelector("svg")).not.toBeNull();
    });

    expect(container.querySelectorAll("svg rect")).toHaveLength(30);
  });
});
