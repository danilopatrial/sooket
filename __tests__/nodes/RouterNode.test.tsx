import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RouterNode } from "@/components/canvas/nodes/RouterNode";
import type { RouterNodeData, RouterCase } from "@/components/canvas/nodes/RouterNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

const DEFAULT_DATA: RouterNodeData = { cases: [], hasDefault: false };

const ONE_CASE: RouterCase[] = [
  { id: "c1", label: "premium", match: "gold" },
];

const TWO_CASES: RouterCase[] = [
  { id: "c1", label: "premium",  match: "gold"   },
  { id: "c2", label: "standard", match: "silver" },
];

const THREE_CASES: RouterCase[] = [
  { id: "c1", label: "premium",  match: "gold"   },
  { id: "c2", label: "standard", match: "silver" },
  { id: "c3", label: "basic",    match: "bronze" },
];

function makeProps(overrides: Partial<RouterNodeData> = {}): NodeProps {
  const data: RouterNodeData = { ...DEFAULT_DATA, ...overrides };
  return {
    id: "node-1",
    data: data as unknown as Record<string, unknown>,
    selected: false,
  } as NodeProps;
}

const getAddCaseBtn    = () => screen.getByRole("button", { name: /add case/i });
const getDefaultToggle = () => screen.getByRole("button", { name: /default fallback/i });
// Remove buttons come before Add case; their index matches the case row index
const getRemoveBtn     = (idx = 0) => {
  const all = screen.getAllByRole("button");
  // skip the last two (Add case, Default toggle)
  return all[idx];
};

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("RouterNode — rendering", () => {
  it("renders without crashing with defaultData { cases: [], hasDefault: false }", () => {
    render(<RouterNode {...makeProps()} />);
    expect(screen.getByText("Router")).toBeInTheDocument();
  });

  it("shows the 'Cases' section label", () => {
    render(<RouterNode {...makeProps()} />);
    expect(screen.getByText("Cases")).toBeInTheDocument();
  });

  it("shows the 'input value' label", () => {
    render(<RouterNode {...makeProps()} />);
    expect(screen.getByText("input value")).toBeInTheDocument();
  });

  it("shows empty-state text when cases is empty", () => {
    render(<RouterNode {...makeProps()} />);
    expect(screen.getByText("add a case below")).toBeInTheDocument();
  });

  it("does not show empty-state text when cases exist", () => {
    render(<RouterNode {...makeProps({ cases: ONE_CASE })} />);
    expect(screen.queryByText("add a case below")).not.toBeInTheDocument();
  });

  it("renders the 'Add case' button", () => {
    render(<RouterNode {...makeProps()} />);
    expect(getAddCaseBtn()).toBeInTheDocument();
  });

  it("renders the 'Default fallback' toggle button", () => {
    render(<RouterNode {...makeProps()} />);
    expect(getDefaultToggle()).toBeInTheDocument();
  });

  it("does not render column headers when cases is empty", () => {
    render(<RouterNode {...makeProps()} />);
    expect(screen.queryByText("label")).not.toBeInTheDocument();
    expect(screen.queryByText("match value")).not.toBeInTheDocument();
  });

  it("renders column headers 'label' and 'match value' when cases exist", () => {
    render(<RouterNode {...makeProps({ cases: ONE_CASE })} />);
    expect(screen.getByText("label")).toBeInTheDocument();
    expect(screen.getByText("match value")).toBeInTheDocument();
  });

  it("renders label and match inputs per case", () => {
    render(<RouterNode {...makeProps({ cases: ONE_CASE })} />);
    expect(screen.getByPlaceholderText("label")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("exact value")).toBeInTheDocument();
  });

  it("shows the label value in its input", () => {
    render(<RouterNode {...makeProps({ cases: ONE_CASE })} />);
    expect(screen.getByPlaceholderText("label")).toHaveValue("premium");
  });

  it("shows the match value in its input", () => {
    render(<RouterNode {...makeProps({ cases: ONE_CASE })} />);
    expect(screen.getByPlaceholderText("exact value")).toHaveValue("gold");
  });

  it("renders two rows of inputs for TWO_CASES", () => {
    render(<RouterNode {...makeProps({ cases: TWO_CASES })} />);
    expect(screen.getAllByPlaceholderText("label")).toHaveLength(2);
    expect(screen.getAllByPlaceholderText("exact value")).toHaveLength(2);
  });

  it("shows the output label for each case (label takes priority)", () => {
    render(<RouterNode {...makeProps({ cases: ONE_CASE })} />);
    // "premium" appears in both the label input and the output row
    expect(screen.getAllByText("premium").length).toBeGreaterThanOrEqual(1);
  });

  it("shows match value as output label when label is empty", () => {
    const caseNoLabel: RouterCase[] = [{ id: "c1", label: "", match: "gold" }];
    render(<RouterNode {...makeProps({ cases: caseNoLabel })} />);
    // "gold" appears in the VarField backdrop and the output row label
    expect(screen.getAllByText("gold").length).toBeGreaterThanOrEqual(1);
  });

  it("shows '(case)' as output label when both label and match are empty", () => {
    const emptyCase: RouterCase[] = [{ id: "c1", label: "", match: "" }];
    render(<RouterNode {...makeProps({ cases: emptyCase })} />);
    expect(screen.getByText("(case)")).toBeInTheDocument();
  });

  it("renders 'default' output label when hasDefault is true", () => {
    render(<RouterNode {...makeProps({ hasDefault: true })} />);
    expect(screen.getByText("default")).toBeInTheDocument();
  });

  it("does not render 'default' output label when hasDefault is false", () => {
    render(<RouterNode {...makeProps({ hasDefault: false })} />);
    expect(screen.queryByText("default")).not.toBeInTheDocument();
  });

  it("shows 'no outputs yet' when cases empty and no default", () => {
    render(<RouterNode {...makeProps()} />);
    expect(screen.getByText("no outputs yet")).toBeInTheDocument();
  });

  it("hides 'no outputs yet' when there is at least one case", () => {
    render(<RouterNode {...makeProps({ cases: ONE_CASE })} />);
    expect(screen.queryByText("no outputs yet")).not.toBeInTheDocument();
  });

  it("hides 'no outputs yet' when hasDefault is true even with no cases", () => {
    render(<RouterNode {...makeProps({ hasDefault: true })} />);
    expect(screen.queryByText("no outputs yet")).not.toBeInTheDocument();
  });
});

