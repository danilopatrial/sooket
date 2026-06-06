import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JsonBuilderNode } from "@/components/canvas/nodes/JsonBuilderNode";
import type { JsonBuilderNodeData, JsonBuilderField } from "@/components/canvas/nodes/JsonBuilderNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

const DEFAULT_DATA: JsonBuilderNodeData = { fields: [] };

const ONE_FIELD: JsonBuilderField[] = [
  { id: "fld-1", key: "userId", fallback: "anon" },
];

const TWO_FIELDS: JsonBuilderField[] = [
  { id: "fld-1", key: "userId", fallback: "anon" },
  { id: "fld-2", key: "email", fallback: "" },
];

const THREE_FIELDS: JsonBuilderField[] = [
  { id: "fld-1", key: "userId", fallback: "" },
  { id: "fld-2", key: "email", fallback: "" },
  { id: "fld-3", key: "role", fallback: "user" },
];

function makeProps(overrides: Partial<JsonBuilderNodeData> = {}): NodeProps {
  const data: JsonBuilderNodeData = { ...DEFAULT_DATA, ...overrides };
  return {
    id: "node-1",
    data: data as unknown as Record<string, unknown>,
    selected: false,
  } as NodeProps;
}

// Remove buttons appear before Add field: index 0..N-1 for N fields, then Add field at N
const getRemoveBtn = (idx = 0) => screen.getAllByRole("button")[idx];
const getAddFieldBtn = () => screen.getByRole("button", { name: /add field/i });

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("JsonBuilderNode — rendering", () => {
  it("renders without crashing with defaultData { fields: [] }", () => {
    render(<JsonBuilderNode {...makeProps()} />);
    expect(screen.getByText("JSON Builder")).toBeInTheDocument();
  });

  it("shows the '{}' icon in the header", () => {
    render(<JsonBuilderNode {...makeProps()} />);
    expect(screen.getByText("{}")).toBeInTheDocument();
  });

  it("shows the 'Fields' section label", () => {
    render(<JsonBuilderNode {...makeProps()} />);
    expect(screen.getByText("Fields")).toBeInTheDocument();
  });

  it("shows the empty-state text when fields is empty", () => {
    render(<JsonBuilderNode {...makeProps()} />);
    expect(screen.getByText("add a field below to build an object")).toBeInTheDocument();
  });

  it("does not show the empty-state text when fields exist", () => {
    render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD })} />);
    expect(screen.queryByText("add a field below to build an object")).not.toBeInTheDocument();
  });

  it("renders the 'Add field' button", () => {
    render(<JsonBuilderNode {...makeProps()} />);
    expect(getAddFieldBtn()).toBeInTheDocument();
  });

  it("does not render column headers when fields is empty", () => {
    render(<JsonBuilderNode {...makeProps()} />);
    expect(screen.queryByText("key name")).not.toBeInTheDocument();
    expect(screen.queryByText("if disconnected")).not.toBeInTheDocument();
  });

  it("renders column headers 'key name' and 'if disconnected' when fields exist", () => {
    render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD })} />);
    expect(screen.getByText("key name")).toBeInTheDocument();
    expect(screen.getByText("if disconnected")).toBeInTheDocument();
  });

  it("renders key and fallback inputs for each field", () => {
    render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD })} />);
    expect(screen.getByPlaceholderText("e.g. userId")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("fallback")).toBeInTheDocument();
  });

  it("shows the field key value in its input", () => {
    render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD })} />);
    expect(screen.getByPlaceholderText("e.g. userId")).toHaveValue("userId");
  });

  it("shows the fallback value in its input", () => {
    render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD })} />);
    expect(screen.getByPlaceholderText("fallback")).toHaveValue("anon");
  });

  it("renders two rows of inputs for TWO_FIELDS", () => {
    render(<JsonBuilderNode {...makeProps({ fields: TWO_FIELDS })} />);
    expect(screen.getAllByPlaceholderText("e.g. userId")).toHaveLength(2);
    expect(screen.getAllByPlaceholderText("fallback")).toHaveLength(2);
  });

  it("shows empty string for fallback when it is empty", () => {
    render(<JsonBuilderNode {...makeProps({ fields: TWO_FIELDS })} />);
    const fallbackInputs = screen.getAllByPlaceholderText("fallback");
    expect(fallbackInputs[1]).toHaveValue("");
  });

  it("shows the 'output' label in the output row", () => {
    render(<JsonBuilderNode {...makeProps()} />);
    expect(screen.getByText("output")).toBeInTheDocument();
  });
});

