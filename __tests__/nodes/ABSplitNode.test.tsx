import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ABSplitNode } from "@/components/canvas/nodes/ABSplitNode";
import type { ABSplitNodeData, ABSplitBranch } from "@/components/canvas/nodes/ABSplitNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TWO_BRANCHES: ABSplitBranch[] = [
  { id: "a", weight: 50 },
  { id: "b", weight: 50 },
];

const THREE_BRANCHES: ABSplitBranch[] = [
  { id: "a", weight: 33 },
  { id: "b", weight: 33 },
  { id: "c", weight: 34 },
];

const EIGHT_BRANCHES: ABSplitBranch[] = Array.from({ length: 8 }, (_, i) => ({
  id: String.fromCharCode(97 + i),
  weight: i === 0 ? 28 : i < 7 ? 12 : 4, // sums to ~100
}));

function makeProps(overrides: Partial<ABSplitNodeData> = {}): NodeProps {
  const data: ABSplitNodeData = { branches: TWO_BRANCHES, ...overrides };
  return {
    id: "node-1",
    data: data as unknown as Record<string, unknown>,
    selected: false,
  } as NodeProps;
}

const getAddBranchBtn = () => screen.getByRole("button", { name: /add branch/i });
const getRemoveBtn    = (idx: number) => {
  // Remove buttons are the X buttons; there are `branches.length` of them
  // followed by the Add branch button (when visible)
  const all = screen.getAllByRole("button");
  return all[idx];
};

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("ABSplitNode — rendering", () => {
  it("renders without crashing with default two branches", () => {
    render(<ABSplitNode {...makeProps()} />);
    expect(screen.getByText("A/B Split")).toBeInTheDocument();
  });

  it("shows the 'input' label in the body", () => {
    render(<ABSplitNode {...makeProps()} />);
    expect(screen.getByText("input")).toBeInTheDocument();
  });

  it("shows branch letter badges A and B for two branches", () => {
    render(<ABSplitNode {...makeProps()} />);
    expect(screen.getAllByText("A").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("B").length).toBeGreaterThanOrEqual(1);
  });

  it("shows branch letter badge C for three branches", () => {
    render(<ABSplitNode {...makeProps({ branches: THREE_BRANCHES })} />);
    expect(screen.getAllByText("C").length).toBeGreaterThanOrEqual(1);
  });

  it("renders a weight number input per branch", () => {
    render(<ABSplitNode {...makeProps()} />);
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs).toHaveLength(2);
  });

  it("weight inputs carry correct initial values", () => {
    render(<ABSplitNode {...makeProps()} />);
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs[0]).toHaveValue(50);
    expect(inputs[1]).toHaveValue(50);
  });

  it("renders 3 weight inputs for THREE_BRANCHES", () => {
    render(<ABSplitNode {...makeProps({ branches: THREE_BRANCHES })} />);
    expect(screen.getAllByRole("spinbutton")).toHaveLength(3);
  });

  it("shows 'total' label and the sum", () => {
    render(<ABSplitNode {...makeProps()} />);
    expect(screen.getByText("total")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("shows '≠ 100' warning when weights do not sum to 100", () => {
    const bad: ABSplitBranch[] = [{ id: "a", weight: 60 }, { id: "b", weight: 20 }];
    render(<ABSplitNode {...makeProps({ branches: bad })} />);
    expect(screen.getByText(/≠ 100/)).toBeInTheDocument();
  });

  it("does not show '≠ 100' when weights sum to 100", () => {
    render(<ABSplitNode {...makeProps()} />);
    expect(screen.queryByText(/≠ 100/)).not.toBeInTheDocument();
  });

  it("renders 'Add branch' button when under max (8)", () => {
    render(<ABSplitNode {...makeProps()} />);
    expect(getAddBranchBtn()).toBeInTheDocument();
  });

  it("hides 'Add branch' button when at max (8) branches", () => {
    render(<ABSplitNode {...makeProps({ branches: EIGHT_BRANCHES })} />);
    expect(screen.queryByRole("button", { name: /add branch/i })).not.toBeInTheDocument();
  });

  it("renders output label rows for each branch", () => {
    render(<ABSplitNode {...makeProps({ branches: TWO_BRANCHES })} />);
    expect(screen.getByText("A · 50%")).toBeInTheDocument();
    expect(screen.getByText("B · 50%")).toBeInTheDocument();
  });

  it("renders without crashing when selected=true", () => {
    render(<ABSplitNode {...makeProps()} selected={true} />);
    expect(screen.getByText("A/B Split")).toBeInTheDocument();
  });
});

// ─── 2. Subtitle ──────────────────────────────────────────────────────────────

describe("ABSplitNode — subtitle", () => {
  it("shows 'A:50% B:50%' for default two-branch 50/50 split", () => {
    render(<ABSplitNode {...makeProps()} />);
    expect(screen.getByText("A:50% B:50%")).toBeInTheDocument();
  });

  it("shows 'add branches' when no branches provided", () => {
    render(<ABSplitNode {...makeProps({ branches: [] })} />);
    expect(screen.getByText("add branches")).toBeInTheDocument();
  });

  it("shows three entries in subtitle for THREE_BRANCHES", () => {
    render(<ABSplitNode {...makeProps({ branches: THREE_BRANCHES })} />);
    expect(screen.getByText("A:33% B:33% C:34%")).toBeInTheDocument();
  });
});

// ─── 3. Handles ───────────────────────────────────────────────────────────────

describe("ABSplitNode — handles", () => {
  it("renders the 'input' target handle on the left", () => {
    render(<ABSplitNode {...makeProps()} />);
    const h = screen.getByTestId("handle-input");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("has exactly 3 handles for TWO_BRANCHES (input + a + b)", () => {
    render(<ABSplitNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(3);
  });

  it("has exactly 4 handles for THREE_BRANCHES (input + a + b + c)", () => {
    render(<ABSplitNode {...makeProps({ branches: THREE_BRANCHES })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(4);
  });

  it("renders source handle for branch a on the right", () => {
    render(<ABSplitNode {...makeProps()} />);
    const h = screen.getByTestId("handle-a");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("renders source handle for branch b on the right", () => {
    render(<ABSplitNode {...makeProps()} />);
    const h = screen.getByTestId("handle-b");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("input handle is always present regardless of branch count", () => {
    render(<ABSplitNode {...makeProps({ branches: THREE_BRANCHES })} />);
    expect(screen.getByTestId("handle-input")).toBeInTheDocument();
  });
});

// ─── 4. Add branch ────────────────────────────────────────────────────────────

describe("ABSplitNode — add branch", () => {
  it("calls onChange with one more branch when 'Add branch' clicked", () => {
    const onChange = vi.fn();
    render(<ABSplitNode {...makeProps({ onChange })} />);
    fireEvent.click(getAddBranchBtn());
    const { branches } = onChange.mock.calls[0][0] as Partial<ABSplitNodeData>;
    expect(branches).toHaveLength(3);
  });

  it("preserves existing branches when adding", () => {
    const onChange = vi.fn();
    render(<ABSplitNode {...makeProps({ onChange })} />);
    fireEvent.click(getAddBranchBtn());
    const { branches } = onChange.mock.calls[0][0] as Partial<ABSplitNodeData>;
    expect(branches![0].id).toBe("a");
    expect(branches![1].id).toBe("b");
  });

  it("new branch starts with weight 0", () => {
    const onChange = vi.fn();
    render(<ABSplitNode {...makeProps({ onChange })} />);
    fireEvent.click(getAddBranchBtn());
    const { branches } = onChange.mock.calls[0][0] as Partial<ABSplitNodeData>;
    expect(branches![2].weight).toBe(0);
  });

  it("new branch has a non-empty id", () => {
    const onChange = vi.fn();
    render(<ABSplitNode {...makeProps({ onChange })} />);
    fireEvent.click(getAddBranchBtn());
    const { branches } = onChange.mock.calls[0][0] as Partial<ABSplitNodeData>;
    expect(branches![2].id).toBeTruthy();
  });

  it("calls onChange exactly once per click", () => {
    const onChange = vi.fn();
    render(<ABSplitNode {...makeProps({ onChange })} />);
    fireEvent.click(getAddBranchBtn());
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw when 'Add branch' clicked without onChange", () => {
    expect(() => {
      render(<ABSplitNode {...makeProps()} />);
      fireEvent.click(getAddBranchBtn());
    }).not.toThrow();
  });
});

// ─── 5. Remove branch ─────────────────────────────────────────────────────────

describe("ABSplitNode — remove branch", () => {
  it("remove button is disabled when only 2 branches remain", () => {
    render(<ABSplitNode {...makeProps()} />);
    screen.getAllByRole("button").filter(
      (btn) => btn.hasAttribute("disabled") || btn.querySelector("svg")
    );
    // Both X buttons should be disabled (length === 2 branches)
    const allButtons = screen.getAllByRole("button");
    // First two buttons are X (remove), last is Add branch
    expect(allButtons[0]).toBeDisabled();
    expect(allButtons[1]).toBeDisabled();
  });

  it("calls onChange with branch removed when clicked (3 branches)", () => {
    const onChange = vi.fn();
    render(<ABSplitNode {...makeProps({ branches: THREE_BRANCHES, onChange })} />);
    // First remove button removes first branch
    fireEvent.click(getRemoveBtn(0));
    const { branches } = onChange.mock.calls[0][0] as Partial<ABSplitNodeData>;
    expect(branches).toHaveLength(2);
    expect(branches!.find((b) => b.id === "a")).toBeUndefined();
  });

  it("removes the correct branch by id", () => {
    const onChange = vi.fn();
    render(<ABSplitNode {...makeProps({ branches: THREE_BRANCHES, onChange })} />);
    fireEvent.click(getRemoveBtn(1));
    const { branches } = onChange.mock.calls[0][0] as Partial<ABSplitNodeData>;
    expect(branches!.find((b) => b.id === "b")).toBeUndefined();
    expect(branches!.find((b) => b.id === "a")).toBeDefined();
    expect(branches!.find((b) => b.id === "c")).toBeDefined();
  });

  it("calls onChange exactly once per remove click", () => {
    const onChange = vi.fn();
    render(<ABSplitNode {...makeProps({ branches: THREE_BRANCHES, onChange })} />);
    fireEvent.click(getRemoveBtn(0));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

// ─── 6. Update weight ─────────────────────────────────────────────────────────

describe("ABSplitNode — update weight", () => {
  it("calls onChange with updated weight when input changes", () => {
    const onChange = vi.fn();
    render(<ABSplitNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "70" } });
    const { branches } = onChange.mock.calls[0][0] as Partial<ABSplitNodeData>;
    expect(branches![0].weight).toBe(70);
  });

  it("preserves id and other fields when weight changes", () => {
    const onChange = vi.fn();
    render(<ABSplitNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "70" } });
    const { branches } = onChange.mock.calls[0][0] as Partial<ABSplitNodeData>;
    expect(branches![0].id).toBe("a");
    expect(branches![1].id).toBe("b");
    expect(branches![1].weight).toBe(50);
  });

  it("clamps negative values to 0", () => {
    const onChange = vi.fn();
    render(<ABSplitNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "-5" } });
    const { branches } = onChange.mock.calls[0][0] as Partial<ABSplitNodeData>;
    expect(branches![0].weight).toBe(0);
  });

  it("clamps values above 100 to 100", () => {
    const onChange = vi.fn();
    render(<ABSplitNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "150" } });
    const { branches } = onChange.mock.calls[0][0] as Partial<ABSplitNodeData>;
    expect(branches![0].weight).toBe(100);
  });

  it("treats non-numeric input as 0", () => {
    const onChange = vi.fn();
    render(<ABSplitNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "abc" } });
    const { branches } = onChange.mock.calls[0][0] as Partial<ABSplitNodeData>;
    expect(branches![0].weight).toBe(0);
  });

  it("calls onChange exactly once per change", () => {
    const onChange = vi.fn();
    render(<ABSplitNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "60" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("update-weight payload key is exactly 'branches'", () => {
    const onChange = vi.fn();
    render(<ABSplitNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "60" } });
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["branches"]);
  });
});

// ─── 7. Null / missing data safety ────────────────────────────────────────────

describe("ABSplitNode — null / missing data safety", () => {
  it("uses default 50/50 branches when branches is undefined", () => {
    const props = {
      id: "n1",
      data: {} as unknown as Record<string, unknown>,
      selected: false,
    } as NodeProps;
    render(<ABSplitNode {...props} />);
    expect(screen.getByText("A/B Split")).toBeInTheDocument();
    expect(screen.getAllByRole("spinbutton")).toHaveLength(2);
  });

  it("does not crash when connectedHandles is undefined", () => {
    expect(() =>
      render(<ABSplitNode {...makeProps({ connectedHandles: undefined })} />)
    ).not.toThrow();
  });

  it("does not crash when onChange is not provided and buttons are clicked", () => {
    const threeProps = makeProps({ branches: THREE_BRANCHES });
    expect(() => {
      render(<ABSplitNode {...threeProps} />);
      fireEvent.click(screen.getAllByRole("button")[0]); // first remove
    }).not.toThrow();
  });
});

// ─── 8. Engine logic (unit tests via pure function) ───────────────────────────

describe("ABSplitNode — engine routing logic (unit)", () => {
  function pickBranch(
    branches: Array<{ id: string; weight: number }>,
    random: number
  ): string | null {
    const total = branches.reduce((s, b) => s + b.weight, 0);
    if (total !== 100) return null;
    let cumulative = 0;
    for (const b of branches) {
      cumulative += b.weight / 100;
      if (random < cumulative) return b.id;
    }
    return branches[branches.length - 1].id;
  }

  it("routes to A when random < 0.5 (50/50 split)", () => {
    expect(pickBranch(TWO_BRANCHES, 0.0)).toBe("a");
    expect(pickBranch(TWO_BRANCHES, 0.49)).toBe("a");
  });

  it("routes to B when random >= 0.5 (50/50 split)", () => {
    expect(pickBranch(TWO_BRANCHES, 0.5)).toBe("b");
    expect(pickBranch(TWO_BRANCHES, 0.99)).toBe("b");
  });

  it("routes to A on exact 0 boundary", () => {
    expect(pickBranch(TWO_BRANCHES, 0)).toBe("a");
  });

  it("floating-point fallback: returns last branch when r=0.9999999...", () => {
    // simulate r just below 1.0 but past all cumulative thresholds
    expect(pickBranch(TWO_BRANCHES, 0.9999999999)).toBe("b");
  });

  it("returns null when weights do not sum to 100", () => {
    const bad = [{ id: "a", weight: 60 }, { id: "b", weight: 20 }];
    expect(pickBranch(bad, 0.5)).toBeNull();
  });

  it("returns null for empty branches array", () => {
    expect(pickBranch([], 0.5)).toBeNull();
  });

  it("routes correctly for three unequal branches (30/20/50)", () => {
    const b3 = [{ id: "a", weight: 30 }, { id: "b", weight: 20 }, { id: "c", weight: 50 }];
    expect(pickBranch(b3, 0.0)).toBe("a");
    expect(pickBranch(b3, 0.29)).toBe("a");
    expect(pickBranch(b3, 0.30)).toBe("b");
    expect(pickBranch(b3, 0.49)).toBe("b");
    expect(pickBranch(b3, 0.50)).toBe("c");
    expect(pickBranch(b3, 0.99)).toBe("c");
  });

  it("single-branch split of 100% always routes to that branch", () => {
    const b1 = [{ id: "solo", weight: 100 }];
    expect(pickBranch(b1, 0.0)).toBe("solo");
    expect(pickBranch(b1, 0.5)).toBe("solo");
    expect(pickBranch(b1, 0.9999)).toBe("solo");
  });

  it("routes A for weight 1 when r < 0.01", () => {
    const b = [{ id: "a", weight: 1 }, { id: "b", weight: 99 }];
    expect(pickBranch(b, 0.005)).toBe("a");
    expect(pickBranch(b, 0.01)).toBe("b");
  });
});