// ─── 2. Subtitle logic ────────────────────────────────────────────────────────

describe("RouterNode — subtitle logic", () => {
  it("shows 'route by value' when cases is empty and no default", () => {
    render(<RouterNode {...makeProps()} />);
    expect(screen.getByText("route by value")).toBeInTheDocument();
  });

  it("shows '1 case' for ONE_CASE without default", () => {
    render(<RouterNode {...makeProps({ cases: ONE_CASE })} />);
    expect(screen.getByText("1 case")).toBeInTheDocument();
  });

  it("shows '2 cases' for TWO_CASES without default", () => {
    render(<RouterNode {...makeProps({ cases: TWO_CASES })} />);
    expect(screen.getByText("2 cases")).toBeInTheDocument();
  });

  it("shows '1 case + default' when one case and hasDefault=true", () => {
    render(<RouterNode {...makeProps({ cases: ONE_CASE, hasDefault: true })} />);
    expect(screen.getByText("1 case + default")).toBeInTheDocument();
  });

  it("shows '2 cases + default' for TWO_CASES with hasDefault=true", () => {
    render(<RouterNode {...makeProps({ cases: TWO_CASES, hasDefault: true })} />);
    expect(screen.getByText("2 cases + default")).toBeInTheDocument();
  });

  it("uses singular 'case' for count 1, plural 'cases' for count 2", () => {
    const { rerender } = render(<RouterNode {...makeProps({ cases: ONE_CASE })} />);
    expect(screen.getByText("1 case")).toBeInTheDocument();
    rerender(<RouterNode {...makeProps({ cases: TWO_CASES })} />);
    expect(screen.getByText("2 cases")).toBeInTheDocument();
    expect(screen.queryByText("2 case")).not.toBeInTheDocument();
  });
});

// ─── 3. Handles ───────────────────────────────────────────────────────────────