// ─── 2. Subtitle logic ────────────────────────────────────────────────────────

describe("JsonBuilderNode — subtitle logic", () => {
  it("shows 'construct a JSON object from inputs' when fields is empty", () => {
    render(<JsonBuilderNode {...makeProps({ fields: [] })} />);
    expect(screen.getByText("construct a JSON object from inputs")).toBeInTheDocument();
  });

  it("shows '1 field assembled' when there is exactly 1 field", () => {
    render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD })} />);
    expect(screen.getByText("1 field assembled")).toBeInTheDocument();
  });

  it("shows '2 fields assembled' when there are 2 fields", () => {
    render(<JsonBuilderNode {...makeProps({ fields: TWO_FIELDS })} />);
    expect(screen.getByText("2 fields assembled")).toBeInTheDocument();
  });

  it("shows '3 fields assembled' when there are 3 fields", () => {
    render(<JsonBuilderNode {...makeProps({ fields: THREE_FIELDS })} />);
    expect(screen.getByText("3 fields assembled")).toBeInTheDocument();
  });

  it("uses singular 'field' for count 1, plural 'fields' for count 2", () => {
    const { rerender } = render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD })} />);
    expect(screen.getByText("1 field assembled")).toBeInTheDocument();

    rerender(<JsonBuilderNode {...makeProps({ fields: TWO_FIELDS })} />);
    expect(screen.getByText("2 fields assembled")).toBeInTheDocument();
    expect(screen.queryByText("2 field assembled")).not.toBeInTheDocument();
  });
});

// ─── 3. Handles ───────────────────────────────────────────────────────────────

describe("JsonBuilderNode — handles", () => {
  it("renders the 'output' source handle (right) always", () => {
    render(<JsonBuilderNode {...makeProps()} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has exactly 1 handle when fields is empty (just output)", () => {
    render(<JsonBuilderNode {...makeProps({ fields: [] })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(1);
  });

  it("renders a target handle for each field using field.id on the left", () => {
    render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD })} />);
    const h = screen.getByTestId("handle-fld-1");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("has exactly 2 handles for ONE_FIELD (fld-1 + output)", () => {
    render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(2);
  });

  it("renders target handles for both fields in TWO_FIELDS", () => {
    render(<JsonBuilderNode {...makeProps({ fields: TWO_FIELDS })} />);
    expect(screen.getByTestId("handle-fld-1")).toBeInTheDocument();
    expect(screen.getByTestId("handle-fld-2")).toBeInTheDocument();
  });

  it("has exactly 3 handles for TWO_FIELDS (fld-1 + fld-2 + output)", () => {
    render(<JsonBuilderNode {...makeProps({ fields: TWO_FIELDS })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(3);
  });

  it("has exactly 4 handles for THREE_FIELDS", () => {
    render(<JsonBuilderNode {...makeProps({ fields: THREE_FIELDS })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(4);
  });

  it("output handle is always present regardless of fields count", () => {
    render(<JsonBuilderNode {...makeProps({ fields: TWO_FIELDS })} />);
    expect(screen.getByTestId("handle-output")).toBeInTheDocument();
  });
});

// ─── 4. Add field ─────────────────────────────────────────────────────────────

describe("JsonBuilderNode — add field", () => {
  it("calls onChange with one extra field when 'Add field' is clicked", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: [], onChange })} />);
    fireEvent.click(getAddFieldBtn());
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonBuilderField[] };
    expect(fields).toHaveLength(1);
  });

  it("new field has empty key", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: [], onChange })} />);
    fireEvent.click(getAddFieldBtn());
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonBuilderField[] };
    expect(fields[0].key).toBe("");
  });

  it("new field has empty fallback", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: [], onChange })} />);
    fireEvent.click(getAddFieldBtn());
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonBuilderField[] };
    expect(fields[0].fallback).toBe("");
  });

  it("new field has a non-empty id", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: [], onChange })} />);
    fireEvent.click(getAddFieldBtn());
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonBuilderField[] };
    expect(fields[0].id).toBeTruthy();
  });

  it("preserves existing fields when adding a new one", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.click(getAddFieldBtn());
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonBuilderField[] };
    expect(fields).toHaveLength(2);
    expect(fields[0].id).toBe("fld-1");
    expect(fields[0].key).toBe("userId");
  });

  it("calls onChange exactly once per click", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: [], onChange })} />);
    fireEvent.click(getAddFieldBtn());
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw when 'Add field' is clicked and onChange is not provided", () => {
    expect(() => {
      render(<JsonBuilderNode {...makeProps()} />);
      fireEvent.click(getAddFieldBtn());
    }).not.toThrow();
  });
});

