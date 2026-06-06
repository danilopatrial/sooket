import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { encode } from "gpt-tokenizer";
import { TokenCounterNode } from "@/components/canvas/nodes/TokenCounterNode";
import type { TokenCounterNodeData } from "@/components/canvas/nodes/TokenCounterNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

function makeProps(overrides: Partial<TokenCounterNodeData> = {}): NodeProps {
  const data: TokenCounterNodeData = { testPrompt: "", ...overrides };
  return { id: "node-1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

describe("TokenCounterNode — rendering", () => {
  it("renders without crashing with defaultData { testPrompt: '' }", () => {
    render(<TokenCounterNode {...makeProps()} />);
    expect(screen.getByText("Token Counter")).toBeInTheDocument();
  });

  it("shows the node subtitle", () => {
    render(<TokenCounterNode {...makeProps()} />);
    expect(screen.getByText("count tokens via GPT tokenizer")).toBeInTheDocument();
  });

  it("renders the 'tokens' label", () => {
    render(<TokenCounterNode {...makeProps()} />);
    expect(screen.getByText("tokens")).toBeInTheDocument();
  });

  it("renders the textarea with correct placeholder", () => {
    render(<TokenCounterNode {...makeProps()} />);
    expect(screen.getByPlaceholderText("Type text to count tokens…")).toBeInTheDocument();
  });
});

describe("TokenCounterNode — handles", () => {
  it("renders the input handle (target, left)", () => {
    render(<TokenCounterNode {...makeProps()} />);
    const handle = screen.getByTestId("handle-input");
    expect(handle).toBeInTheDocument();
    expect(handle).toHaveAttribute("data-handle-type", "target");
    expect(handle).toHaveAttribute("data-position", "left");
  });

  it("renders the output handle (source, right)", () => {
    render(<TokenCounterNode {...makeProps()} />);
    const handle = screen.getByTestId("handle-output");
    expect(handle).toBeInTheDocument();
    expect(handle).toHaveAttribute("data-handle-type", "source");
    expect(handle).toHaveAttribute("data-position", "right");
  });
});

describe("TokenCounterNode — empty / null state", () => {
  it("shows '–––' when testPrompt is empty string (defaultData)", () => {
    render(<TokenCounterNode {...makeProps({ testPrompt: "" })} />);
    expect(screen.getByText("–––")).toBeInTheDocument();
  });

  it("shows '–––' when testPrompt is whitespace only", async () => {
    render(<TokenCounterNode {...makeProps({ testPrompt: "   " })} />);
    await waitFor(() => expect(screen.getByText("–––")).toBeInTheDocument());
  });

  it("shows '–––' when testPrompt is tab/newline whitespace only", async () => {
    render(<TokenCounterNode {...makeProps({ testPrompt: "\t\n" })} />);
    await waitFor(() => expect(screen.getByText("–––")).toBeInTheDocument());
  });
});

describe("TokenCounterNode — token counting logic", () => {
  it("displays the correct token count for a simple word", async () => {
    const text = "Hello";
    const expected = encode(text).length;
    render(<TokenCounterNode {...makeProps({ testPrompt: text })} />);
    await waitFor(() => expect(screen.getByText(String(expected))).toBeInTheDocument());
  });

  it("displays the correct token count for a sentence", async () => {
    const text = "What is the capital of France?";
    const expected = encode(text).length;
    render(<TokenCounterNode {...makeProps({ testPrompt: text })} />);
    await waitFor(() => expect(screen.getByText(String(expected))).toBeInTheDocument());
  });

  it("displays the correct token count for a multi-line prompt", async () => {
    const text = "First line.\nSecond line.\nThird line with more words.";
    const expected = encode(text).length;
    render(<TokenCounterNode {...makeProps({ testPrompt: text })} />);
    await waitFor(() => expect(screen.getByText(String(expected))).toBeInTheDocument());
  });

  it("displays the correct token count for a long technical prompt", async () => {
    const text =
      "Debug this race condition in my async Node.js service. " +
      "Explain why it occurs and refactor using mutex patterns.";
    const expected = encode(text).length;
    render(<TokenCounterNode {...makeProps({ testPrompt: text })} />);
    await waitFor(() => expect(screen.getByText(String(expected))).toBeInTheDocument());
  });

  it("token count is a positive integer for any non-empty input", async () => {
    const text = "any input";
    const expected = encode(text).length;
    render(<TokenCounterNode {...makeProps({ testPrompt: text })} />);
    await waitFor(() => {
      expect(expected).toBeGreaterThan(0);
      expect(Number.isInteger(expected)).toBe(true);
      expect(screen.getByText(String(expected))).toBeInTheDocument();
    });
  });

  it("updates count when testPrompt prop changes", async () => {
    const textA = "Hello";
    const textB = "Hello world, this is a longer sentence with more tokens.";
    const expectedA = encode(textA).length;
    const expectedB = encode(textB).length;

    const { rerender } = render(<TokenCounterNode {...makeProps({ testPrompt: textA })} />);
    await waitFor(() => expect(screen.getByText(String(expectedA))).toBeInTheDocument());

    rerender(<TokenCounterNode {...makeProps({ testPrompt: textB })} />);
    await waitFor(() => expect(screen.getByText(String(expectedB))).toBeInTheDocument());
  });

  it("resets to '–––' when testPrompt changes from non-empty to empty", async () => {
    const { rerender } = render(<TokenCounterNode {...makeProps({ testPrompt: "Hello" })} />);
    await waitFor(() => expect(screen.queryByText("–––")).not.toBeInTheDocument());

    rerender(<TokenCounterNode {...makeProps({ testPrompt: "" })} />);
    await waitFor(() => expect(screen.getByText("–––")).toBeInTheDocument());
  });
});

describe("TokenCounterNode — onChange callback", () => {
  it("calls onChange with { testPrompt: newValue } when textarea changes", () => {
    const onChange = vi.fn();
    render(<TokenCounterNode {...makeProps({ onChange })} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Hello world" } });
    expect(onChange).toHaveBeenCalledWith({ testPrompt: "Hello world" });
  });

  it("calls onChange with the full current value, not a diff", () => {
    const onChange = vi.fn();
    render(<TokenCounterNode {...makeProps({ onChange })} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalledWith({ testPrompt: "abc" });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("calls onChange with empty string when textarea is cleared", () => {
    const onChange = vi.fn();
    render(<TokenCounterNode {...makeProps({ testPrompt: "some text", onChange })} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ testPrompt: "" });
  });

  it("onChange payload never contains keys outside TokenCounterNodeData", () => {
    const onChange = vi.fn();
    render(<TokenCounterNode {...makeProps({ onChange })} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "test" } });
    const payload = onChange.mock.calls[0][0];
    const allowedKeys = new Set(["testPrompt", "onChange", "connectedHandles"]);
    for (const key of Object.keys(payload)) {
      expect(allowedKeys.has(key)).toBe(true);
    }
  });

  it("does not call onChange when rendered without an onChange prop", () => {
    expect(() => {
      render(<TokenCounterNode {...makeProps()} />);
      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: "test" } });
    }).not.toThrow();
  });
});

describe("TokenCounterNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    const props = makeProps();
    render(<TokenCounterNode {...props} selected={true} />);
    expect(screen.getByText("Token Counter")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<TokenCounterNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Token Counter")).toBeInTheDocument();
  });
});