describe("RouterNode — handles", () => {
  it("renders the 'input' target handle (left) always", () => {
    render(<RouterNode {...makeProps()} />);
    const h = screen.getByTestId("handle-input");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("has exactly 2 handles when cases empty and no default (input + data)", () => {
    render(<RouterNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(2);
  });

  it("renders a source handle per case using case.id", () => {
    render(<RouterNode {...makeProps({ cases: ONE_CASE })} />);
    const h = screen.getByTestId("handle-c1");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has exactly 3 handles for ONE_CASE without default (input + data + c1)", () => {
    render(<RouterNode {...makeProps({ cases: ONE_CASE })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(3);
  });

  it("renders handles for all cases in TWO_CASES", () => {
    render(<RouterNode {...makeProps({ cases: TWO_CASES })} />);
    expect(screen.getByTestId("handle-c1")).toBeInTheDocument();
    expect(screen.getByTestId("handle-c2")).toBeInTheDocument();
  });

  it("has exactly 4 handles for TWO_CASES without default (input + data + c1 + c2)", () => {
    render(<RouterNode {...makeProps({ cases: TWO_CASES })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(4);
  });

  it("has exactly 5 handles for THREE_CASES without default (input + data + c1 + c2 + c3)", () => {
    render(<RouterNode {...makeProps({ cases: THREE_CASES })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(5);
  });

  it("renders 'default' source handle (right) when hasDefault=true", () => {
    render(<RouterNode {...makeProps({ hasDefault: true })} />);
    const h = screen.getByTestId("handle-default");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has exactly 3 handles when no cases but hasDefault=true (input + data + default)", () => {
    render(<RouterNode {...makeProps({ hasDefault: true })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(3);
  });

  it("has exactly 5 handles for TWO_CASES with default (input + data + c1 + c2 + default)", () => {
    render(<RouterNode {...makeProps({ cases: TWO_CASES, hasDefault: true })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(5);
  });

  it("does not render 'default' handle when hasDefault=false", () => {
    render(<RouterNode {...makeProps({ hasDefault: false })} />);
    expect(screen.queryByTestId("handle-default")).not.toBeInTheDocument();
  });

  it("input handle is always present regardless of case count", () => {
    render(<RouterNode {...makeProps({ cases: THREE_CASES })} />);
    expect(screen.getByTestId("handle-input")).toBeInTheDocument();
  });
});

// ─── 4. Add case ──────────────────────────────────────────────────────────────

describe("RouterNode — add case", () => {
  it("calls onChange with one extra case when 'Add case' is clicked", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ onChange })} />);
    fireEvent.click(getAddCaseBtn());
    const { cases } = onChange.mock.calls[0][0] as Partial<RouterNodeData>;
    expect(cases).toHaveLength(1);
  });

  it("new case has empty label", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ onChange })} />);
    fireEvent.click(getAddCaseBtn());
    const { cases } = onChange.mock.calls[0][0] as Partial<RouterNodeData>;
    expect(cases![0].label).toBe("");
  });

  it("new case has empty match", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ onChange })} />);
    fireEvent.click(getAddCaseBtn());
    const { cases } = onChange.mock.calls[0][0] as Partial<RouterNodeData>;
    expect(cases![0].match).toBe("");
  });

  it("new case has a non-empty id", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ onChange })} />);
    fireEvent.click(getAddCaseBtn());
    const { cases } = onChange.mock.calls[0][0] as Partial<RouterNodeData>;
    expect(cases![0].id).toBeTruthy();
  });

  it("preserves existing cases when adding a new one", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ cases: ONE_CASE, onChange })} />);
    fireEvent.click(getAddCaseBtn());
    const { cases } = onChange.mock.calls[0][0] as Partial<RouterNodeData>;
    expect(cases).toHaveLength(2);
    expect(cases![0].id).toBe("c1");
    expect(cases![0].label).toBe("premium");
  });

  it("calls onChange exactly once per click", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ onChange })} />);
    fireEvent.click(getAddCaseBtn());
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("add-case payload is exactly { cases: array }", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ onChange })} />);
    fireEvent.click(getAddCaseBtn());
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["cases"]);
  });

  it("does not throw when 'Add case' clicked and onChange is not provided", () => {
    expect(() => {
      render(<RouterNode {...makeProps()} />);
      fireEvent.click(getAddCaseBtn());
    }).not.toThrow();
  });
});