// ─── 5. Remove field ──────────────────────────────────────────────────────────

describe("JsonBuilderNode — remove field", () => {
  it("calls onChange with field removed when X is clicked", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.click(getRemoveBtn(0));
    expect(onChange).toHaveBeenCalledWith({ fields: [] });
  });

  it("removes only the first field when two fields exist", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: TWO_FIELDS, onChange })} />);
    fireEvent.click(getRemoveBtn(0));
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonBuilderField[] };
    expect(fields).toHaveLength(1);
    expect(fields[0].id).toBe("fld-2");
  });

  it("removes only the second field when second X is clicked", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: TWO_FIELDS, onChange })} />);
    fireEvent.click(getRemoveBtn(1));
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonBuilderField[] };
    expect(fields).toHaveLength(1);
    expect(fields[0].id).toBe("fld-1");
  });

  it("calls onChange exactly once per remove click", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.click(getRemoveBtn(0));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw when X is clicked and onChange is not provided", () => {
    expect(() => {
      render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD })} />);
      fireEvent.click(getRemoveBtn(0));
    }).not.toThrow();
  });
});

// ─── 6. Update field key ──────────────────────────────────────────────────────

describe("JsonBuilderNode — update field key", () => {
  it("calls onChange with updated key when key input changes", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. userId"), {
      target: { value: "accountId" },
    });
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonBuilderField[] };
    expect(fields[0].key).toBe("accountId");
  });

  it("preserves id and fallback when key changes", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. userId"), {
      target: { value: "accountId" },
    });
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonBuilderField[] };
    expect(fields[0].id).toBe("fld-1");
    expect(fields[0].fallback).toBe("anon");
  });

  it("calls onChange({ fields }) with updated key '' when cleared", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. userId"), {
      target: { value: "" },
    });
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonBuilderField[] };
    expect(fields[0].key).toBe("");
  });

  it("updates only the target field key when two fields exist", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: TWO_FIELDS, onChange })} />);
    fireEvent.change(screen.getAllByPlaceholderText("e.g. userId")[0], {
      target: { value: "newKey" },
    });
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonBuilderField[] };
    expect(fields[0].key).toBe("newKey");
    expect(fields[1].key).toBe("email");
  });

  it("calls onChange exactly once per key change", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. userId"), {
      target: { value: "x" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

// ─── 7. Update field fallback ─────────────────────────────────────────────────

describe("JsonBuilderNode — update field fallback", () => {
  it("calls onChange with updated fallback when fallback input changes", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("fallback"), {
      target: { value: "guest" },
    });
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonBuilderField[] };
    expect(fields[0].fallback).toBe("guest");
  });

  it("preserves id and key when fallback changes", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("fallback"), {
      target: { value: "guest" },
    });
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonBuilderField[] };
    expect(fields[0].id).toBe("fld-1");
    expect(fields[0].key).toBe("userId");
  });

  it("calls onChange with fallback '' when fallback is cleared", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("fallback"), {
      target: { value: "" },
    });
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonBuilderField[] };
    expect(fields[0].fallback).toBe("");
  });

  it("updates only the target field fallback when two fields exist", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: TWO_FIELDS, onChange })} />);
    fireEvent.change(screen.getAllByPlaceholderText("fallback")[0], {
      target: { value: "changed" },
    });
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonBuilderField[] };
    expect(fields[0].fallback).toBe("changed");
    expect(fields[1].fallback).toBe("");
  });

  it("calls onChange exactly once per fallback change", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("fallback"), {
      target: { value: "x" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

// ─── 8. Fallback defaults / null safety ───────────────────────────────────────

describe("JsonBuilderNode — fallback defaults", () => {
  it("defaults fields to [] when undefined — shows empty state", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).fields = undefined;
    render(<JsonBuilderNode {...props} />);
    expect(screen.getByText("add a field below to build an object")).toBeInTheDocument();
  });

  it("defaults fields to [] when undefined — no field inputs rendered", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).fields = undefined;
    render(<JsonBuilderNode {...props} />);
    expect(screen.queryByPlaceholderText("e.g. userId")).not.toBeInTheDocument();
  });

  it("does not crash when connectedHandles is undefined", () => {
    expect(() =>
      render(<JsonBuilderNode {...makeProps({ connectedHandles: undefined })} />)
    ).not.toThrow();
  });

  it("renders all content correctly when data is completely empty", () => {
    const props = {
      id: "node-1",
      data: {} as unknown as Record<string, unknown>,
      selected: false,
    } as NodeProps;
    render(<JsonBuilderNode {...props} />);
    expect(screen.getByText("JSON Builder")).toBeInTheDocument();
    expect(screen.getByText("add a field below to build an object")).toBeInTheDocument();
  });

  it("handles a field with undefined fallback gracefully", () => {
    const fieldsWithUndefinedFallback = [
      { id: "fld-x", key: "myField" }, // no fallback
    ] as JsonBuilderField[];
    expect(() =>
      render(<JsonBuilderNode {...makeProps({ fields: fieldsWithUndefinedFallback })} />)
    ).not.toThrow();
    expect(screen.getByPlaceholderText("fallback")).toHaveValue("");
  });
});

