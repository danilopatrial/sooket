import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JsonParserNode } from "@/components/canvas/nodes/JsonParserNode";
import type { JsonParserNodeData, JsonParserField } from "@/components/canvas/nodes/JsonParserNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

const DEFAULT_DATA: JsonParserNodeData = { fields: [] };

const ONE_FIELD: JsonParserField[] = [
  { id: "fld-1", name: "userId", defaultValue: "anon" },
];

const TWO_FIELDS: JsonParserField[] = [
  { id: "fld-1", name: "userId", defaultValue: "anon" },
  { id: "fld-2", name: "email", defaultValue: "" },
];

const THREE_FIELDS: JsonParserField[] = [
  { id: "fld-1", name: "userId", defaultValue: "" },
  { id: "fld-2", name: "email", defaultValue: "" },
  { id: "fld-3", name: "role", defaultValue: "user" },
];

function makeProps(overrides: Partial<JsonParserNodeData> = {}): NodeProps {
  const data: JsonParserNodeData = { ...DEFAULT_DATA, ...overrides };
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

describe("JsonParserNode — rendering", () => {
  it("renders without crashing with defaultData { fields: [] }", () => {
    render(<JsonParserNode {...makeProps()} />);
    expect(screen.getByText("JSON Parser")).toBeInTheDocument();
  });

  it("shows the '{}' icon in the header", () => {
    render(<JsonParserNode {...makeProps()} />);
    expect(screen.getByText("{}")).toBeInTheDocument();
  });

  it("shows the 'Fields' section label", () => {
    render(<JsonParserNode {...makeProps()} />);
    expect(screen.getByText("Fields")).toBeInTheDocument();
  });

  it("shows the empty-state text when fields is empty", () => {
    render(<JsonParserNode {...makeProps()} />);
    expect(screen.getByText("add a field below to extract data")).toBeInTheDocument();
  });

  it("does not show the empty-state text when fields exist", () => {
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD })} />);
    expect(screen.queryByText("add a field below to extract data")).not.toBeInTheDocument();
  });

  it("shows the 'dot notation works' hint text", () => {
    render(<JsonParserNode {...makeProps()} />);
    expect(screen.getByText("dot notation works · e.g. user.email")).toBeInTheDocument();
  });

  it("renders the 'Add field' button", () => {
    render(<JsonParserNode {...makeProps()} />);
    expect(getAddFieldBtn()).toBeInTheDocument();
  });

  it("does not render column headers when fields is empty", () => {
    render(<JsonParserNode {...makeProps()} />);
    expect(screen.queryByText("field name")).not.toBeInTheDocument();
    expect(screen.queryByText("if missing")).not.toBeInTheDocument();
  });

  it("renders column headers 'field name' and 'if missing' when fields exist", () => {
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD })} />);
    expect(screen.getByText("field name")).toBeInTheDocument();
    expect(screen.getByText("if missing")).toBeInTheDocument();
  });

  it("renders name and defaultValue inputs for each field", () => {
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD })} />);
    expect(screen.getByPlaceholderText("e.g. userId")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("fallback")).toBeInTheDocument();
  });

  it("shows the field name value in its input", () => {
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD })} />);
    expect(screen.getByPlaceholderText("e.g. userId")).toHaveValue("userId");
  });

  it("shows the defaultValue in its input", () => {
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD })} />);
    expect(screen.getByPlaceholderText("fallback")).toHaveValue("anon");
  });

  it("renders two rows of inputs for TWO_FIELDS", () => {
    render(<JsonParserNode {...makeProps({ fields: TWO_FIELDS })} />);
    expect(screen.getAllByPlaceholderText("e.g. userId")).toHaveLength(2);
    expect(screen.getAllByPlaceholderText("fallback")).toHaveLength(2);
  });

  it("shows empty string for defaultValue when it is empty", () => {
    render(<JsonParserNode {...makeProps({ fields: TWO_FIELDS })} />);
    const fallbackInputs = screen.getAllByPlaceholderText("fallback");
    expect(fallbackInputs[1]).toHaveValue("");
  });
});

