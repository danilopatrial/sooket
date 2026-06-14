import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { AnthropicNode, MODELS_WITHOUT_TEMPERATURE } from "@/components/canvas/nodes/AnthropicNode";
import type { AnthropicNodeData } from "@/components/canvas/nodes/AnthropicNode";
import type { NodeProps } from "@xyflow/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

// Render slider as a plain range input so we can fire change events on it
vi.mock("@/components/ui/slider", () => ({
  Slider: ({
    onValueChange,
    value,
    min,
    max,
    step,
  }: {
    onValueChange?: (vals: number[]) => void;
    value?: number[];
    min?: number;
    max?: number;
    step?: number;
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

// ─── Constants ────────────────────────────────────────────────────────────────

const HAIKU  = "claude-haiku-4-5-20251001";
const SONNET = "claude-sonnet-4-6";
const OPUS   = "claude-opus-4-7";

// Registry defaultData
const DEFAULT_DATA: AnthropicNodeData = {
  model: SONNET,
  systemPrompt: "You are a helpful assistant",
  temperature: 0.7,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeProps(overrides: Partial<AnthropicNodeData> = {}): NodeProps {
  const data: AnthropicNodeData = { ...DEFAULT_DATA, ...overrides };
  return {
    id: "node-1",
    data: data as unknown as Record<string, unknown>,
    selected: false,
  } as NodeProps;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("rendering", () => {
  it("renders without crashing with defaultData", () => {
    render(<AnthropicNode {...makeProps()} />);
    expect(screen.getByText("Anthropic")).toBeInTheDocument();
  });

  it("shows the 'Model' section label", () => {
    render(<AnthropicNode {...makeProps()} />);
    expect(screen.getByText("Model")).toBeInTheDocument();
  });

  it("shows the 'System Prompt' section label", () => {
    render(<AnthropicNode {...makeProps()} />);
    expect(screen.getByText("System Prompt")).toBeInTheDocument();
  });

  it("shows the 'Temperature' section label", () => {
    render(<AnthropicNode {...makeProps()} />);
    expect(screen.getByText("Temperature")).toBeInTheDocument();
  });

  it("shows the 'User Prompt' section label", () => {
    render(<AnthropicNode {...makeProps()} />);
    expect(screen.getByText("User Prompt")).toBeInTheDocument();
  });

  it("shows the system prompt textarea with current value", () => {
    render(<AnthropicNode {...makeProps({ systemPrompt: "Be concise." })} />);
    expect(screen.getByDisplayValue("Be concise.")).toBeInTheDocument();
  });

  it("renders all three model buttons", () => {
    render(<AnthropicNode {...makeProps()} />);
    expect(screen.getByRole("button", { name: /Haiku 4\.5/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sonnet 4\.6/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Opus 4\.7/i })).toBeInTheDocument();
  });
});

// ─── 2. Handles ───────────────────────────────────────────────────────────────

describe("handles", () => {
  it("renders the model config handle (target, left)", () => {
    render(<AnthropicNode {...makeProps()} />);
    const h = screen.getByTestId("handle-model");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the systemPrompt config handle (target, left)", () => {
    render(<AnthropicNode {...makeProps()} />);
    const h = screen.getByTestId("handle-systemPrompt");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the temperature config handle (target, left)", () => {
    render(<AnthropicNode {...makeProps()} />);
    const h = screen.getByTestId("handle-temperature");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the userPrompt main handle (target, left)", () => {
    render(<AnthropicNode {...makeProps()} />);
    const h = screen.getByTestId("handle-userPrompt");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the output main handle (source, right)", () => {
    render(<AnthropicNode {...makeProps()} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });
});

// ─── 3. MODELS_WITHOUT_TEMPERATURE export ────────────────────────────────────

describe("MODELS_WITHOUT_TEMPERATURE", () => {
  it("contains Sonnet", () => {
    expect(MODELS_WITHOUT_TEMPERATURE.has(SONNET)).toBe(true);
  });

  it("contains Opus", () => {
    expect(MODELS_WITHOUT_TEMPERATURE.has(OPUS)).toBe(true);
  });

  it("does not contain Haiku", () => {
    expect(MODELS_WITHOUT_TEMPERATURE.has(HAIKU)).toBe(false);
  });
});

// ─── 4. Model selector ────────────────────────────────────────────────────────

describe("model selector — onChange", () => {
  it("clicking Haiku calls onChange with { model: HAIKU }", () => {
    const onChange = vi.fn();
    render(<AnthropicNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("Haiku 4.5").closest("button")!);
    expect(onChange).toHaveBeenCalledWith({ model: HAIKU });
  });

  it("clicking Sonnet calls onChange with { model: SONNET }", () => {
    const onChange = vi.fn();
    render(<AnthropicNode {...makeProps({ model: HAIKU, onChange })} />);
    fireEvent.click(screen.getByText("Sonnet 4.6").closest("button")!);
    expect(onChange).toHaveBeenCalledWith({ model: SONNET });
  });

  it("clicking Opus calls onChange with { model: OPUS }", () => {
    const onChange = vi.fn();
    render(<AnthropicNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("Opus 4.7").closest("button")!);
    expect(onChange).toHaveBeenCalledWith({ model: OPUS });
  });

  it("model onChange payload contains only the model key", () => {
    const onChange = vi.fn();
    render(<AnthropicNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("Haiku 4.5").closest("button")!);
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["model"]);
  });

  it("does not crash when onChange is not provided", () => {
    render(<AnthropicNode {...makeProps()} />);
    expect(() => fireEvent.click(screen.getByText("Haiku 4.5").closest("button")!)).not.toThrow();
  });
});

// ─── 5. Header model label ────────────────────────────────────────────────────

describe("header model label", () => {
  it("shows 'Haiku 4.5' in header when model is HAIKU", () => {
    render(<AnthropicNode {...makeProps({ model: HAIKU })} />);
    const headerArea = screen.getByText("Anthropic").parentElement!;
    expect(within(headerArea).getByText("Haiku 4.5")).toBeInTheDocument();
  });

  it("shows 'Sonnet 4.6' in header when model is SONNET", () => {
    render(<AnthropicNode {...makeProps({ model: SONNET })} />);
    const headerArea = screen.getByText("Anthropic").parentElement!;
    expect(within(headerArea).getByText("Sonnet 4.6")).toBeInTheDocument();
  });

  it("shows 'Opus 4.7' in header when model is OPUS", () => {
    render(<AnthropicNode {...makeProps({ model: OPUS })} />);
    const headerArea = screen.getByText("Anthropic").parentElement!;
    expect(within(headerArea).getByText("Opus 4.7")).toBeInTheDocument();
  });

  it("strips 'claude-' prefix for an unknown model value", () => {
    render(<AnthropicNode {...makeProps({ model: "claude-unknown-model" })} />);
    expect(screen.getByText("unknown-model")).toBeInTheDocument();
  });

  it("shows model string as-is when it has no 'claude-' prefix", () => {
    render(<AnthropicNode {...makeProps({ model: "gpt-4" })} />);
    expect(screen.getByText("gpt-4")).toBeInTheDocument();
  });
});

// ─── 6. Temperature branch — Haiku (supportsTemperature = true) ──────────────

describe("temperature — Haiku (supportsTemperature)", () => {
  it("renders the slider", () => {
    render(<AnthropicNode {...makeProps({ model: HAIKU, temperature: 0.5 })} />);
    expect(screen.getByTestId("temperature-slider")).toBeInTheDocument();
  });

  it("shows the temperature value formatted to 2 decimal places", () => {
    render(<AnthropicNode {...makeProps({ model: HAIKU, temperature: 0.7 })} />);
    expect(screen.getByText("0.70")).toBeInTheDocument();
  });

  it("shows temperature 0.00 at minimum", () => {
    render(<AnthropicNode {...makeProps({ model: HAIKU, temperature: 0 })} />);
    expect(screen.getByText("0.00")).toBeInTheDocument();
  });

  it("shows temperature 1.00 at maximum", () => {
    render(<AnthropicNode {...makeProps({ model: HAIKU, temperature: 1 })} />);
    expect(screen.getByText("1.00")).toBeInTheDocument();
  });

  it("shows 'precise' and 'creative' labels", () => {
    render(<AnthropicNode {...makeProps({ model: HAIKU })} />);
    expect(screen.getByText("precise")).toBeInTheDocument();
    expect(screen.getByText("creative")).toBeInTheDocument();
  });

  it("does not show 'fixed for this model'", () => {
    render(<AnthropicNode {...makeProps({ model: HAIKU })} />);
    expect(screen.queryByText("fixed for this model")).not.toBeInTheDocument();
  });

  it("slider onChange calls onChange with { temperature: value }", () => {
    const onChange = vi.fn();
    render(<AnthropicNode {...makeProps({ model: HAIKU, temperature: 0.5, onChange })} />);
    fireEvent.change(screen.getByTestId("temperature-slider"), { target: { value: "0.3" } });
    expect(onChange).toHaveBeenCalledWith({ temperature: 0.3 });
  });

  it("slider onChange at boundary 0.0", () => {
    const onChange = vi.fn();
    render(<AnthropicNode {...makeProps({ model: HAIKU, temperature: 0.5, onChange })} />);
    fireEvent.change(screen.getByTestId("temperature-slider"), { target: { value: "0" } });
    expect(onChange).toHaveBeenCalledWith({ temperature: 0 });
  });

  it("slider onChange at boundary 1.0", () => {
    const onChange = vi.fn();
    render(<AnthropicNode {...makeProps({ model: HAIKU, temperature: 0.5, onChange })} />);
    fireEvent.change(screen.getByTestId("temperature-slider"), { target: { value: "1" } });
    expect(onChange).toHaveBeenCalledWith({ temperature: 1 });
  });

  it("temperature payload contains only the temperature key", () => {
    const onChange = vi.fn();
    render(<AnthropicNode {...makeProps({ model: HAIKU, onChange })} />);
    fireEvent.change(screen.getByTestId("temperature-slider"), { target: { value: "0.5" } });
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["temperature"]);
  });
});

// ─── 7. Temperature branch — Sonnet/Opus (supportsTemperature = false) ────────

describe("temperature — Sonnet and Opus (no temperature support)", () => {
  it("Sonnet: shows 'fixed for this model'", () => {
    render(<AnthropicNode {...makeProps({ model: SONNET })} />);
    expect(screen.getByText("fixed for this model")).toBeInTheDocument();
  });

  it("Sonnet: does not render the slider", () => {
    render(<AnthropicNode {...makeProps({ model: SONNET })} />);
    expect(screen.queryByTestId("temperature-slider")).not.toBeInTheDocument();
  });

  it("Sonnet: does not show 'precise' / 'creative' labels", () => {
    render(<AnthropicNode {...makeProps({ model: SONNET })} />);
    expect(screen.queryByText("precise")).not.toBeInTheDocument();
    expect(screen.queryByText("creative")).not.toBeInTheDocument();
  });

  it("Opus: shows 'fixed for this model'", () => {
    render(<AnthropicNode {...makeProps({ model: OPUS })} />);
    expect(screen.getByText("fixed for this model")).toBeInTheDocument();
  });

  it("Opus: does not render the slider", () => {
    render(<AnthropicNode {...makeProps({ model: OPUS })} />);
    expect(screen.queryByTestId("temperature-slider")).not.toBeInTheDocument();
  });
});

// ─── 8. System prompt textarea ────────────────────────────────────────────────

describe("system prompt textarea", () => {
  it("displays the current systemPrompt value", () => {
    render(<AnthropicNode {...makeProps({ systemPrompt: "Act as a pirate." })} />);
    expect(screen.getByDisplayValue("Act as a pirate.")).toBeInTheDocument();
  });

  it("calls onChange with { systemPrompt: newValue } on input", () => {
    const onChange = vi.fn();
    render(<AnthropicNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "New prompt." } });
    expect(onChange).toHaveBeenCalledWith({ systemPrompt: "New prompt." });
  });

  it("calls onChange with empty string when cleared", () => {
    const onChange = vi.fn();
    render(<AnthropicNode {...makeProps({ systemPrompt: "something", onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ systemPrompt: "" });
  });

  it("systemPrompt payload contains only the systemPrompt key", () => {
    const onChange = vi.fn();
    render(<AnthropicNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "x" } });
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["systemPrompt"]);
  });

  it("does not crash when onChange is not provided", () => {
    render(<AnthropicNode {...makeProps()} />);
    expect(() =>
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "test" } })
    ).not.toThrow();
  });
});