// ─── 9. onChange payload shape ────────────────────────────────────────────────

describe("JsonBuilderNode — onChange payload shape", () => {
  const ALLOWED_KEYS = new Set<string>(["fields", "onChange", "connectedHandles"]);

  it("add-field payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: [], onChange })} />);
    fireEvent.click(getAddFieldBtn());
    for (const k of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(k)).toBe(true);
    }
  });

  it("add-field payload is exactly { fields: array } — no extra keys", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: [], onChange })} />);
    fireEvent.click(getAddFieldBtn());
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["fields"]);
  });

  it("remove-field payload is exactly { fields: array } — no extra keys", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.click(getRemoveBtn(0));
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["fields"]);
  });

  it("update-key payload is exactly { fields: array } — no extra keys", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. userId"), {
      target: { value: "x" },
    });
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["fields"]);
  });

  it("update-fallback payload is exactly { fields: array } — no extra keys", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("fallback"), {
      target: { value: "x" },
    });
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["fields"]);
  });

  it("payload fields array is never undefined", () => {
    const onChange = vi.fn();
    render(<JsonBuilderNode {...makeProps({ fields: [], onChange })} />);
    fireEvent.click(getAddFieldBtn());
    expect(onChange.mock.calls[0][0].fields).not.toBeUndefined();
  });
});

// ─── 10. Selected state ───────────────────────────────────────────────────────

describe("JsonBuilderNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<JsonBuilderNode {...makeProps()} selected={true} />);
    expect(screen.getByText("JSON Builder")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<JsonBuilderNode {...makeProps()} selected={false} />);
    expect(screen.getByText("JSON Builder")).toBeInTheDocument();
  });
});