// ─── 2. Subtitle logic ────────────────────────────────────────────────────────

describe("JsonParserNode — subtitle logic", () => {
  it("shows 'pull values out of incoming data' when fields is empty", () => {
    render(<JsonParserNode {...makeProps({ fields: [] })} />);
    expect(screen.getByText("pull values out of incoming data")).toBeInTheDocument();
  });

  it("shows '1 field extracted' when there is exactly 1 field", () => {
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD })} />);
    expect(screen.getByText("1 field extracted")).toBeInTheDocument();
  });

  it("shows '2 fields extracted' when there are 2 fields", () => {
    render(<JsonParserNode {...makeProps({ fields: TWO_FIELDS })} />);
    expect(screen.getByText("2 fields extracted")).toBeInTheDocument();
  });

  it("shows '3 fields extracted' when there are 3 fields", () => {
    render(<JsonParserNode {...makeProps({ fields: THREE_FIELDS })} />);
    expect(screen.getByText("3 fields extracted")).toBeInTheDocument();
  });

  it("uses singular 'field' for count 1, plural 'fields' for count 2", () => {
    const { rerender } = render(<JsonParserNode {...makeProps({ fields: ONE_FIELD })} />);
    expect(screen.getByText("1 field extracted")).toBeInTheDocument();

    rerender(<JsonParserNode {...makeProps({ fields: TWO_FIELDS })} />);
    expect(screen.getByText("2 fields extracted")).toBeInTheDocument();
    expect(screen.queryByText("2 field extracted")).not.toBeInTheDocument();
  });
});

// ─── 3. Handles ───────────────────────────────────────────────────────────────

describe("JsonParserNode — handles", () => {
  it("renders the 'input' handle (target, left) always", () => {
    render(<JsonParserNode {...makeProps()} />);
    const h = screen.getByTestId("handle-input");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("has exactly 1 handle when fields is empty", () => {
    render(<JsonParserNode {...makeProps({ fields: [] })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(1);
  });

  it("renders a source handle for each field using field.id", () => {
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD })} />);
    const h = screen.getByTestId("handle-fld-1");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has exactly 2 handles for ONE_FIELD (input + fld-1)", () => {
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(2);
  });

  it("renders handles for both fields in TWO_FIELDS", () => {
    render(<JsonParserNode {...makeProps({ fields: TWO_FIELDS })} />);
    expect(screen.getByTestId("handle-fld-1")).toBeInTheDocument();
    expect(screen.getByTestId("handle-fld-2")).toBeInTheDocument();
  });

  it("has exactly 3 handles for TWO_FIELDS (input + fld-1 + fld-2)", () => {
    render(<JsonParserNode {...makeProps({ fields: TWO_FIELDS })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(3);
  });

  it("has exactly 4 handles for THREE_FIELDS", () => {
    render(<JsonParserNode {...makeProps({ fields: THREE_FIELDS })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(4);
  });

  it("input handle is always present regardless of fields count", () => {
    render(<JsonParserNode {...makeProps({ fields: TWO_FIELDS })} />);
    expect(screen.getByTestId("handle-input")).toBeInTheDocument();
  });
});

// ─── 4. Add field ─────────────────────────────────────────────────────────────

describe("JsonParserNode — add field", () => {
  it("calls onChange with one extra field when 'Add field' is clicked", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: [], onChange })} />);
    fireEvent.click(getAddFieldBtn());
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonParserField[] };
    expect(fields).toHaveLength(1);
  });

  it("new field has empty name", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: [], onChange })} />);
    fireEvent.click(getAddFieldBtn());
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonParserField[] };
    expect(fields[0].name).toBe("");
  });

  it("new field has empty defaultValue", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: [], onChange })} />);
    fireEvent.click(getAddFieldBtn());
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonParserField[] };
    expect(fields[0].defaultValue).toBe("");
  });

  it("new field has a non-empty id", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: [], onChange })} />);
    fireEvent.click(getAddFieldBtn());
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonParserField[] };
    expect(fields[0].id).toBeTruthy();
  });

  it("preserves existing fields when adding a new one", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.click(getAddFieldBtn());
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonParserField[] };
    expect(fields).toHaveLength(2);
    expect(fields[0].id).toBe("fld-1");
    expect(fields[0].name).toBe("userId");
  });

  it("calls onChange exactly once per click", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: [], onChange })} />);
    fireEvent.click(getAddFieldBtn());
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw when 'Add field' is clicked and onChange is not provided", () => {
    expect(() => {
      render(<JsonParserNode {...makeProps()} />);
      fireEvent.click(getAddFieldBtn());
    }).not.toThrow();
  });
});