// ─── 9. connectedHandles — model ─────────────────────────────────────────────

describe("connectedHandles — model", () => {
  it("shows 'using connected value' when model handle is connected", () => {
    render(<AnthropicNode {...makeProps({ connectedHandles: ["model"] })} />);
    expect(screen.getByText("using connected value")).toBeInTheDocument();
  });

  it("does not show 'using connected value' when model handle is not connected", () => {
    render(<AnthropicNode {...makeProps({ connectedHandles: [] })} />);
    expect(screen.queryByText("using connected value")).not.toBeInTheDocument();
  });
});

// ─── 10. connectedHandles — systemPrompt ─────────────────────────────────────

describe("connectedHandles — systemPrompt", () => {
  it("shows 'using connected value' when systemPrompt handle is connected", () => {
    render(<AnthropicNode {...makeProps({ connectedHandles: ["systemPrompt"] })} />);
    expect(screen.getByText("using connected value")).toBeInTheDocument();
  });

  it("shows two 'using connected value' texts when both model and systemPrompt are connected", () => {
    render(<AnthropicNode {...makeProps({ connectedHandles: ["model", "systemPrompt"] })} />);
    expect(screen.getAllByText("using connected value")).toHaveLength(2);
  });
});

// ─── 11. connectedHandles — temperature ──────────────────────────────────────

