import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ComplexityNode } from "@/components/canvas/nodes/ComplexityNode";
import type { ComplexityNodeData } from "@/components/canvas/nodes/ComplexityNode";
import { blendScores, scoreToTier } from "@/lib/complexity/blender";
import type { NodeProps } from "@xyflow/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

vi.mock("@/lib/complexity/heuristics", () => ({
  scoreHeuristics: vi.fn(),
}));

import { scoreHeuristics } from "@/lib/complexity/heuristics";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_DATA: ComplexityNodeData = {
  testPrompt: "",
  lastScore: null,
  lastTier: null,
  lastSignals: [],
  lastTokenCount: 0,
};

function makeProps(overrides: Partial<ComplexityNodeData> = {}): NodeProps {
  const data: ComplexityNodeData = { ...DEFAULT_DATA, ...overrides };
  return {
    id: "node-1",
    data: data as unknown as Record<string, unknown>,
    selected: false,
  } as NodeProps;
}

function mockL1(
  score: number,
  tier: "simple" | "medium" | "complex",
  signals: string[] = [],
  tokenCount = 10,
) {
  vi.mocked(scoreHeuristics).mockReturnValue({ score, tier, tokenCount, signals });
}

function mockFetch(embeddingScore: number | null) {
  global.fetch = vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue({ embeddingScore }),
  });
}