// ─── 5. Remove case ───────────────────────────────────────────────────────────

describe("RouterNode — remove case", () => {
  it("calls onChange with field removed when X is clicked", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ cases: ONE_CASE, onChange })} />);
    fireEvent.click(getRemoveBtn(0));
    const { cases } = onChange.mock.calls[0][0] as Partial<RouterNodeData>;
    expect(cases).toHaveLength(0);
  });

  it("remove-case payload is exactly { cases: array }", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ cases: ONE_CASE, onChange })} />);
    fireEvent.click(getRemoveBtn(0));
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["cases"]);
  });

  it("removes only the first case when two cases exist", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ cases: TWO_CASES, onChange })} />);
    fireEvent.click(getRemoveBtn(0));
    const { cases } = onChange.mock.calls[0][0] as Partial<RouterNodeData>;
    expect(cases).toHaveLength(1);
    expect(cases![0].id).toBe("c2");
  });

  it("removes only the second case when second X clicked", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ cases: TWO_CASES, onChange })} />);
    fireEvent.click(getRemoveBtn(1));
    const { cases } = onChange.mock.calls[0][0] as Partial<RouterNodeData>;
    expect(cases).toHaveLength(1);
    expect(cases![0].id).toBe("c1");
  });

  it("calls onChange exactly once per remove click", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ cases: ONE_CASE, onChange })} />);
    fireEvent.click(getRemoveBtn(0));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw when X clicked and onChange not provided", () => {
    expect(() => {
      render(<RouterNode {...makeProps({ cases: ONE_CASE })} />);
      fireEvent.click(getRemoveBtn(0));
    }).not.toThrow();
  });
});

// ─── 6. Update label ──────────────────────────────────────────────────────────

describe("RouterNode — update case label", () => {
  it("calls onChange with updated label when label input changes", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ cases: ONE_CASE, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("label"), { target: { value: "vip" } });
    const { cases } = onChange.mock.calls[0][0] as Partial<RouterNodeData>;
    expect(cases![0].label).toBe("vip");
  });

  it("preserves id and match when label changes", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ cases: ONE_CASE, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("label"), { target: { value: "vip" } });
    const { cases } = onChange.mock.calls[0][0] as Partial<RouterNodeData>;
    expect(cases![0].id).toBe("c1");
    expect(cases![0].match).toBe("gold");
  });

  it("supports clearing label to empty string", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ cases: ONE_CASE, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("label"), { target: { value: "" } });
    const { cases } = onChange.mock.calls[0][0] as Partial<RouterNodeData>;
    expect(cases![0].label).toBe("");
  });

  it("updates only the target case label when two cases exist", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ cases: TWO_CASES, onChange })} />);
    fireEvent.change(screen.getAllByPlaceholderText("label")[0], { target: { value: "elite" } });
    const { cases } = onChange.mock.calls[0][0] as Partial<RouterNodeData>;
    expect(cases![0].label).toBe("elite");
    expect(cases![1].label).toBe("standard");
  });

  it("update-label payload is exactly { cases: array }", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ cases: ONE_CASE, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("label"), { target: { value: "x" } });
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["cases"]);
  });

  it("calls onChange exactly once per label change", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ cases: ONE_CASE, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("label"), { target: { value: "x" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

// ─── 7. Update match value ────────────────────────────────────────────────────

describe("RouterNode — update case match value", () => {
  it("calls onChange with updated match when match input changes", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ cases: ONE_CASE, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("exact value"), { target: { value: "platinum" } });
    const { cases } = onChange.mock.calls[0][0] as Partial<RouterNodeData>;
    expect(cases![0].match).toBe("platinum");
  });

  it("preserves id and label when match changes", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ cases: ONE_CASE, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("exact value"), { target: { value: "platinum" } });
    const { cases } = onChange.mock.calls[0][0] as Partial<RouterNodeData>;
    expect(cases![0].id).toBe("c1");
    expect(cases![0].label).toBe("premium");
  });

  it("supports setting match to empty string", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ cases: ONE_CASE, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("exact value"), { target: { value: "" } });
    const { cases } = onChange.mock.calls[0][0] as Partial<RouterNodeData>;
    expect(cases![0].match).toBe("");
  });

  it("updates only the target case match when two cases exist", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ cases: TWO_CASES, onChange })} />);
    fireEvent.change(screen.getAllByPlaceholderText("exact value")[1], {
      target: { value: "copper" },
    });
    const { cases } = onChange.mock.calls[0][0] as Partial<RouterNodeData>;
    expect(cases![0].match).toBe("gold");
    expect(cases![1].match).toBe("copper");
  });

  it("update-match payload is exactly { cases: array }", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ cases: ONE_CASE, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("exact value"), { target: { value: "x" } });
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["cases"]);
  });

  it("calls onChange exactly once per match change", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ cases: ONE_CASE, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("exact value"), { target: { value: "x" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

// ─── 8. Default toggle ────────────────────────────────────────────────────────

describe("RouterNode — default toggle", () => {
  it("calls onChange with hasDefault=true when toggled from false", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ hasDefault: false, onChange })} />);
    fireEvent.click(getDefaultToggle());
    expect(onChange).toHaveBeenCalledWith({ hasDefault: true });
  });

  it("calls onChange with hasDefault=false when toggled from true", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ hasDefault: true, onChange })} />);
    fireEvent.click(getDefaultToggle());
    expect(onChange).toHaveBeenCalledWith({ hasDefault: false });
  });

  it("default-toggle payload is exactly { hasDefault: boolean }", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ onChange })} />);
    fireEvent.click(getDefaultToggle());
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["hasDefault"]);
  });

  it("calls onChange exactly once per toggle click", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ onChange })} />);
    fireEvent.click(getDefaultToggle());
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw when toggled and onChange is not provided", () => {
    expect(() => {
      render(<RouterNode {...makeProps()} />);
      fireEvent.click(getDefaultToggle());
    }).not.toThrow();
  });
});

