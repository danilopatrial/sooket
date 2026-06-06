import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  PromptCompressionNode,
  DEFAULT_COMPRESSION_PROMPT,
} from "@/components/canvas/nodes/PromptCompressionNode";
import type { PromptCompressionNodeData } from "@/components/canvas/nodes/PromptCompressionNode";
import type { NodeProps } from "@xyflow/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

vi.mock("@/components/canvas/VarField", () => ({
  VarField: ({
    value,
    onChange,
    placeholder,
  }: {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_DATA: PromptCompressionNodeData = {
  compressionPrompt: DEFAULT_COMPRESSION_PROMPT,
  targetWords: null,
};

function makeProps(overrides: Partial<PromptCompressionNodeData> = {}): NodeProps {
  const data: PromptCompressionNodeData = { ...DEFAULT_DATA, ...overrides };
  return {
    id: "node-pc",
    data: data as unknown as Record<string, unknown>,
    selected: false,
  } as NodeProps;
}

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("PromptCompressionNode — rendering", () => {
  it("renders without crashing with defaultData", () => {
    render(<PromptCompressionNode {...makeProps()} />);
    expect(screen.getByText("Prompt Compression")).toBeInTheDocument();
  });

  it("shows the subtitle", () => {
    render(<PromptCompressionNode {...makeProps()} />);
    expect(screen.getByText("compress via Haiku · saves tokens")).toBeInTheDocument();
  });

  it("shows the Compression Prompt label", () => {
    render(<PromptCompressionNode {...makeProps()} />);
    expect(screen.getByText("Compression Prompt")).toBeInTheDocument();
  });

  it("shows the Target Words label", () => {
    render(<PromptCompressionNode {...makeProps()} />);
    expect(screen.getByText(/Target Words/i)).toBeInTheDocument();
  });

  it("shows the 'input' row label", () => {
    render(<PromptCompressionNode {...makeProps()} />);
    expect(screen.getByText("input")).toBeInTheDocument();
  });

  it("shows the 'output' row label", () => {
    render(<PromptCompressionNode {...makeProps()} />);
    expect(screen.getByText("output")).toBeInTheDocument();
  });

  it("renders without crashing when selected=true", () => {
    render(<PromptCompressionNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Prompt Compression")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<PromptCompressionNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Prompt Compression")).toBeInTheDocument();
  });
});

// ─── 2. Handles ───────────────────────────────────────────────────────────────

describe("PromptCompressionNode — handles", () => {
  it("renders the input handle (target, left)", () => {
    render(<PromptCompressionNode {...makeProps()} />);
    const h = screen.getByTestId("handle-input");
    expect(h).toBeInTheDocument();
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the output handle (source, right)", () => {
    render(<PromptCompressionNode {...makeProps()} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toBeInTheDocument();
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("renders exactly 2 handles", () => {
    render(<PromptCompressionNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(2);
  });
});

// ─── 3. Compression prompt field ──────────────────────────────────────────────

describe("PromptCompressionNode — compressionPrompt field", () => {
  it("shows the default compression prompt in the textarea", () => {
    render(<PromptCompressionNode {...makeProps()} />);
    expect(screen.getByTestId("varfield-textarea")).toHaveValue(DEFAULT_COMPRESSION_PROMPT);
  });

  it("reflects a custom compression prompt from props", () => {
    render(<PromptCompressionNode {...makeProps({ compressionPrompt: "TL;DR the following:" })} />);
    expect(screen.getByTestId("varfield-textarea")).toHaveValue("TL;DR the following:");
  });

  it("calls onChange({ compressionPrompt }) when textarea changes", () => {
    const onChange = vi.fn();
    render(<PromptCompressionNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByTestId("varfield-textarea"), {
      target: { value: "Summarize briefly:" },
    });
    expect(onChange).toHaveBeenCalledWith({ compressionPrompt: "Summarize briefly:" });
  });

  it("calls onChange with empty string when textarea is cleared", () => {
    const onChange = vi.fn();
    render(<PromptCompressionNode {...makeProps({ compressionPrompt: "something", onChange })} />);
    fireEvent.change(screen.getByTestId("varfield-textarea"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ compressionPrompt: "" });
  });

  it("does not crash when onChange is undefined and textarea changes", () => {
    render(<PromptCompressionNode {...makeProps()} />);
    expect(() =>
      fireEvent.change(screen.getByTestId("varfield-textarea"), { target: { value: "x" } })
    ).not.toThrow();
  });

  it("compressionPrompt onChange payload has only the compressionPrompt key", () => {
    const onChange = vi.fn();
    render(<PromptCompressionNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByTestId("varfield-textarea"), { target: { value: "hi" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["compressionPrompt"]);
  });

  it("uses DEFAULT_COMPRESSION_PROMPT when compressionPrompt is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).compressionPrompt = undefined;
    render(<PromptCompressionNode {...props} />);
    expect(screen.getByTestId("varfield-textarea")).toHaveValue(DEFAULT_COMPRESSION_PROMPT);
  });
});

// ─── 4. Target words field ────────────────────────────────────────────────────

describe("PromptCompressionNode — targetWords field", () => {
  it("renders the target words input as empty when targetWords is null", () => {
    render(<PromptCompressionNode {...makeProps({ targetWords: null })} />);
    expect(screen.getByRole("spinbutton")).toHaveValue(null);
  });

  it("reflects a numeric targetWords value", () => {
    render(<PromptCompressionNode {...makeProps({ targetWords: 150 })} />);
    expect(screen.getByRole("spinbutton")).toHaveValue(150);
  });

  it("calls onChange({ targetWords: N }) when a valid number is entered", () => {
    const onChange = vi.fn();
    render(<PromptCompressionNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "200" } });
    expect(onChange).toHaveBeenCalledWith({ targetWords: 200 });
  });

  it("calls onChange({ targetWords: null }) when input is cleared", () => {
    const onChange = vi.fn();
    render(<PromptCompressionNode {...makeProps({ targetWords: 100, onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ targetWords: null });
  });

  it("calls onChange({ targetWords: null }) when value is 0", () => {
    const onChange = vi.fn();
    render(<PromptCompressionNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "0" } });
    expect(onChange).toHaveBeenCalledWith({ targetWords: null });
  });

  it("calls onChange({ targetWords: null }) when value is negative", () => {
    const onChange = vi.fn();
    render(<PromptCompressionNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "-5" } });
    expect(onChange).toHaveBeenCalledWith({ targetWords: null });
  });

  it("calls onChange({ targetWords: 1 }) for the minimum positive value", () => {
    const onChange = vi.fn();
    render(<PromptCompressionNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "1" } });
    expect(onChange).toHaveBeenCalledWith({ targetWords: 1 });
  });

  it("does not crash when onChange is undefined and targetWords changes", () => {
    render(<PromptCompressionNode {...makeProps()} />);
    expect(() =>
      fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "100" } })
    ).not.toThrow();
  });

  it("targetWords onChange payload has only the targetWords key", () => {
    const onChange = vi.fn();
    render(<PromptCompressionNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "50" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["targetWords"]);
  });

  it("defaults targetWords to null when undefined in props", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).targetWords = undefined;
    render(<PromptCompressionNode {...props} />);
    expect(screen.getByRole("spinbutton")).toHaveValue(null);
  });
});