// ─── 5. Remove field ──────────────────────────────────────────────────────────

describe("JsonParserNode — remove field", () => {
  it("calls onChange with field removed when X is clicked", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.click(getRemoveBtn(0));
    expect(onChange).toHaveBeenCalledWith({ fields: [] });
  });

  it("removes only the first field when two fields exist", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: TWO_FIELDS, onChange })} />);
    fireEvent.click(getRemoveBtn(0));
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonParserField[] };
    expect(fields).toHaveLength(1);
    expect(fields[0].id).toBe("fld-2");
  });

  it("removes only the second field when second X is clicked", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: TWO_FIELDS, onChange })} />);
    fireEvent.click(getRemoveBtn(1));
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonParserField[] };
    expect(fields).toHaveLength(1);
    expect(fields[0].id).toBe("fld-1");
  });

  it("calls onChange exactly once per remove click", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.click(getRemoveBtn(0));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw when X is clicked and onChange is not provided", () => {
    expect(() => {
      render(<JsonParserNode {...makeProps({ fields: ONE_FIELD })} />);
      fireEvent.click(getRemoveBtn(0));
    }).not.toThrow();
  });
});

// ─── 6. Update field name ─────────────────────────────────────────────────────

describe("JsonParserNode — update field name", () => {
  it("calls onChange with updated name when name input changes", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. userId"), {
      target: { value: "accountId" },
    });
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonParserField[] };
    expect(fields[0].name).toBe("accountId");
  });

  it("preserves id and defaultValue when name changes", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. userId"), {
      target: { value: "accountId" },
    });
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonParserField[] };
    expect(fields[0].id).toBe("fld-1");
    expect(fields[0].defaultValue).toBe("anon");
  });

  it("calls onChange({ fields }) with updated name '' when cleared", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. userId"), {
      target: { value: "" },
    });
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonParserField[] };
    expect(fields[0].name).toBe("");
  });

  it("supports dot-notation names like 'user.email'", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. userId"), {
      target: { value: "user.email" },
    });
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonParserField[] };
    expect(fields[0].name).toBe("user.email");
  });

  it("updates only the target field name when two fields exist", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: TWO_FIELDS, onChange })} />);
    fireEvent.change(screen.getAllByPlaceholderText("e.g. userId")[0], {
      target: { value: "newName" },
    });
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonParserField[] };
    expect(fields[0].name).toBe("newName");
    expect(fields[1].name).toBe("email");
  });

  it("calls onChange exactly once per name change", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. userId"), {
      target: { value: "x" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

// ─── 7. Update field defaultValue ─────────────────────────────────────────────

describe("JsonParserNode — update field defaultValue", () => {
  it("calls onChange with updated defaultValue when fallback input changes", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("fallback"), {
      target: { value: "guest" },
    });
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonParserField[] };
    expect(fields[0].defaultValue).toBe("guest");
  });

  it("preserves id and name when defaultValue changes", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("fallback"), {
      target: { value: "guest" },
    });
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonParserField[] };
    expect(fields[0].id).toBe("fld-1");
    expect(fields[0].name).toBe("userId");
  });

  it("calls onChange with defaultValue '' when fallback is cleared", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("fallback"), {
      target: { value: "" },
    });
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonParserField[] };
    expect(fields[0].defaultValue).toBe("");
  });

  it("updates only the target field defaultValue when two fields exist", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: TWO_FIELDS, onChange })} />);
    fireEvent.change(screen.getAllByPlaceholderText("fallback")[0], {
      target: { value: "changed" },
    });
    const { fields } = onChange.mock.calls[0][0] as { fields: JsonParserField[] };
    expect(fields[0].defaultValue).toBe("changed");
    expect(fields[1].defaultValue).toBe("");
  });

  it("calls onChange exactly once per defaultValue change", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("fallback"), {
      target: { value: "x" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

// ─── 8. Fallback defaults ─────────────────────────────────────────────────────

describe("JsonParserNode — fallback defaults", () => {
  it("defaults fields to [] when undefined — shows empty state", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).fields = undefined;
    render(<JsonParserNode {...props} />);
    expect(screen.getByText("add a field below to extract data")).toBeInTheDocument();
  });

  it("defaults fields to [] when undefined — no field inputs rendered", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).fields = undefined;
    render(<JsonParserNode {...props} />);
    expect(screen.queryByPlaceholderText("e.g. userId")).not.toBeInTheDocument();
  });

  it("does not crash when connectedHandles is undefined", () => {
    expect(() =>
      render(<JsonParserNode {...makeProps({ connectedHandles: undefined })} />)
    ).not.toThrow();
  });

  it("renders all content correctly when data is completely empty", () => {
    const props = {
      id: "node-1",
      data: {} as unknown as Record<string, unknown>,
      selected: false,
    } as NodeProps;
    render(<JsonParserNode {...props} />);
    expect(screen.getByText("JSON Parser")).toBeInTheDocument();
    expect(screen.getByText("add a field below to extract data")).toBeInTheDocument();
  });

  it("handles a field with undefined defaultValue gracefully", () => {
    const fieldsWithUndefinedDefault: JsonParserField[] = [
      { id: "fld-x", name: "myField" }, // no defaultValue
    ];
    expect(() =>
      render(<JsonParserNode {...makeProps({ fields: fieldsWithUndefinedDefault })} />)
    ).not.toThrow();
    expect(screen.getByPlaceholderText("fallback")).toHaveValue("");
  });
});