// ─── 9. onChange payload shape ────────────────────────────────────────────────

describe("RouterNode — onChange payload shape", () => {
  const ALLOWED_KEYS = new Set<string>(["cases", "hasDefault", "onChange", "connectedHandles"]);

  it("every payload key is an allowed key (add-case)", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ onChange })} />);
    fireEvent.click(getAddCaseBtn());
    for (const k of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(k)).toBe(true);
    }
  });

  it("cases array in add-case payload is never undefined", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ onChange })} />);
    fireEvent.click(getAddCaseBtn());
    expect(onChange.mock.calls[0][0].cases).not.toBeUndefined();
  });

  it("every payload key is an allowed key (default toggle)", () => {
    const onChange = vi.fn();
    render(<RouterNode {...makeProps({ onChange })} />);
    fireEvent.click(getDefaultToggle());
    for (const k of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(k)).toBe(true);
    }
  });
});

// ─── 10. Null / missing data safety ───────────────────────────────────────────

describe("RouterNode — null / missing data safety", () => {
  it("defaults cases to [] when undefined — shows empty state", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).cases = undefined;
    render(<RouterNode {...props} />);
    expect(screen.getByText("add a case below")).toBeInTheDocument();
  });

  it("defaults hasDefault to false when undefined — no default handle", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).hasDefault = undefined;
    render(<RouterNode {...props} />);
    expect(screen.queryByTestId("handle-default")).not.toBeInTheDocument();
  });

  it("renders correctly when data is completely empty", () => {
    const props = {
      id: "n1",
      data: {} as unknown as Record<string, unknown>,
      selected: false,
    } as NodeProps;
    render(<RouterNode {...props} />);
    expect(screen.getByText("Router")).toBeInTheDocument();
    expect(screen.getByText("add a case below")).toBeInTheDocument();
  });

  it("does not crash when connectedHandles is undefined", () => {
    expect(() =>
      render(<RouterNode {...makeProps({ connectedHandles: undefined })} />)
    ).not.toThrow();
  });

  it("renders without crashing when selected=true", () => {
    render(<RouterNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Router")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<RouterNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Router")).toBeInTheDocument();
  });
});