// ─── 5. connectedHandles label highlight ──────────────────────────────────────

describe("PromptCompressionNode — connectedHandles", () => {
  it("input label is highlighted when 'input' is in connectedHandles", () => {
    render(<PromptCompressionNode {...makeProps({ connectedHandles: ["input"] })} />);
    const label = screen.getByText("input");
    expect(label.className).toContain("text-violet-300");
  });

  it("input label is dimmed when connectedHandles is empty", () => {
    render(<PromptCompressionNode {...makeProps({ connectedHandles: [] })} />);
    const label = screen.getByText("input");
    expect(label.className).toContain("text-white/30");
  });

  it("renders without crashing when connectedHandles is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).connectedHandles = undefined;
    render(<PromptCompressionNode {...props} />);
    expect(screen.getByText("Prompt Compression")).toBeInTheDocument();
  });
});

// ─── 6. Empty / null / missing input — no crashes ─────────────────────────────

describe("PromptCompressionNode — null/missing data resilience", () => {
  it("does not crash when data is an empty object", () => {
    const props = {
      id: "node-pc",
      data: {} as Record<string, unknown>,
      selected: false,
    } as NodeProps;
    expect(() => render(<PromptCompressionNode {...props} />)).not.toThrow();
  });

  it("renders default compressionPrompt when data is empty", () => {
    const props = {
      id: "node-pc",
      data: {} as Record<string, unknown>,
      selected: false,
    } as NodeProps;
    render(<PromptCompressionNode {...props} />);
    expect(screen.getByTestId("varfield-textarea")).toHaveValue(DEFAULT_COMPRESSION_PROMPT);
  });

  it("target words input is empty when data is empty (null default)", () => {
    const props = {
      id: "node-pc",
      data: {} as Record<string, unknown>,
      selected: false,
    } as NodeProps;
    render(<PromptCompressionNode {...props} />);
    expect(screen.getByRole("spinbutton")).toHaveValue(null);
  });
});

// ─── 7. onChange payload shape — no stray keys ────────────────────────────────

describe("PromptCompressionNode — onChange payload shape", () => {
  const ALLOWED = new Set<string>([
    "compressionPrompt",
    "targetWords",
    "onChange",
    "connectedHandles",
  ]);

  it("every onChange call uses only keys from PromptCompressionNodeData", () => {
    const onChange = vi.fn();
    render(<PromptCompressionNode {...makeProps({ onChange })} />);

    fireEvent.change(screen.getByTestId("varfield-textarea"), {
      target: { value: "Summarize:" },
    });
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "100" } });

    for (const [payload] of onChange.mock.calls) {
      for (const key of Object.keys(payload)) {
        expect(ALLOWED.has(key)).toBe(true);
      }
    }
  });

  it("onChange is never called with undefined values", () => {
    const onChange = vi.fn();
    render(<PromptCompressionNode {...makeProps({ onChange })} />);

    fireEvent.change(screen.getByTestId("varfield-textarea"), { target: { value: "x" } });
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "50" } });

    for (const [payload] of onChange.mock.calls) {
      for (const val of Object.values(payload)) {
        expect(val).not.toBeUndefined();
      }
    }
  });
});