describe("connectedHandles — temperature", () => {
  it("does NOT show 'using connected value' for temperature (no such text in the node)", () => {
    render(<AnthropicNode {...makeProps({ model: HAIKU, connectedHandles: ["temperature"] })} />);
    expect(screen.queryByText("using connected value")).not.toBeInTheDocument();
  });

  it("still renders the slider when temperature handle is connected", () => {
    render(<AnthropicNode {...makeProps({ model: HAIKU, connectedHandles: ["temperature"] })} />);
    expect(screen.getByTestId("temperature-slider")).toBeInTheDocument();
  });
});

// ─── 12. Fallback defaults when data fields are undefined ─────────────────────

describe("fallback defaults", () => {
  it("falls back to Sonnet when model is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).model = undefined;
    render(<AnthropicNode {...props} />);
    // Sonnet 4.6 is the fallback (matches the executor + defaultData); it has
    // supportsTemperature=false, so the slider is replaced by the fixed notice.
    // "Sonnet 4.6" appears twice — the header subtitle and the model button.
    expect(screen.getAllByText("Sonnet 4.6").length).toBeGreaterThan(0);
    expect(screen.getByText("fixed for this model")).toBeInTheDocument();
    expect(screen.queryByTestId("temperature-slider")).not.toBeInTheDocument();
  });

  it("falls back to 'You are a helpful assistant' when systemPrompt is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).systemPrompt = undefined;
    render(<AnthropicNode {...props} />);
    expect(screen.getByDisplayValue("You are a helpful assistant")).toBeInTheDocument();
  });

  it("falls back to 0.70 temperature display when temperature is undefined (Haiku)", () => {
    const props = makeProps({ model: HAIKU });
    (props.data as Record<string, unknown>).temperature = undefined;
    render(<AnthropicNode {...props} />);
    expect(screen.getByText("0.70")).toBeInTheDocument();
  });
});

