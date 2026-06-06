import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResponseBuilderNode } from "@/components/canvas/nodes/ResponseBuilderNode";
import type { ResponseBuilderNodeData, ResponseHeader } from "@/components/canvas/nodes/ResponseBuilderNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

const DEFAULT_DATA: ResponseBuilderNodeData = { status: 200, headers: [] };

function makeProps(overrides: Partial<ResponseBuilderNodeData> = {}): NodeProps {
  const data: ResponseBuilderNodeData = { ...DEFAULT_DATA, ...overrides };
  return { id: "node-1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

const PRE_HEADERS: ResponseHeader[] = [
  { id: "hdr-1", key: "Content-Type", value: "application/json" },
];

const TWO_HEADERS: ResponseHeader[] = [
  { id: "hdr-1", key: "Content-Type", value: "application/json" },
  { id: "hdr-2", key: "Authorization", value: "Bearer token" },
];

// With no headers: 6 preset buttons + 1 "Add header" = 7 total.
// With n headers:  6 preset buttons + n X-buttons + 1 "Add header" = 7+n total.
// X-buttons start at index 6 (0-based).
const getRemoveBtn = (idx = 0) => screen.getAllByRole("button")[6 + idx];
const getAddHeaderBtn = () => screen.getByRole("button", { name: /add header/i });

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("ResponseBuilderNode — rendering", () => {
  it("renders without crashing with defaultData { status: 200, headers: [] }", () => {
    render(<ResponseBuilderNode {...makeProps()} />);
    expect(screen.getByText("Response Builder")).toBeInTheDocument();
  });

  it("shows the 'Status Code' section label", () => {
    render(<ResponseBuilderNode {...makeProps()} />);
    expect(screen.getByText("Status Code")).toBeInTheDocument();
  });

  it("shows the 'Response Headers' section label", () => {
    render(<ResponseBuilderNode {...makeProps()} />);
    expect(screen.getByText("Response Headers")).toBeInTheDocument();
  });

  it("shows the 'Body' row label", () => {
    render(<ResponseBuilderNode {...makeProps()} />);
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("shows the 'reply' output label", () => {
    render(<ResponseBuilderNode {...makeProps()} />);
    expect(screen.getByText("reply")).toBeInTheDocument();
  });

  it("renders all six status preset buttons", () => {
    render(<ResponseBuilderNode {...makeProps()} />);
    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText("201")).toBeInTheDocument();
    expect(screen.getByText("400")).toBeInTheDocument();
    expect(screen.getByText("401")).toBeInTheDocument();
    expect(screen.getByText("403")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
  });

  it("renders all six preset friendly labels", () => {
    render(<ResponseBuilderNode {...makeProps()} />);
    expect(screen.getByText("OK")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.getByText("Bad Input")).toBeInTheDocument();
    expect(screen.getByText("Needs Login")).toBeInTheDocument();
    expect(screen.getByText("Forbidden")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("renders the status number input", () => {
    render(<ResponseBuilderNode {...makeProps()} />);
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
  });

  it("renders the 'Add header' button", () => {
    render(<ResponseBuilderNode {...makeProps()} />);
    expect(getAddHeaderBtn()).toBeInTheDocument();
  });

  it("shows 'or type any code' help text when status is not connected", () => {
    render(<ResponseBuilderNode {...makeProps()} />);
    expect(screen.getByText("or type any code")).toBeInTheDocument();
  });
});

// ─── 2. Header subtitle / statusLabel ─────────────────────────────────────────

describe("ResponseBuilderNode — status label in header", () => {
  it("shows '200 · OK' subtitle for status 200", () => {
    render(<ResponseBuilderNode {...makeProps({ status: 200 })} />);
    expect(screen.getByText("200 · OK")).toBeInTheDocument();
  });

  it("shows '201 · Created' subtitle for status 201", () => {
    render(<ResponseBuilderNode {...makeProps({ status: 201 })} />);
    expect(screen.getByText("201 · Created")).toBeInTheDocument();
  });

  it("shows '400 · Bad Input' subtitle for status 400", () => {
    render(<ResponseBuilderNode {...makeProps({ status: 400 })} />);
    expect(screen.getByText("400 · Bad Input")).toBeInTheDocument();
  });

  it("shows '401 · Needs Login' subtitle for status 401", () => {
    render(<ResponseBuilderNode {...makeProps({ status: 401 })} />);
    expect(screen.getByText("401 · Needs Login")).toBeInTheDocument();
  });

  it("shows '403 · Forbidden' subtitle for status 403", () => {
    render(<ResponseBuilderNode {...makeProps({ status: 403 })} />);
    expect(screen.getByText("403 · Forbidden")).toBeInTheDocument();
  });

  it("shows '500 · Error' subtitle for status 500", () => {
    render(<ResponseBuilderNode {...makeProps({ status: 500 })} />);
    expect(screen.getByText("500 · Error")).toBeInTheDocument();
  });

  it("shows the raw number '422' when status has no preset", () => {
    render(<ResponseBuilderNode {...makeProps({ status: 422 })} />);
    expect(screen.getByText("422")).toBeInTheDocument();
  });

  it("shows '204' for an unlisted 2xx code", () => {
    render(<ResponseBuilderNode {...makeProps({ status: 204 })} />);
    expect(screen.getByText("204")).toBeInTheDocument();
  });
});

// ─── 3. Handles ───────────────────────────────────────────────────────────────

describe("ResponseBuilderNode — handles", () => {
  it("renders the status handle (target, left)", () => {
    render(<ResponseBuilderNode {...makeProps()} />);
    const h = screen.getByTestId("handle-status");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the body handle (target, left)", () => {
    render(<ResponseBuilderNode {...makeProps()} />);
    const h = screen.getByTestId("handle-body");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the reply handle (source, right)", () => {
    render(<ResponseBuilderNode {...makeProps()} />);
    const h = screen.getByTestId("handle-reply");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has exactly three handles in the DOM", () => {
    render(<ResponseBuilderNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(3);
  });
});

// ─── 4. Status preset buttons onChange ────────────────────────────────────────

describe("ResponseBuilderNode — status preset buttons onChange", () => {
  it("calls onChange({ status: 201 }) when 201 preset is clicked", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("201"));
    expect(onChange).toHaveBeenCalledWith({ status: 201 });
  });

  it("calls onChange({ status: 400 }) when 400 preset is clicked", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("400"));
    expect(onChange).toHaveBeenCalledWith({ status: 400 });
  });

  it("calls onChange({ status: 401 }) when 401 preset is clicked", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("401"));
    expect(onChange).toHaveBeenCalledWith({ status: 401 });
  });

  it("calls onChange({ status: 403 }) when 403 preset is clicked", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("403"));
    expect(onChange).toHaveBeenCalledWith({ status: 403 });
  });

  it("calls onChange({ status: 500 }) when 500 preset is clicked", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("500"));
    expect(onChange).toHaveBeenCalledWith({ status: 500 });
  });

  it("calls onChange exactly once per preset click", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("400"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw when preset clicked without onChange", () => {
    expect(() => {
      render(<ResponseBuilderNode {...makeProps()} />);
      fireEvent.click(screen.getByText("400"));
    }).not.toThrow();
  });
});

