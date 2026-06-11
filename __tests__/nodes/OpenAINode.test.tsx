import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OpenAINode, DEFAULT_OPENAI_BASE_URL } from "@/components/canvas/nodes/OpenAINode";
import type { OpenAINodeData } from "@/components/canvas/nodes/OpenAINode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

vi.mock("@/components/ui/slider", () => ({
  Slider: ({ onValueChange, value, min, max, step }: {
    onValueChange?: (vals: number[]) => void;
    value?: number[]; min?: number; max?: number; step?: number;
  }) => (
    <input
      data-testid="temperature-slider"
      type="range"
      min={min}
      max={max}
      step={step}
      value={value?.[0] ?? 0}
      onChange={(e) => onValueChange?.([parseFloat(e.target.value)])}
    />
  ),
}));

const DEFAULT_DATA: OpenAINodeData = {
  model: "gpt-4o-mini",
  systemPrompt: "You are a helpful assistant",
  temperature: 0.7,
  baseURL: DEFAULT_OPENAI_BASE_URL,
};

function makeProps(overrides: Partial<OpenAINodeData> = {}): NodeProps {
  const data = { ...DEFAULT_DATA, ...overrides };
  return { id: "node-openai", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

describe("OpenAINode — rendering", () => {
  it("renders without crashing and shows the header", () => {
    render(<OpenAINode {...makeProps()} />);
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
  });

  it.each(["Model", "Base URL", "System Prompt", "Temperature", "History", "User Prompt"])(
    "shows the '%s' section label",
    (label) => {
      render(<OpenAINode {...makeProps()} />);
      expect(screen.getByText(new RegExp(label))).toBeInTheDocument();
    },
  );

  it("shows the model value in the header subtitle", () => {
    render(<OpenAINode {...makeProps({ model: "gpt-4.1" })} />);
    expect(screen.getByText("gpt-4.1")).toBeInTheDocument();
  });

  it("renders the model input with the current value", () => {
    render(<OpenAINode {...makeProps({ model: "gpt-4o" })} />);
    expect(screen.getByDisplayValue("gpt-4o")).toBeInTheDocument();
  });

  it("renders the base URL input with the current value", () => {
    render(<OpenAINode {...makeProps({ baseURL: "http://localhost:11434/v1" })} />);
    expect(screen.getByDisplayValue("http://localhost:11434/v1")).toBeInTheDocument();
  });
});

describe("OpenAINode — handles", () => {
  it.each([
    ["model", "target"],
    ["systemPrompt", "target"],
    ["temperature", "target"],
    ["history", "target"],
    ["userPrompt", "target"],
    ["output", "source"],
  ])("renders the %s handle (%s)", (id, type) => {
    render(<OpenAINode {...makeProps()} />);
    const h = screen.getByTestId(`handle-${id}`);
    expect(h).toBeInTheDocument();
    expect(h).toHaveAttribute("data-handle-type", type);
  });
});

describe("OpenAINode — onChange", () => {
  it("typing a model calls onChange with { model }", () => {
    const onChange = vi.fn();
    render(<OpenAINode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByDisplayValue("gpt-4o-mini"), { target: { value: "gpt-4.1-mini" } });
    expect(onChange).toHaveBeenCalledWith({ model: "gpt-4.1-mini" });
  });

  it("typing a base URL calls onChange with { baseURL }", () => {
    const onChange = vi.fn();
    render(<OpenAINode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByDisplayValue(DEFAULT_OPENAI_BASE_URL), { target: { value: "https://api.groq.com/openai/v1" } });
    expect(onChange).toHaveBeenCalledWith({ baseURL: "https://api.groq.com/openai/v1" });
  });

  it("moving the temperature slider calls onChange with { temperature }", () => {
    const onChange = vi.fn();
    render(<OpenAINode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByTestId("temperature-slider"), { target: { value: "1.5" } });
    expect(onChange).toHaveBeenCalledWith({ temperature: 1.5 });
  });

  it("does not crash when onChange is not provided", () => {
    render(<OpenAINode {...makeProps()} />);
    fireEvent.change(screen.getByDisplayValue("gpt-4o-mini"), { target: { value: "x" } });
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
  });

  it("dims the model input and shows a note when 'model' is connected", () => {
    render(<OpenAINode {...makeProps({ connectedHandles: ["model"] })} />);
    expect(screen.getByText("using connected value")).toBeInTheDocument();
  });
});