// ─── 9. onChange payload shape ────────────────────────────────────────────────

describe("JsonParserNode — onChange payload shape", () => {
  const ALLOWED_KEYS = new Set<string>(["fields", "onChange", "connectedHandles"]);

  it("add-field payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: [], onChange })} />);
    fireEvent.click(getAddFieldBtn());
    for (const k of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(k)).toBe(true);
    }
  });

  it("add-field payload is exactly { fields: array } — no extra keys", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: [], onChange })} />);
    fireEvent.click(getAddFieldBtn());
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["fields"]);
  });

  it("remove-field payload is exactly { fields: array } — no extra keys", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.click(getRemoveBtn(0));
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["fields"]);
  });

  it("update-name payload is exactly { fields: array } — no extra keys", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. userId"), {
      target: { value: "x" },
    });
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["fields"]);
  });

  it("update-defaultValue payload is exactly { fields: array } — no extra keys", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: ONE_FIELD, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("fallback"), {
      target: { value: "x" },
    });
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["fields"]);
  });

  it("payload fields array is never undefined", () => {
    const onChange = vi.fn();
    render(<JsonParserNode {...makeProps({ fields: [], onChange })} />);
    fireEvent.click(getAddFieldBtn());
    expect(onChange.mock.calls[0][0].fields).not.toBeUndefined();
  });
});

// ─── 10. Selected state ───────────────────────────────────────────────────────

describe("JsonParserNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<JsonParserNode {...makeProps()} selected={true} />);
    expect(screen.getByText("JSON Parser")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<JsonParserNode {...makeProps()} selected={false} />);
    expect(screen.getByText("JSON Parser")).toBeInTheDocument();
  });
});