// ─── 5. Status number input onChange ─────────────────────────────────────────

describe("ResponseBuilderNode — status number input onChange", () => {
  it("calls onChange({ status: 404 }) when 404 is typed", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "404" } });
    expect(onChange).toHaveBeenCalledWith({ status: 404 });
  });

  it("calls onChange({ status: 500 }) when 500 is typed (different from default 200)", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "500" } });
    expect(onChange).toHaveBeenCalledWith({ status: 500 });
  });

  it("reflects the current status value in the input", () => {
    render(<ResponseBuilderNode {...makeProps({ status: 201 })} />);
    expect(screen.getByRole("spinbutton")).toHaveValue(201);
  });

  it("does not throw when status input changes without onChange", () => {
    expect(() => {
      render(<ResponseBuilderNode {...makeProps()} />);
      fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "404" } });
    }).not.toThrow();
  });
});

// ─── 6. connectedHandles — status disabled ────────────────────────────────────

describe("ResponseBuilderNode — connectedHandles['status']", () => {
  it("status input is enabled when status handle is not connected", () => {
    render(<ResponseBuilderNode {...makeProps({ connectedHandles: [] })} />);
    expect(screen.getByRole("spinbutton")).not.toBeDisabled();
  });

  it("status input is disabled when status handle IS connected", () => {
    render(<ResponseBuilderNode {...makeProps({ connectedHandles: ["status"] })} />);
    expect(screen.getByRole("spinbutton")).toBeDisabled();
  });

  it("all preset buttons are disabled when status handle IS connected", () => {
    render(<ResponseBuilderNode {...makeProps({ connectedHandles: ["status"] })} />);
    // The 6 preset buttons are disabled; the add-header button is not
    const presetButtons = screen.getAllByRole("button").slice(0, 6);
    for (const btn of presetButtons) {
      expect(btn).toBeDisabled();
    }
  });

  it("shows 'using connected value' when status is connected", () => {
    render(<ResponseBuilderNode {...makeProps({ connectedHandles: ["status"] })} />);
    expect(screen.getByText("using connected value")).toBeInTheDocument();
  });

  it("shows 'or type any code' when status is NOT connected", () => {
    render(<ResponseBuilderNode {...makeProps({ connectedHandles: [] })} />);
    expect(screen.getByText("or type any code")).toBeInTheDocument();
  });
});

