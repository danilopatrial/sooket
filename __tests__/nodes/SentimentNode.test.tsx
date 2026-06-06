import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SentimentNode } from "@/components/canvas/nodes/SentimentNode";
import type { SentimentNodeData } from "@/components/canvas/nodes/SentimentNode";
import type { NodeProps } from "@xyflow/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

vi.mock("@/lib/sentiment", () => ({
  analyzeSentiment: vi.fn(),
}));

vi.mock("@/components/canvas/VarField", () => ({
  VarField: ({ value, onChange, placeholder }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      data-testid="varfield-textarea"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

import { analyzeSentiment } from "@/lib/sentiment";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_DATA: SentimentNodeData = {
  testText: "",
  positiveThreshold: 0.05,
  negativeThreshold: -0.05,
  lastScore: null,
  lastLabel: null,
  lastWordCount: 0,
  lastPositiveWords: [],
  lastNegativeWords: [],
};

function makeProps(overrides: Partial<SentimentNodeData> = {}): NodeProps {
  const data: SentimentNodeData = { ...DEFAULT_DATA, ...overrides };
  return {
    id: "node-1",
    data: data as unknown as Record<string, unknown>,
    selected: false,
  } as NodeProps;
}

function mockAnalyze(
  score: number,
  label: "positive" | "neutral" | "negative",
  wordCount = 3,
  positiveWords: string[] = [],
  negativeWords: string[] = [],
) {
  vi.mocked(analyzeSentiment).mockReturnValue({ score, label, wordCount, positiveWords, negativeWords });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockAnalyze(0.3, "positive", 2, ["good"], []);
});

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("rendering", () => {
  it("renders without crashing with defaultData", () => {
    render(<SentimentNode {...makeProps()} />);
    expect(screen.getByText("Sentiment")).toBeInTheDocument();
  });

  it("shows the subtitle", () => {
    render(<SentimentNode {...makeProps()} />);
    expect(screen.getByText("score text −1 → +1")).toBeInTheDocument();
  });

  it("renders the test text placeholder", () => {
    render(<SentimentNode {...makeProps()} />);
    expect(screen.getByPlaceholderText("Type text to score it live…")).toBeInTheDocument();
  });

  it("renders the Thresholds section", () => {
    render(<SentimentNode {...makeProps()} />);
    expect(screen.getByText("Thresholds")).toBeInTheDocument();
  });

  it("renders the Outputs section", () => {
    render(<SentimentNode {...makeProps()} />);
    expect(screen.getByText("Outputs")).toBeInTheDocument();
  });

  it("renders all five output labels", () => {
    render(<SentimentNode {...makeProps()} />);
    expect(screen.getByText("score (−1…+1)")).toBeInTheDocument();
    expect(screen.getByText("label")).toBeInTheDocument();
    expect(screen.getByText("positive →")).toBeInTheDocument();
    expect(screen.getByText("neutral →")).toBeInTheDocument();
    expect(screen.getByText("negative →")).toBeInTheDocument();
  });

  it("renders without crashing when selected=true", () => {
    render(<SentimentNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Sentiment")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<SentimentNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Sentiment")).toBeInTheDocument();
  });
});

// ─── 2. Handles ───────────────────────────────────────────────────────────────

describe("handles", () => {
  it("renders the input handle (target, left)", () => {
    render(<SentimentNode {...makeProps()} />);
    const h = screen.getByTestId("handle-input");
    expect(h).toBeInTheDocument();
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the score output handle (source, right)", () => {
    render(<SentimentNode {...makeProps()} />);
    const h = screen.getByTestId("handle-score");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("renders the label output handle (source, right)", () => {
    render(<SentimentNode {...makeProps()} />);
    const h = screen.getByTestId("handle-label");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("renders the positive routing handle (source, right)", () => {
    render(<SentimentNode {...makeProps()} />);
    const h = screen.getByTestId("handle-positive");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("renders the neutral routing handle (source, right)", () => {
    render(<SentimentNode {...makeProps()} />);
    const h = screen.getByTestId("handle-neutral");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("renders the negative routing handle (source, right)", () => {
    render(<SentimentNode {...makeProps()} />);
    const h = screen.getByTestId("handle-negative");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });
});

// ─── 3. Empty / null display state ───────────────────────────────────────────

describe("empty / null display state", () => {
  it("shows '±.–––' when lastScore is null", () => {
    render(<SentimentNode {...makeProps({ lastScore: null })} />);
    expect(screen.getByText("±.–––")).toBeInTheDocument();
  });

  it("shows 'no input' when lastLabel is null", () => {
    render(<SentimentNode {...makeProps({ lastLabel: null })} />);
    expect(screen.getByText("no input")).toBeInTheDocument();
  });

  it("does not show word count when lastWordCount is 0", () => {
    render(<SentimentNode {...makeProps({ lastWordCount: 0 })} />);
    expect(screen.queryByText(/scored words/)).not.toBeInTheDocument();
  });

  it("does not show word chips when both word lists are empty", () => {
    render(<SentimentNode {...makeProps({ lastPositiveWords: [], lastNegativeWords: [] })} />);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^−/)).not.toBeInTheDocument();
  });
});

// ─── 4. Pre-populated display state ──────────────────────────────────────────

describe("pre-populated display state", () => {
  it("shows positive score with + prefix", () => {
    render(<SentimentNode {...makeProps({ lastScore: 0.742, lastLabel: "positive" })} />);
    expect(screen.getByText("+0.742")).toBeInTheDocument();
  });

  it("shows negative score with − prefix", () => {
    render(<SentimentNode {...makeProps({ lastScore: -0.550, lastLabel: "negative" })} />);
    expect(screen.getByText("-0.550")).toBeInTheDocument();
  });

  it("shows +0.000 when lastScore is exactly zero", () => {
    render(<SentimentNode {...makeProps({ lastScore: 0, lastLabel: "neutral" })} />);
    expect(screen.getByText("+0.000")).toBeInTheDocument();
  });

  it("shows +1.000 when lastScore is exactly 1", () => {
    render(<SentimentNode {...makeProps({ lastScore: 1, lastLabel: "positive" })} />);
    expect(screen.getByText("+1.000")).toBeInTheDocument();
  });

  it("shows -1.000 when lastScore is exactly -1", () => {
    render(<SentimentNode {...makeProps({ lastScore: -1, lastLabel: "negative" })} />);
    expect(screen.getByText("-1.000")).toBeInTheDocument();
  });

  it("shows 'positive' label badge", () => {
    render(<SentimentNode {...makeProps({ lastScore: 0.5, lastLabel: "positive" })} />);
    expect(screen.getByText("positive")).toBeInTheDocument();
  });

  it("shows 'neutral' label badge", () => {
    render(<SentimentNode {...makeProps({ lastScore: 0, lastLabel: "neutral" })} />);
    expect(screen.getByText("neutral")).toBeInTheDocument();
  });

  it("shows 'negative' label badge", () => {
    render(<SentimentNode {...makeProps({ lastScore: -0.5, lastLabel: "negative" })} />);
    expect(screen.getByText("negative")).toBeInTheDocument();
  });

  it("shows word count when lastWordCount > 0", () => {
    render(<SentimentNode {...makeProps({ lastWordCount: 5 })} />);
    expect(screen.getByText("5 scored words")).toBeInTheDocument();
  });

  it("shows positive word chips", () => {
    render(<SentimentNode {...makeProps({ lastPositiveWords: ["love", "great"] })} />);
    expect(screen.getByText("+love")).toBeInTheDocument();
    expect(screen.getByText("+great")).toBeInTheDocument();
  });

  it("shows negative word chips", () => {
    render(<SentimentNode {...makeProps({ lastNegativeWords: ["hate", "awful"] })} />);
    expect(screen.getByText("−hate")).toBeInTheDocument();
    expect(screen.getByText("−awful")).toBeInTheDocument();
  });

  it("shows both positive and negative chips simultaneously", () => {
    render(<SentimentNode {...makeProps({
      lastPositiveWords: ["good"],
      lastNegativeWords: ["bad"],
    })} />);
    expect(screen.getByText("+good")).toBeInTheDocument();
    expect(screen.getByText("−bad")).toBeInTheDocument();
  });
});

// ─── 5. Score boundaries ─────────────────────────────────────────────────────

describe("score display boundaries", () => {
  it("+0.050 boundary renders correctly", () => {
    render(<SentimentNode {...makeProps({ lastScore: 0.05, lastLabel: "positive" })} />);
    expect(screen.getByText("+0.050")).toBeInTheDocument();
  });

  it("-0.050 boundary renders correctly", () => {
    render(<SentimentNode {...makeProps({ lastScore: -0.05, lastLabel: "negative" })} />);
    expect(screen.getByText("-0.050")).toBeInTheDocument();
  });

  it("+0.049 shows neutral color", () => {
    render(<SentimentNode {...makeProps({ lastScore: 0.049, lastLabel: "neutral" })} />);
    expect(screen.getByText("+0.049")).toBeInTheDocument();
  });
});

// ─── 6. Threshold inputs ──────────────────────────────────────────────────────

describe("threshold inputs", () => {
  it("renders positive threshold input with correct initial value", () => {
    render(<SentimentNode {...makeProps({ positiveThreshold: 0.1 })} />);
    const inputs = screen.getAllByRole("spinbutton");
    const posInput = inputs.find((i) => (i as HTMLInputElement).value === "0.1");
    expect(posInput).toBeDefined();
  });

  it("renders negative threshold input with correct initial value", () => {
    render(<SentimentNode {...makeProps({ negativeThreshold: -0.1 })} />);
    const inputs = screen.getAllByRole("spinbutton");
    const negInput = inputs.find((i) => (i as HTMLInputElement).value === "-0.1");
    expect(negInput).toBeDefined();
  });

  it("calls onChange with updated positiveThreshold on input change", () => {
    const onChange = vi.fn();
    render(<SentimentNode {...makeProps({ onChange })} />);
    const [posInput] = screen.getAllByRole("spinbutton");
    fireEvent.change(posInput, { target: { value: "0.15" } });
    expect(onChange).toHaveBeenCalledWith({ positiveThreshold: 0.15 });
  });

  it("calls onChange with updated negativeThreshold on input change", () => {
    const onChange = vi.fn();
    render(<SentimentNode {...makeProps({ onChange })} />);
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[1], { target: { value: "-0.15" } });
    expect(onChange).toHaveBeenCalledWith({ negativeThreshold: -0.15 });
  });

  it("calls onChange with 0 when positiveThreshold input is NaN/cleared", () => {
    const onChange = vi.fn();
    render(<SentimentNode {...makeProps({ onChange })} />);
    const [posInput] = screen.getAllByRole("spinbutton");
    fireEvent.change(posInput, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ positiveThreshold: 0 });
  });

  it("calls onChange with 0 when negativeThreshold input is NaN/cleared", () => {
    const onChange = vi.fn();
    render(<SentimentNode {...makeProps({ onChange })} />);
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[1], { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ negativeThreshold: 0 });
  });

  it("does not crash when onChange is undefined and threshold changes", () => {
    render(<SentimentNode {...makeProps()} />);
    const [posInput] = screen.getAllByRole("spinbutton");
    expect(() => fireEvent.change(posInput, { target: { value: "0.2" } })).not.toThrow();
  });
});

// ─── 7. testText onChange ─────────────────────────────────────────────────────

describe("testText textarea onChange", () => {
  it("calls onChange with { testText: newValue }", () => {
    const onChange = vi.fn();
    render(<SentimentNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByTestId("varfield-textarea"), { target: { value: "great product" } });
    expect(onChange).toHaveBeenCalledWith({ testText: "great product" });
  });

  it("calls onChange with empty string when textarea is cleared", () => {
    const onChange = vi.fn();
    render(<SentimentNode {...makeProps({ testText: "existing text", onChange })} />);
    fireEvent.change(screen.getByTestId("varfield-textarea"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ testText: "" });
  });

  it("does not crash when onChange is undefined and text changes", () => {
    render(<SentimentNode {...makeProps()} />);
    expect(() =>
      fireEvent.change(screen.getByTestId("varfield-textarea"), { target: { value: "test" } })
    ).not.toThrow();
  });

  it("testText onChange payload has only the testText key", () => {
    const onChange = vi.fn();
    render(<SentimentNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByTestId("varfield-textarea"), { target: { value: "hello" } });
    const textCalls = onChange.mock.calls.filter((c) => "testText" in c[0]);
    expect(textCalls.length).toBeGreaterThan(0);
    for (const [payload] of textCalls) {
      expect(Object.keys(payload)).toEqual(["testText"]);
    }
  });
});

// ─── 8. Live scoring via useEffect ───────────────────────────────────────────

describe("live scoring (useEffect)", () => {
  it("calls analyzeSentiment when testText is non-empty", async () => {
    await act(async () => {
      render(<SentimentNode {...makeProps({ testText: "great product" })} />);
    });
    expect(analyzeSentiment).toHaveBeenCalledWith("great product", 0.05, -0.05);
  });

  it("does NOT call analyzeSentiment when testText is empty", async () => {
    await act(async () => {
      render(<SentimentNode {...makeProps({ testText: "" })} />);
    });
    expect(analyzeSentiment).not.toHaveBeenCalled();
  });

  it("does NOT call analyzeSentiment when testText is whitespace only", async () => {
    await act(async () => {
      render(<SentimentNode {...makeProps({ testText: "   " })} />);
    });
    expect(analyzeSentiment).not.toHaveBeenCalled();
  });

  it("calls onChange with reset payload when testText is empty", async () => {
    const onChange = vi.fn();
    await act(async () => {
      render(<SentimentNode {...makeProps({ testText: "", onChange })} />);
    });
    expect(onChange).toHaveBeenCalledWith({
      lastScore: null,
      lastLabel: null,
      lastWordCount: 0,
      lastPositiveWords: [],
      lastNegativeWords: [],
    });
  });

  it("calls onChange with reset payload when testText is whitespace only", async () => {
    const onChange = vi.fn();
    await act(async () => {
      render(<SentimentNode {...makeProps({ testText: "   ", onChange })} />);
    });
    expect(onChange).toHaveBeenCalledWith({
      lastScore: null,
      lastLabel: null,
      lastWordCount: 0,
      lastPositiveWords: [],
      lastNegativeWords: [],
    });
  });

  it("calls onChange with full scoring result when text is non-empty", async () => {
    const onChange = vi.fn();
    mockAnalyze(0.5, "positive", 3, ["love", "great"], []);
    await act(async () => {
      render(<SentimentNode {...makeProps({ testText: "love this great product", onChange })} />);
    });
    expect(onChange).toHaveBeenCalledWith({
      lastScore: 0.5,
      lastLabel: "positive",
      lastWordCount: 3,
      lastPositiveWords: ["love", "great"],
      lastNegativeWords: [],
    });
  });

  it("passes positiveThreshold and negativeThreshold to analyzeSentiment", async () => {
    await act(async () => {
      render(<SentimentNode {...makeProps({
        testText: "good",
        positiveThreshold: 0.2,
        negativeThreshold: -0.3,
      })} />);
    });
    expect(analyzeSentiment).toHaveBeenCalledWith("good", 0.2, -0.3);
  });

  it("does not crash when onChange is undefined and text is non-empty", async () => {
    await expect(async () => {
      await act(async () => {
        render(<SentimentNode {...makeProps({ testText: "great" })} />);
      });
    }).not.toThrow();
  });
});

// ─── 9. onChange payload shape ────────────────────────────────────────────────

describe("onChange payload shape", () => {
  const ALLOWED = new Set([
    "testText", "positiveThreshold", "negativeThreshold",
    "lastScore", "lastLabel", "lastWordCount",
    "lastPositiveWords", "lastNegativeWords",
    "onChange", "connectedHandles",
  ]);

  it("every onChange call uses only keys from SentimentNodeData", async () => {
    const onChange = vi.fn();
    mockAnalyze(0.4, "positive", 2, ["good"], []);
    await act(async () => {
      render(<SentimentNode {...makeProps({ testText: "good", onChange })} />);
    });
    fireEvent.change(screen.getByTestId("varfield-textarea"), { target: { value: "bad" } });
    const [posInput] = screen.getAllByRole("spinbutton");
    fireEvent.change(posInput, { target: { value: "0.2" } });

    for (const [payload] of onChange.mock.calls) {
      for (const key of Object.keys(payload)) {
        expect(ALLOWED.has(key)).toBe(true);
      }
    }
  });

  it("scoring reset payload contains exactly the five expected keys", async () => {
    const onChange = vi.fn();
    await act(async () => {
      render(<SentimentNode {...makeProps({ testText: "", onChange })} />);
    });
    const resetCall = onChange.mock.calls.find(([p]) => "lastScore" in p && p.lastScore === null);
    expect(resetCall).toBeDefined();
    expect(Object.keys(resetCall![0]).sort()).toEqual(
      ["lastLabel", "lastNegativeWords", "lastPositiveWords", "lastScore", "lastWordCount"].sort()
    );
  });
});
