import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageDetectNode } from "@/components/canvas/nodes/LanguageDetectNode";
import type { LanguageDetectNodeData } from "@/components/canvas/nodes/LanguageDetectNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

function makeProps(overrides: Partial<LanguageDetectNodeData> = {}): NodeProps {
  const data: LanguageDetectNodeData = {
    routes: [],
    hasDefault: true,
    ...overrides,
  };
  return { id: "n1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

describe("LanguageDetectNode — rendering", () => {
  it("renders without crashing", () => {
    render(<LanguageDetectNode {...makeProps()} />);
    expect(screen.getByText("Language Detect")).toBeInTheDocument();
  });

  it("shows 'add a language below' when routes is empty", () => {
    render(<LanguageDetectNode {...makeProps({ routes: [] })} />);
    expect(screen.getByText(/add a language below/i)).toBeInTheDocument();
  });

  it("shows the Routes section label", () => {
    render(<LanguageDetectNode {...makeProps()} />);
    expect(screen.getByText("Routes")).toBeInTheDocument();
  });

  it("renders a route row when routes has one entry", () => {
    render(<LanguageDetectNode {...makeProps({ routes: [{ id: "r1", lang: "eng" }] })} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.some((i) => (i as HTMLInputElement).value === "eng")).toBe(true);
  });
});

describe("LanguageDetectNode — handles", () => {
  it("renders input handle (target, left)", () => {
    render(<LanguageDetectNode {...makeProps()} />);
    expect(screen.getByTestId("handle-input")).toHaveAttribute("data-handle-type", "target");
  });

  it("renders default handle when hasDefault=true", () => {
    render(<LanguageDetectNode {...makeProps({ hasDefault: true })} />);
    expect(screen.getByTestId("handle-default")).toBeInTheDocument();
  });

  it("renders per-route source handle", () => {
    render(<LanguageDetectNode {...makeProps({ routes: [{ id: "r42", lang: "eng" }] })} />);
    expect(screen.getByTestId("handle-r42")).toHaveAttribute("data-handle-type", "source");
  });
});

describe("LanguageDetectNode — onChange", () => {
  it("calls onChange with new route when Add button clicked", () => {
    const onChange = vi.fn();
    render(<LanguageDetectNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ routes: expect.arrayContaining([expect.objectContaining({ lang: "" })]) })
    );
  });

  it("calls onChange removing a route when X button clicked", () => {
    const onChange = vi.fn();
    render(<LanguageDetectNode {...makeProps({
      onChange,
      routes: [{ id: "r1", lang: "eng" }],
    })} />);
    fireEvent.click(screen.getByRole("button", { name: "" })); // X button
    expect(onChange).toHaveBeenCalledWith({ routes: [] });
  });

  it("calls onChange updating lang when input changes", () => {
    const onChange = vi.fn();
    render(<LanguageDetectNode {...makeProps({
      onChange,
      routes: [{ id: "r1", lang: "eng" }],
    })} />);
    const input = screen.getAllByRole("textbox")[0];
    fireEvent.change(input, { target: { value: "spa" } });
    expect(onChange).toHaveBeenCalledWith({
      routes: [{ id: "r1", lang: "spa" }],
    });
  });

  it("does not throw when onChange is absent", () => {
    render(<LanguageDetectNode {...makeProps()} />);
    expect(() => fireEvent.click(screen.getByRole("button", { name: /add/i }))).not.toThrow();
  });
});