// ─── 7. connectedHandles — body label ─────────────────────────────────────────

describe("ResponseBuilderNode — connectedHandles['body']", () => {
  it("renders the 'Body' label when body is not connected", () => {
    render(<ResponseBuilderNode {...makeProps({ connectedHandles: [] })} />);
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("renders the 'Body' label when body IS connected", () => {
    render(<ResponseBuilderNode {...makeProps({ connectedHandles: ["body"] })} />);
    expect(screen.getByText("Body")).toBeInTheDocument();
  });
});

// ─── 8. Add header ────────────────────────────────────────────────────────────

describe("ResponseBuilderNode — add header", () => {
  it("calls onChange when 'Add header' is clicked", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ onChange })} />);
    fireEvent.click(getAddHeaderBtn());
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("adds a header with empty key and value", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ onChange })} />);
    fireEvent.click(getAddHeaderBtn());
    const { headers } = onChange.mock.calls[0][0];
    expect(headers).toHaveLength(1);
    expect(headers[0].key).toBe("");
    expect(headers[0].value).toBe("");
  });

  it("new header has a non-empty string id", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ onChange })} />);
    fireEvent.click(getAddHeaderBtn());
    const { headers } = onChange.mock.calls[0][0];
    expect(typeof headers[0].id).toBe("string");
    expect(headers[0].id.length).toBeGreaterThan(0);
  });

  it("preserves existing headers when adding a new one", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ headers: PRE_HEADERS, onChange })} />);
    fireEvent.click(getAddHeaderBtn());
    const { headers } = onChange.mock.calls[0][0];
    expect(headers).toHaveLength(2);
    expect(headers[0]).toEqual(PRE_HEADERS[0]);
  });

  it("does not throw when Add header is clicked without onChange", () => {
    expect(() => {
      render(<ResponseBuilderNode {...makeProps()} />);
      fireEvent.click(getAddHeaderBtn());
    }).not.toThrow();
  });
});

// ─── 9. Header key input onChange ────────────────────────────────────────────

describe("ResponseBuilderNode — header key onChange", () => {
  it("calls onChange with updated headers when key is typed", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ headers: PRE_HEADERS, onChange })} />);
    const keyInput = screen.getByDisplayValue("Content-Type");
    fireEvent.change(keyInput, { target: { value: "X-Custom" } });
    expect(onChange).toHaveBeenCalledWith({
      headers: [{ id: "hdr-1", key: "X-Custom", value: "application/json" }],
    });
  });

  it("calls onChange with updated headers when key is cleared", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ headers: PRE_HEADERS, onChange })} />);
    const keyInput = screen.getByDisplayValue("Content-Type");
    fireEvent.change(keyInput, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({
      headers: [{ id: "hdr-1", key: "", value: "application/json" }],
    });
  });

  it("only updates the targeted header, not others", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ headers: TWO_HEADERS, onChange })} />);
    const keyInput = screen.getByDisplayValue("Content-Type");
    fireEvent.change(keyInput, { target: { value: "Accept" } });
    const { headers } = onChange.mock.calls[0][0];
    expect(headers[0].key).toBe("Accept");
    expect(headers[1].key).toBe("Authorization"); // unchanged
  });
});

// ─── 10. Header value input onChange ─────────────────────────────────────────

describe("ResponseBuilderNode — header value onChange", () => {
  it("calls onChange with updated headers when value is typed", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ headers: PRE_HEADERS, onChange })} />);
    const valueInput = screen.getByDisplayValue("application/json");
    fireEvent.change(valueInput, { target: { value: "text/plain" } });
    expect(onChange).toHaveBeenCalledWith({
      headers: [{ id: "hdr-1", key: "Content-Type", value: "text/plain" }],
    });
  });

  it("calls onChange with empty value when value input is cleared", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ headers: PRE_HEADERS, onChange })} />);
    const valueInput = screen.getByDisplayValue("application/json");
    fireEvent.change(valueInput, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({
      headers: [{ id: "hdr-1", key: "Content-Type", value: "" }],
    });
  });

  it("only updates the targeted header's value, not others", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ headers: TWO_HEADERS, onChange })} />);
    const valueInput = screen.getByDisplayValue("application/json");
    fireEvent.change(valueInput, { target: { value: "text/html" } });
    const { headers } = onChange.mock.calls[0][0];
    expect(headers[0].value).toBe("text/html");
    expect(headers[1].value).toBe("Bearer token"); // unchanged
  });
});