// ─── 13. onChange payload — no extra keys ─────────────────────────────────────

describe("onChange payload shape", () => {
  const ALLOWED = new Set(["model", "systemPrompt", "temperature", "connectedHandles", "onChange"]);

  it("model payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<AnthropicNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("Haiku 4.5").closest("button")!);
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED.has(key)).toBe(true);
    }
  });

  it("systemPrompt payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<AnthropicNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "x" } });
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED.has(key)).toBe(true);
    }
  });

  it("temperature payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<AnthropicNode {...makeProps({ model: HAIKU, onChange })} />);
    fireEvent.change(screen.getByTestId("temperature-slider"), { target: { value: "0.5" } });
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED.has(key)).toBe(true);
    }
  });
});

// ─── 14. Selected state ───────────────────────────────────────────────────────

describe("selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<AnthropicNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Anthropic")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<AnthropicNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Anthropic")).toBeInTheDocument();
  });
});

// ─── Max Tokens ───────────────────────────────────────────────────────────────

describe("max tokens", () => {
  it("shows the Max Tokens label and defaults to 8192", () => {
    render(<AnthropicNode {...makeProps()} />);
    expect(screen.getByText("Max Tokens")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toHaveValue(8192);
  });

  it("renders the configured maxTokens value", () => {
    render(<AnthropicNode {...makeProps({ maxTokens: 2048 })} />);
    expect(screen.getByRole("spinbutton")).toHaveValue(2048);
  });

  it("calls onChange with the new maxTokens", () => {
    const onChange = vi.fn();
    render(<AnthropicNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "1024" } });
    expect(onChange).toHaveBeenCalledWith({ maxTokens: 1024 });
  });

  it("falls back to 8192 when cleared/invalid", () => {
    const onChange = vi.fn();
    render(<AnthropicNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ maxTokens: 8192 });
  });
});