// Advance the debounce timer and flush all resulting React state updates.
async function fireScoringAndFlush() {
  await act(async () => { vi.advanceTimersByTime(400); });
  await act(async () => {});
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Fake only setTimeout/clearTimeout (the debounce). Leave setInterval real so
  // waitFor's internal poller and act's async flushing keep working.
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  mockL1(0.10, "simple");
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("rendering", () => {
  it("renders without crashing with defaultData", () => {
    render(<ComplexityNode {...makeProps()} />);
    expect(screen.getByText("Complexity Score")).toBeInTheDocument();
  });

  it("shows the subtitle", () => {
    render(<ComplexityNode {...makeProps()} />);
    expect(screen.getByText("score prompt 0 – 1")).toBeInTheDocument();
  });

  it("renders the textarea with correct placeholder", () => {
    render(<ComplexityNode {...makeProps()} />);
    expect(screen.getByPlaceholderText("Type a prompt to score it live…")).toBeInTheDocument();
  });

  it("renders the Outputs section header", () => {
    render(<ComplexityNode {...makeProps()} />);
    expect(screen.getByText("Outputs")).toBeInTheDocument();
  });

  it("renders the 'score (0–1)' output label", () => {
    render(<ComplexityNode {...makeProps()} />);
    expect(screen.getByText("score (0–1)")).toBeInTheDocument();
  });

  it("renders the 'tier' output label", () => {
    render(<ComplexityNode {...makeProps()} />);
    expect(screen.getByText("tier")).toBeInTheDocument();
  });

  it("does not show loading indicator on initial render", () => {
    render(<ComplexityNode {...makeProps()} />);
    expect(screen.queryByText("scoring…")).not.toBeInTheDocument();
  });
});

// ─── 2. Handles ───────────────────────────────────────────────────────────────

describe("handles", () => {
  it("renders the prompt input handle (target, left)", () => {
    render(<ComplexityNode {...makeProps()} />);
    const h = screen.getByTestId("handle-prompt");
    expect(h).toBeInTheDocument();
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the score output handle (source, right)", () => {
    render(<ComplexityNode {...makeProps()} />);
    const h = screen.getByTestId("handle-score");
    expect(h).toBeInTheDocument();
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("renders the tier output handle (source, right)", () => {
    render(<ComplexityNode {...makeProps()} />);
    const h = screen.getByTestId("handle-tier");
    expect(h).toBeInTheDocument();
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });
});

// ─── 3. Empty / null display state ───────────────────────────────────────────

describe("empty / null display state (defaultData)", () => {
  it("shows '–.–––' when lastScore is null", () => {
    render(<ComplexityNode {...makeProps({ lastScore: null })} />);
    expect(screen.getByText("–.–––")).toBeInTheDocument();
  });

  it("shows 'no input' when lastTier is null", () => {
    render(<ComplexityNode {...makeProps({ lastTier: null })} />);
    expect(screen.getByText("no input")).toBeInTheDocument();
  });

  it("does not show token count row when lastTokenCount is 0", () => {
    render(<ComplexityNode {...makeProps({ lastTokenCount: 0 })} />);
    expect(screen.queryByText(/tokens/)).not.toBeInTheDocument();
  });

  it("does not show Signals section when lastSignals is empty", () => {
    render(<ComplexityNode {...makeProps({ lastSignals: [] })} />);
    expect(screen.queryByText("Signals")).not.toBeInTheDocument();
  });
});

// ─── 4. Pre-populated display state ──────────────────────────────────────────

describe("pre-populated display state", () => {
  it("shows lastScore formatted to 3 decimal places", () => {
    render(<ComplexityNode {...makeProps({ lastScore: 0.742, lastTier: "medium" })} />);
    expect(screen.getByText("0.742")).toBeInTheDocument();
  });

  it("shows 0.000 when lastScore is exactly zero", () => {
    render(<ComplexityNode {...makeProps({ lastScore: 0, lastTier: "simple" })} />);
    expect(screen.getByText("0.000")).toBeInTheDocument();
  });

  it("shows 1.000 when lastScore is exactly one", () => {
    render(<ComplexityNode {...makeProps({ lastScore: 1, lastTier: "complex" })} />);
    expect(screen.getByText("1.000")).toBeInTheDocument();
  });

  it("shows 'simple' tier badge", () => {
    render(<ComplexityNode {...makeProps({ lastScore: 0.10, lastTier: "simple" })} />);
    expect(screen.getByText("simple")).toBeInTheDocument();
  });

  it("shows 'medium' tier badge", () => {
    render(<ComplexityNode {...makeProps({ lastScore: 0.50, lastTier: "medium" })} />);
    expect(screen.getByText("medium")).toBeInTheDocument();
  });

  it("shows 'complex' tier badge", () => {
    render(<ComplexityNode {...makeProps({ lastScore: 0.80, lastTier: "complex" })} />);
    expect(screen.getByText("complex")).toBeInTheDocument();
  });

  it("shows token count when lastTokenCount > 0", () => {
    render(<ComplexityNode {...makeProps({ lastTokenCount: 42 })} />);
    expect(screen.getByText("42 tokens")).toBeInTheDocument();
  });

  it("does not show token count when lastTokenCount is 0", () => {
    render(<ComplexityNode {...makeProps({ lastTokenCount: 0 })} />);
    expect(screen.queryByText(/tokens/)).not.toBeInTheDocument();
  });

  it("shows Signals section when lastSignals is non-empty", () => {
    render(<ComplexityNode {...makeProps({ lastSignals: ["explain", "why"] })} />);
    expect(screen.getByText("Signals")).toBeInTheDocument();
  });

  it("renders one chip per signal", () => {
    const signals = ["debug", "refactor", "async"];
    render(<ComplexityNode {...makeProps({ lastSignals: signals })} />);
    for (const s of signals) expect(screen.getByText(s)).toBeInTheDocument();
  });
});

// ─── 5. Score color boundaries (renders without crashing) ─────────────────────

describe("score color thresholds", () => {
  it("score 0.44 — simple boundary renders", () => {
    render(<ComplexityNode {...makeProps({ lastScore: 0.44, lastTier: "simple" })} />);
    expect(screen.getByText("0.440")).toBeInTheDocument();
  });

  it("score 0.45 — medium lower boundary renders", () => {
    render(<ComplexityNode {...makeProps({ lastScore: 0.45, lastTier: "medium" })} />);
    expect(screen.getByText("0.450")).toBeInTheDocument();
  });

  it("score 0.699 — medium upper boundary renders", () => {
    render(<ComplexityNode {...makeProps({ lastScore: 0.699, lastTier: "medium" })} />);
    expect(screen.getByText("0.699")).toBeInTheDocument();
  });

  it("score 0.70 — complex boundary renders", () => {
    render(<ComplexityNode {...makeProps({ lastScore: 0.70, lastTier: "complex" })} />);
    expect(screen.getByText("0.700")).toBeInTheDocument();
  });
});

// ─── 6. Textarea onChange ────────────────────────────────────────────────────

describe("textarea onChange", () => {
  it("calls onChange with { testPrompt: newValue }", () => {
    const onChange = vi.fn();
    render(<ComplexityNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
    expect(onChange).toHaveBeenCalledWith({ testPrompt: "hello" });
  });

  it("calls onChange with empty string when textarea is cleared", () => {
    const onChange = vi.fn();
    render(<ComplexityNode {...makeProps({ testPrompt: "existing", onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ testPrompt: "" });
  });

  it("textarea onChange payload never contains keys outside the Data interface", () => {
    const onChange = vi.fn();
    render(<ComplexityNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "x" } });
    const payload = onChange.mock.calls[0][0];
    const allowed = new Set([
      "testPrompt", "lastScore", "lastTier", "lastSignals",
      "lastTokenCount", "onChange", "connectedHandles",
    ]);
    for (const key of Object.keys(payload)) expect(allowed.has(key)).toBe(true);
  });

  it("does not crash when onChange is not provided", () => {
    render(<ComplexityNode {...makeProps()} />);
    expect(() =>
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "test" } })
    ).not.toThrow();
  });
});

// ─── 7. runScoring — empty / whitespace branch ───────────────────────────────

describe("runScoring — empty and whitespace input", () => {
  it("calls onChange with full reset payload when testPrompt is empty string", async () => {
    const onChange = vi.fn();
    render(<ComplexityNode {...makeProps({ testPrompt: "", onChange })} />);
    await fireScoringAndFlush();
    expect(onChange).toHaveBeenCalledWith({
      lastScore: null, lastTier: null, lastSignals: [], lastTokenCount: 0,
    });
  });

  it("calls onChange with reset payload when testPrompt is whitespace only", async () => {
    const onChange = vi.fn();
    render(<ComplexityNode {...makeProps({ testPrompt: "   ", onChange })} />);
    await fireScoringAndFlush();
    expect(onChange).toHaveBeenCalledWith({
      lastScore: null, lastTier: null, lastSignals: [], lastTokenCount: 0,
    });
  });

  it("does not call scoreHeuristics when testPrompt is empty", async () => {
    render(<ComplexityNode {...makeProps({ testPrompt: "" })} />);
    await fireScoringAndFlush();
    expect(scoreHeuristics).not.toHaveBeenCalled();
  });

  it("does not call fetch when testPrompt is empty", async () => {
    render(<ComplexityNode {...makeProps({ testPrompt: "" })} />);
    await fireScoringAndFlush();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ─── 8. runScoring — L1 short-circuit simple (score < 0.25) ─────────────────

describe("runScoring — L1 short-circuit simple (score < 0.25)", () => {
  it("does not call fetch", async () => {
    mockL1(0.10, "simple", [], 5);
    render(<ComplexityNode {...makeProps({ testPrompt: "Hello" })} />);
    await fireScoringAndFlush();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("calls onChange with the full L1 result payload", async () => {
    const onChange = vi.fn();
    mockL1(0.10, "simple", ["some-signal"], 7);
    render(<ComplexityNode {...makeProps({ testPrompt: "Hello", onChange })} />);
    await fireScoringAndFlush();
    expect(onChange).toHaveBeenCalledWith({
      lastScore: 0.10,
      lastTier: "simple",
      lastSignals: ["some-signal"],
      lastTokenCount: 7,
    });
  });

  it("shows (heuristic) method label", async () => {
    mockL1(0.10, "simple");
    render(<ComplexityNode {...makeProps({ testPrompt: "Hello" })} />);
    await fireScoringAndFlush();
    expect(screen.getByText("(heuristic)")).toBeInTheDocument();
  });

  it("boundary: score exactly 0.249 short-circuits (< 0.25)", async () => {
    mockL1(0.249, "simple");
    render(<ComplexityNode {...makeProps({ testPrompt: "Hello" })} />);
    await fireScoringAndFlush();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ─── 9. runScoring — L1 short-circuit complex (score > 0.70) ────────────────

describe("runScoring — L1 short-circuit complex (score > 0.70)", () => {
  it("does not call fetch", async () => {
    mockL1(0.85, "complex", ["debug"], 40);
    render(<ComplexityNode {...makeProps({ testPrompt: "complex prompt" })} />);
    await fireScoringAndFlush();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("calls onChange with the L1 complex result", async () => {
    const onChange = vi.fn();
    mockL1(0.85, "complex", ["debug"], 40);
    render(<ComplexityNode {...makeProps({ testPrompt: "complex prompt", onChange })} />);
    await fireScoringAndFlush();
    expect(onChange).toHaveBeenCalledWith({
      lastScore: 0.85,
      lastTier: "complex",
      lastSignals: ["debug"],
      lastTokenCount: 40,
    });
  });

  it("shows (heuristic) method label", async () => {
    mockL1(0.85, "complex");
    render(<ComplexityNode {...makeProps({ testPrompt: "complex prompt" })} />);
    await fireScoringAndFlush();
    expect(screen.getByText("(heuristic)")).toBeInTheDocument();
  });

  it("boundary: score exactly 0.701 short-circuits (> 0.70)", async () => {
    mockL1(0.701, "complex");
    render(<ComplexityNode {...makeProps({ testPrompt: "complex prompt" })} />);
    await fireScoringAndFlush();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ─── 10. runScoring — L2 path (0.25 ≤ score ≤ 0.70) ────────────────────────

describe("runScoring — L2 path (ambiguous band)", () => {
  it("calls fetch with correct URL, method, and JSON body", async () => {
    mockL1(0.50, "medium", [], 25);
    mockFetch(0.75);
    render(<ComplexityNode {...makeProps({ testPrompt: "medium prompt" })} />);
    await fireScoringAndFlush();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/complexity",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "medium prompt" }),
      }),
    );
  });

  it("calls onChange with blended score and tier when embeddingScore is returned", async () => {
    const onChange = vi.fn();
    const l1Score = 0.50;
    const embeddingScore = 0.75;
    mockL1(l1Score, "medium", [], 25);
    mockFetch(embeddingScore);
    render(<ComplexityNode {...makeProps({ testPrompt: "medium prompt", onChange })} />);
    await fireScoringAndFlush();
    const blended = blendScores(l1Score, embeddingScore);
    const tier    = scoreToTier(blended);
    expect(onChange).toHaveBeenCalledWith({ lastScore: blended, lastTier: tier });
  });

  it("shows (embedding) method label after L2 succeeds", async () => {
    mockL1(0.50, "medium");
    mockFetch(0.75);
    render(<ComplexityNode {...makeProps({ testPrompt: "medium prompt" })} />);
    await fireScoringAndFlush();
    expect(screen.getByText("(embedding)")).toBeInTheDocument();
  });

  it("boundary: score exactly 0.25 triggers L2", async () => {
    mockL1(0.25, "medium");
    mockFetch(0.60);
    render(<ComplexityNode {...makeProps({ testPrompt: "medium prompt" })} />);
    await fireScoringAndFlush();
    expect(global.fetch).toHaveBeenCalled();
  });

  it("boundary: score exactly 0.70 triggers L2", async () => {
    mockL1(0.70, "medium");
    mockFetch(0.60);
    render(<ComplexityNode {...makeProps({ testPrompt: "medium prompt" })} />);
    await fireScoringAndFlush();
    expect(global.fetch).toHaveBeenCalled();
  });

  it("falls back to (heuristic) when API returns embeddingScore: null", async () => {
    mockL1(0.50, "medium", [], 25);
    mockFetch(null);
    render(<ComplexityNode {...makeProps({ testPrompt: "medium prompt" })} />);
    await fireScoringAndFlush();
    expect(screen.getByText("(heuristic)")).toBeInTheDocument();
  });

  it("does not call onChange a second time when embeddingScore is null", async () => {
    const onChange = vi.fn();
    mockL1(0.50, "medium", [], 25);
    mockFetch(null);
    render(<ComplexityNode {...makeProps({ testPrompt: "medium prompt", onChange })} />);
    await fireScoringAndFlush();
    // Only the L1 call should include lastSignals; no second call with lastScore alone
    const l2Calls = onChange.mock.calls.filter(
      (c) => !("lastSignals" in c[0]),
    );
    expect(l2Calls).toHaveLength(0);
  });

  it("falls back to (heuristic) when fetch throws", async () => {
    mockL1(0.50, "medium", [], 25);
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    render(<ComplexityNode {...makeProps({ testPrompt: "medium prompt" })} />);
    await fireScoringAndFlush();
    expect(screen.getByText("(heuristic)")).toBeInTheDocument();
  });

  it("does not crash when fetch throws", async () => {
    mockL1(0.50, "medium");
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    await expect(async () => {
      render(<ComplexityNode {...makeProps({ testPrompt: "medium prompt" })} />);
      await fireScoringAndFlush();
    }).not.toThrow();
  });
});

// ─── 11. Loading indicator ────────────────────────────────────────────────────

describe("loading indicator", () => {
  it("shows 'scoring…' while fetch is in flight", async () => {
    mockL1(0.50, "medium");
    let resolveFetch!: (v: unknown) => void;
    global.fetch = vi.fn().mockReturnValue(
      new Promise((r) => { resolveFetch = r; }),
    );
    render(<ComplexityNode {...makeProps({ testPrompt: "medium prompt" })} />);
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(screen.getByText("scoring…")).toBeInTheDocument();
    // Clean up — resolve so the component doesn't hang
    await act(async () => {
      resolveFetch({ json: vi.fn().mockResolvedValue({ embeddingScore: 0.75 }) });
    });
  });

  it("hides 'scoring…' after fetch resolves", async () => {
    mockL1(0.50, "medium");
    mockFetch(0.75);
    render(<ComplexityNode {...makeProps({ testPrompt: "medium prompt" })} />);
    await fireScoringAndFlush();
    expect(screen.queryByText("scoring…")).not.toBeInTheDocument();
  });

  it("hides 'scoring…' after fetch throws", async () => {
    mockL1(0.50, "medium");
    global.fetch = vi.fn().mockRejectedValue(new Error("fail"));
    render(<ComplexityNode {...makeProps({ testPrompt: "medium prompt" })} />);
    await fireScoringAndFlush();
    expect(screen.queryByText("scoring…")).not.toBeInTheDocument();
  });

  it("never shows 'scoring…' on short-circuit paths", async () => {
    mockL1(0.10, "simple");
    render(<ComplexityNode {...makeProps({ testPrompt: "Hello" })} />);
    await fireScoringAndFlush();
    expect(screen.queryByText("scoring…")).not.toBeInTheDocument();
  });
});

// ─── 12. Debounce ─────────────────────────────────────────────────────────────

describe("debounce", () => {
  it("does not call scoreHeuristics before 300 ms", () => {
    render(<ComplexityNode {...makeProps({ testPrompt: "Hello" })} />);
    vi.advanceTimersByTime(299);
    expect(scoreHeuristics).not.toHaveBeenCalled();
  });

  it("calls scoreHeuristics at 300 ms", async () => {
    render(<ComplexityNode {...makeProps({ testPrompt: "Hello" })} />);
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(scoreHeuristics).toHaveBeenCalledWith("Hello");
  });

  it("passes the exact testPrompt value to scoreHeuristics", async () => {
    render(<ComplexityNode {...makeProps({ testPrompt: "specific text" })} />);
    await fireScoringAndFlush();
    expect(scoreHeuristics).toHaveBeenCalledWith("specific text");
  });
});

// ─── 13. onChange payload shape ───────────────────────────────────────────────

describe("onChange payload shape", () => {
  const ALLOWED = new Set([
    "testPrompt", "lastScore", "lastTier", "lastSignals",
    "lastTokenCount", "onChange", "connectedHandles",
  ]);

  it("L1 payload contains only keys from ComplexityNodeData", async () => {
    const onChange = vi.fn();
    mockL1(0.10, "simple", ["debug"], 12);
    render(<ComplexityNode {...makeProps({ testPrompt: "Hello", onChange })} />);
    await fireScoringAndFlush();
    const l1Call = onChange.mock.calls.find((c) => "lastSignals" in c[0]);
    expect(l1Call).toBeDefined();
    for (const key of Object.keys(l1Call![0])) expect(ALLOWED.has(key)).toBe(true);
  });

  it("L2 payload contains only keys from ComplexityNodeData", async () => {
    const onChange = vi.fn();
    mockL1(0.50, "medium", [], 25);
    mockFetch(0.80);
    render(<ComplexityNode {...makeProps({ testPrompt: "medium", onChange })} />);
    await fireScoringAndFlush();
    const l2Call = onChange.mock.calls.find((c) => !("lastSignals" in c[0]));
    expect(l2Call).toBeDefined();
    for (const key of Object.keys(l2Call![0])) expect(ALLOWED.has(key)).toBe(true);
  });

  it("reset payload is exactly the four expected keys", async () => {
    const onChange = vi.fn();
    render(<ComplexityNode {...makeProps({ testPrompt: "", onChange })} />);
    await fireScoringAndFlush();
    expect(onChange).toHaveBeenCalledWith({
      lastScore: null,
      lastTier: null,
      lastSignals: [],
      lastTokenCount: 0,
    });
  });
});

// ─── 14. Selected state ───────────────────────────────────────────────────────

describe("selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<ComplexityNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Complexity Score")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<ComplexityNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Complexity Score")).toBeInTheDocument();
  });
});