// ─── 11. Remove header ────────────────────────────────────────────────────────

describe("ResponseBuilderNode — remove header", () => {
  it("calls onChange with header removed when X is clicked", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ headers: PRE_HEADERS, onChange })} />);
    fireEvent.click(getRemoveBtn(0));
    expect(onChange).toHaveBeenCalledWith({ headers: [] });
  });

  it("removes only the clicked header when multiple headers exist", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ headers: TWO_HEADERS, onChange })} />);
    fireEvent.click(getRemoveBtn(0)); // removes hdr-1
    const { headers } = onChange.mock.calls[0][0];
    expect(headers).toHaveLength(1);
    expect(headers[0].id).toBe("hdr-2");
  });

  it("removes the second header when its X is clicked", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ headers: TWO_HEADERS, onChange })} />);
    fireEvent.click(getRemoveBtn(1)); // removes hdr-2
    const { headers } = onChange.mock.calls[0][0];
    expect(headers).toHaveLength(1);
    expect(headers[0].id).toBe("hdr-1");
  });

  it("does not throw when remove is clicked without onChange", () => {
    expect(() => {
      render(<ResponseBuilderNode {...makeProps({ headers: PRE_HEADERS })} />);
      fireEvent.click(getRemoveBtn(0));
    }).not.toThrow();
  });
});

// ─── 12. Header row rendering ─────────────────────────────────────────────────

describe("ResponseBuilderNode — header row rendering", () => {
  it("renders no text inputs when headers is empty", () => {
    render(<ResponseBuilderNode {...makeProps({ headers: [] })} />);
    expect(screen.queryByPlaceholderText("Content-Type")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("application/json")).not.toBeInTheDocument();
  });

  it("renders key and value inputs for each header", () => {
    render(<ResponseBuilderNode {...makeProps({ headers: PRE_HEADERS })} />);
    expect(screen.getByPlaceholderText("Content-Type")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("application/json")).toBeInTheDocument();
  });

  it("renders 2 rows of inputs for 2 headers", () => {
    render(<ResponseBuilderNode {...makeProps({ headers: TWO_HEADERS })} />);
    expect(screen.getAllByPlaceholderText("Content-Type")).toHaveLength(2);
    expect(screen.getAllByPlaceholderText("application/json")).toHaveLength(2);
  });
});

// ─── 13. onChange payload shape ───────────────────────────────────────────────

describe("ResponseBuilderNode — onChange payload shape", () => {
  const ALLOWED_KEYS = new Set<string>(["status", "headers", "onChange", "connectedHandles"]);

  it("preset button payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("400"));
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("status input payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "404" } });
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("add header payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ onChange })} />);
    fireEvent.click(getAddHeaderBtn());
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("header key change payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<ResponseBuilderNode {...makeProps({ headers: PRE_HEADERS, onChange })} />);
    fireEvent.change(screen.getByDisplayValue("Content-Type"), { target: { value: "Accept" } });
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });
});

// ─── 14. Fallback defaults ────────────────────────────────────────────────────

describe("ResponseBuilderNode — fallback defaults", () => {
  it("defaults status to 200 when undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).status = undefined;
    render(<ResponseBuilderNode {...props} />);
    expect(screen.getByRole("spinbutton")).toHaveValue(200);
    expect(screen.getByText("200 · OK")).toBeInTheDocument();
  });

  it("defaults headers to [] when undefined — no header rows rendered", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).headers = undefined;
    render(<ResponseBuilderNode {...props} />);
    expect(screen.queryByPlaceholderText("Content-Type")).not.toBeInTheDocument();
  });

  it("defaults connectedHandles to [] when undefined — status input enabled", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).connectedHandles = undefined;
    render(<ResponseBuilderNode {...props} />);
    expect(screen.getByRole("spinbutton")).not.toBeDisabled();
  });
});

// ─── 15. Selected state ───────────────────────────────────────────────────────

describe("ResponseBuilderNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<ResponseBuilderNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Response Builder")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<ResponseBuilderNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Response Builder")).toBeInTheDocument();
  });
});
