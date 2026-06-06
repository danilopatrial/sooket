import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HttpRequestNode } from "@/components/canvas/nodes/HttpRequestNode";
import type { HttpRequestNodeData, HttpHeader } from "@/components/canvas/nodes/HttpRequestNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

const DEFAULT_DATA: HttpRequestNodeData = {
  method: "GET",
  url: "",
  headers: [],
  timeout: 10000,
};

const PRE_HEADERS: HttpHeader[] = [
  { id: "hdr-1", key: "Content-Type", value: "application/json" },
];

const TWO_HEADERS: HttpHeader[] = [
  { id: "hdr-1", key: "Content-Type", value: "application/json" },
  { id: "hdr-2", key: "Authorization", value: "Bearer token" },
];

function makeProps(overrides: Partial<HttpRequestNodeData> = {}): NodeProps {
  const data: HttpRequestNodeData = { ...DEFAULT_DATA, ...overrides };
  return {
    id: "node-1",
    data: data as unknown as Record<string, unknown>,
    selected: false,
  } as NodeProps;
}

const getAddHeaderBtn = () => screen.getByRole("button", { name: /add header/i });
// Method buttons occupy indices 0-4; remove buttons follow, one per header
const getRemoveBtn = (idx = 0) => screen.getAllByRole("button")[5 + idx];

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("HttpRequestNode — rendering", () => {
  it("renders without crashing with defaultData", () => {
    render(<HttpRequestNode {...makeProps()} />);
    expect(screen.getByText("HTTP Request")).toBeInTheDocument();
  });

  it("shows the subtitle 'call any external API or URL'", () => {
    render(<HttpRequestNode {...makeProps()} />);
    expect(screen.getByText("call any external API or URL")).toBeInTheDocument();
  });

  it("shows the 'Method' section label", () => {
    render(<HttpRequestNode {...makeProps()} />);
    expect(screen.getByText("Method")).toBeInTheDocument();
  });

  it("renders all five method buttons", () => {
    render(<HttpRequestNode {...makeProps()} />);
    for (const m of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
      expect(screen.getAllByText(m).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("shows the method hint 'read data' for GET", () => {
    render(<HttpRequestNode {...makeProps({ method: "GET" })} />);
    expect(screen.getByText("read data")).toBeInTheDocument();
  });

  it("shows the method hint 'create / send' for POST", () => {
    render(<HttpRequestNode {...makeProps({ method: "POST" })} />);
    expect(screen.getByText("create / send")).toBeInTheDocument();
  });

  it("shows the method hint 'replace' for PUT", () => {
    render(<HttpRequestNode {...makeProps({ method: "PUT" })} />);
    expect(screen.getByText("replace")).toBeInTheDocument();
  });

  it("shows the method hint 'update part' for PATCH", () => {
    render(<HttpRequestNode {...makeProps({ method: "PATCH" })} />);
    expect(screen.getByText("update part")).toBeInTheDocument();
  });

  it("shows the method hint 'remove' for DELETE", () => {
    render(<HttpRequestNode {...makeProps({ method: "DELETE" })} />);
    expect(screen.getByText("remove")).toBeInTheDocument();
  });

  it("shows the URL input with correct placeholder", () => {
    render(<HttpRequestNode {...makeProps()} />);
    expect(screen.getByPlaceholderText("https://api.example.com/endpoint")).toBeInTheDocument();
  });

  it("shows the current url value in the input", () => {
    render(<HttpRequestNode {...makeProps({ url: "https://api.test.com" })} />);
    expect(screen.getByPlaceholderText("https://api.example.com/endpoint")).toHaveValue("https://api.test.com");
  });

  it("shows the 'Headers' section label", () => {
    render(<HttpRequestNode {...makeProps()} />);
    expect(screen.getByText("Headers")).toBeInTheDocument();
  });

  it("renders the 'Add header' button", () => {
    render(<HttpRequestNode {...makeProps()} />);
    expect(getAddHeaderBtn()).toBeInTheDocument();
  });

  it("shows the 'Response' section label", () => {
    render(<HttpRequestNode {...makeProps()} />);
    expect(screen.getByText("Response")).toBeInTheDocument();
  });

  it("shows output row labels: body, status, ok", () => {
    render(<HttpRequestNode {...makeProps()} />);
    expect(screen.getByText("body")).toBeInTheDocument();
    expect(screen.getByText("status")).toBeInTheDocument();
    expect(screen.getByText("ok")).toBeInTheDocument();
  });

  it("shows the 'Timeout' label", () => {
    render(<HttpRequestNode {...makeProps()} />);
    expect(screen.getByText("Timeout")).toBeInTheDocument();
  });

  it("shows the 'ms' unit label", () => {
    render(<HttpRequestNode {...makeProps()} />);
    expect(screen.getByText("ms")).toBeInTheDocument();
  });

  it("shows the default timeout value 10000 in the input", () => {
    render(<HttpRequestNode {...makeProps()} />);
    expect(screen.getByRole("spinbutton")).toHaveValue(10000);
  });

  it("shows the active method in the header badge (GET by default)", () => {
    render(<HttpRequestNode {...makeProps()} />);
    // badge in the header and the method button both render GET text
    expect(screen.getAllByText("GET").length).toBeGreaterThanOrEqual(2);
  });
});

// ─── 2. Handles — GET / DELETE (no body) ──────────────────────────────────────

describe("HttpRequestNode — handles (GET, no body)", () => {
  it("renders the 'url' handle (target, left)", () => {
    render(<HttpRequestNode {...makeProps({ method: "GET" })} />);
    const h = screen.getByTestId("handle-url");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the 'res-body' handle (source, right)", () => {
    render(<HttpRequestNode {...makeProps({ method: "GET" })} />);
    const h = screen.getByTestId("handle-res-body");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("renders the 'status' handle (source, right)", () => {
    render(<HttpRequestNode {...makeProps({ method: "GET" })} />);
    const h = screen.getByTestId("handle-status");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("renders the 'ok' handle (source, right)", () => {
    render(<HttpRequestNode {...makeProps({ method: "GET" })} />);
    const h = screen.getByTestId("handle-ok");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("does NOT render the 'body' handle for GET", () => {
    render(<HttpRequestNode {...makeProps({ method: "GET" })} />);
    expect(screen.queryByTestId("handle-body")).not.toBeInTheDocument();
  });

  it("has exactly 4 handles for GET", () => {
    render(<HttpRequestNode {...makeProps({ method: "GET" })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(4);
  });

  it("does NOT render the 'body' handle for DELETE", () => {
    render(<HttpRequestNode {...makeProps({ method: "DELETE" })} />);
    expect(screen.queryByTestId("handle-body")).not.toBeInTheDocument();
  });

  it("has exactly 4 handles for DELETE", () => {
    render(<HttpRequestNode {...makeProps({ method: "DELETE" })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(4);
  });
});

// ─── 3. Handles — POST / PUT / PATCH (has body) ───────────────────────────────

describe("HttpRequestNode — handles (POST/PUT/PATCH, has body)", () => {
  it("renders the 'body' handle (target, left) for POST", () => {
    render(<HttpRequestNode {...makeProps({ method: "POST" })} />);
    const h = screen.getByTestId("handle-body");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("has exactly 5 handles for POST", () => {
    render(<HttpRequestNode {...makeProps({ method: "POST" })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(5);
  });

  it("renders the 'body' handle for PUT", () => {
    render(<HttpRequestNode {...makeProps({ method: "PUT" })} />);
    expect(screen.getByTestId("handle-body")).toBeInTheDocument();
  });

  it("has exactly 5 handles for PUT", () => {
    render(<HttpRequestNode {...makeProps({ method: "PUT" })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(5);
  });

  it("renders the 'body' handle for PATCH", () => {
    render(<HttpRequestNode {...makeProps({ method: "PATCH" })} />);
    expect(screen.getByTestId("handle-body")).toBeInTheDocument();
  });

  it("has exactly 5 handles for PATCH", () => {
    render(<HttpRequestNode {...makeProps({ method: "PATCH" })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(5);
  });

  it("all three output handles are always present for POST", () => {
    render(<HttpRequestNode {...makeProps({ method: "POST" })} />);
    expect(screen.getByTestId("handle-res-body")).toBeInTheDocument();
    expect(screen.getByTestId("handle-status")).toBeInTheDocument();
    expect(screen.getByTestId("handle-ok")).toBeInTheDocument();
  });
});

// ─── 4. Body section visibility ───────────────────────────────────────────────

describe("HttpRequestNode — Body section visibility", () => {
  it("does not show 'Body' label for GET", () => {
    render(<HttpRequestNode {...makeProps({ method: "GET" })} />);
    expect(screen.queryByText("Body")).not.toBeInTheDocument();
  });

  it("does not show 'Body' label for DELETE", () => {
    render(<HttpRequestNode {...makeProps({ method: "DELETE" })} />);
    expect(screen.queryByText("Body")).not.toBeInTheDocument();
  });

  it("shows 'Body' label for POST", () => {
    render(<HttpRequestNode {...makeProps({ method: "POST" })} />);
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("shows 'Body' label for PUT", () => {
    render(<HttpRequestNode {...makeProps({ method: "PUT" })} />);
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("shows 'Body' label for PATCH", () => {
    render(<HttpRequestNode {...makeProps({ method: "PATCH" })} />);
    expect(screen.getByText("Body")).toBeInTheDocument();
  });
});

// ─── 5. Method buttons onChange ───────────────────────────────────────────────

describe("HttpRequestNode — method buttons onChange", () => {
  it("calls onChange({ method: 'GET' }) when GET button is clicked", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ method: "POST", onChange })} />);
    fireEvent.click(screen.getAllByRole("button")[0]); // GET is first
    expect(onChange).toHaveBeenCalledWith({ method: "GET" });
  });

  it("calls onChange({ method: 'POST' }) when POST button is clicked", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getAllByRole("button")[1]); // POST is second
    expect(onChange).toHaveBeenCalledWith({ method: "POST" });
  });

  it("calls onChange({ method: 'PUT' }) when PUT button is clicked", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getAllByRole("button")[2]);
    expect(onChange).toHaveBeenCalledWith({ method: "PUT" });
  });

  it("calls onChange({ method: 'PATCH' }) when PATCH button is clicked", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getAllByRole("button")[3]);
    expect(onChange).toHaveBeenCalledWith({ method: "PATCH" });
  });

  it("calls onChange({ method: 'DELETE' }) when DELETE button is clicked", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getAllByRole("button")[4]);
    expect(onChange).toHaveBeenCalledWith({ method: "DELETE" });
  });

  it("calls onChange exactly once per method click", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getAllByRole("button")[1]);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw when method button clicked and onChange is not provided", () => {
    expect(() => {
      render(<HttpRequestNode {...makeProps()} />);
      fireEvent.click(screen.getAllByRole("button")[1]);
    }).not.toThrow();
  });
});

// ─── 6. URL input onChange ────────────────────────────────────────────────────

describe("HttpRequestNode — URL input onChange", () => {
  it("calls onChange({ url: 'https://api.test.com' }) when URL is typed", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("https://api.example.com/endpoint"), {
      target: { value: "https://api.test.com" },
    });
    expect(onChange).toHaveBeenCalledWith({ url: "https://api.test.com" });
  });

  it("calls onChange({ url: '' }) when URL is cleared", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ url: "https://api.test.com", onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("https://api.example.com/endpoint"), {
      target: { value: "" },
    });
    expect(onChange).toHaveBeenCalledWith({ url: "" });
  });

  it("calls onChange exactly once per URL change", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("https://api.example.com/endpoint"), {
      target: { value: "https://example.com" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw when URL changes and onChange is not provided", () => {
    expect(() => {
      render(<HttpRequestNode {...makeProps()} />);
      fireEvent.change(screen.getByPlaceholderText("https://api.example.com/endpoint"), {
        target: { value: "https://test.com" },
      });
    }).not.toThrow();
  });
});

// ─── 7. Timeout input onChange ────────────────────────────────────────────────

describe("HttpRequestNode — timeout input onChange", () => {
  it("calls onChange({ timeout: 5000 }) when timeout is changed", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "5000" } });
    expect(onChange).toHaveBeenCalledWith({ timeout: 5000 });
  });

  it("calls onChange({ timeout: 500 }) at minimum boundary", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "500" } });
    expect(onChange).toHaveBeenCalledWith({ timeout: 500 });
  });

  it("calls onChange({ timeout: 30000 }) at maximum boundary", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "30000" } });
    expect(onChange).toHaveBeenCalledWith({ timeout: 30000 });
  });

  it("passes a number (not a string) in the timeout payload", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "5000" } });
    expect(typeof onChange.mock.calls[0][0].timeout).toBe("number");
  });

  it("calls onChange exactly once per timeout change", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "5000" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw when timeout changes and onChange is not provided", () => {
    expect(() => {
      render(<HttpRequestNode {...makeProps()} />);
      fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "5000" } });
    }).not.toThrow();
  });
});

// ─── 8. Headers — rendering ───────────────────────────────────────────────────

describe("HttpRequestNode — headers rendering", () => {
  it("renders no header rows when headers is empty", () => {
    render(<HttpRequestNode {...makeProps({ headers: [] })} />);
    expect(screen.queryByPlaceholderText("Content-Type")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("application/json")).not.toBeInTheDocument();
  });

  it("renders key and value inputs for each header", () => {
    render(<HttpRequestNode {...makeProps({ headers: PRE_HEADERS })} />);
    expect(screen.getByPlaceholderText("Content-Type")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("application/json")).toBeInTheDocument();
  });

  it("renders the header key value in its input", () => {
    render(<HttpRequestNode {...makeProps({ headers: PRE_HEADERS })} />);
    expect(screen.getByPlaceholderText("Content-Type")).toHaveValue("Content-Type");
  });

  it("renders the header value value in its input", () => {
    render(<HttpRequestNode {...makeProps({ headers: PRE_HEADERS })} />);
    expect(screen.getByPlaceholderText("application/json")).toHaveValue("application/json");
  });

  it("renders a remove button for each header", () => {
    render(<HttpRequestNode {...makeProps({ headers: TWO_HEADERS })} />);
    // 5 method buttons + 2 remove buttons + 1 add header = 8 total
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(8);
  });

  it("renders both header rows for TWO_HEADERS", () => {
    render(<HttpRequestNode {...makeProps({ headers: TWO_HEADERS })} />);
    const keyInputs = screen.getAllByPlaceholderText("Content-Type");
    const valInputs = screen.getAllByPlaceholderText("application/json");
    expect(keyInputs).toHaveLength(2);
    expect(valInputs).toHaveLength(2);
  });
});

// ─── 9. Headers — Add header ──────────────────────────────────────────────────

describe("HttpRequestNode — add header", () => {
  it("calls onChange with one extra header when 'Add header' is clicked", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ headers: [], onChange })} />);
    fireEvent.click(getAddHeaderBtn());
    expect(onChange).toHaveBeenCalledTimes(1);
    const payload = onChange.mock.calls[0][0] as { headers: HttpHeader[] };
    expect(payload.headers).toHaveLength(1);
  });

  it("new header has empty key and value", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ headers: [], onChange })} />);
    fireEvent.click(getAddHeaderBtn());
    const { headers } = onChange.mock.calls[0][0] as { headers: HttpHeader[] };
    expect(headers[0].key).toBe("");
    expect(headers[0].value).toBe("");
  });

  it("new header has a non-empty id", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ headers: [], onChange })} />);
    fireEvent.click(getAddHeaderBtn());
    const { headers } = onChange.mock.calls[0][0] as { headers: HttpHeader[] };
    expect(headers[0].id).toBeTruthy();
  });

  it("preserves existing headers when adding a new one", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ headers: PRE_HEADERS, onChange })} />);
    fireEvent.click(getAddHeaderBtn());
    const { headers } = onChange.mock.calls[0][0] as { headers: HttpHeader[] };
    expect(headers).toHaveLength(2);
    expect(headers[0].id).toBe("hdr-1");
  });

  it("does not throw when 'Add header' is clicked and onChange is not provided", () => {
    expect(() => {
      render(<HttpRequestNode {...makeProps({ headers: [] })} />);
      fireEvent.click(getAddHeaderBtn());
    }).not.toThrow();
  });
});

// ─── 10. Headers — Remove header ──────────────────────────────────────────────

describe("HttpRequestNode — remove header", () => {
  it("calls onChange with header removed when X is clicked", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ headers: PRE_HEADERS, onChange })} />);
    fireEvent.click(getRemoveBtn(0));
    expect(onChange).toHaveBeenCalledWith({ headers: [] });
  });

  it("removes only the targeted header when two headers exist", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ headers: TWO_HEADERS, onChange })} />);
    fireEvent.click(getRemoveBtn(0)); // remove first
    const { headers } = onChange.mock.calls[0][0] as { headers: HttpHeader[] };
    expect(headers).toHaveLength(1);
    expect(headers[0].id).toBe("hdr-2");
  });

  it("removes second header when second X is clicked", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ headers: TWO_HEADERS, onChange })} />);
    fireEvent.click(getRemoveBtn(1)); // remove second
    const { headers } = onChange.mock.calls[0][0] as { headers: HttpHeader[] };
    expect(headers).toHaveLength(1);
    expect(headers[0].id).toBe("hdr-1");
  });

  it("calls onChange exactly once per remove click", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ headers: PRE_HEADERS, onChange })} />);
    fireEvent.click(getRemoveBtn(0));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

// ─── 11. Headers — Update header key ─────────────────────────────────────────

describe("HttpRequestNode — update header key", () => {
  it("calls onChange with updated key when header key input changes", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ headers: PRE_HEADERS, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("Content-Type"), {
      target: { value: "Accept" },
    });
    const { headers } = onChange.mock.calls[0][0] as { headers: HttpHeader[] };
    expect(headers[0].key).toBe("Accept");
    expect(headers[0].value).toBe("application/json");
    expect(headers[0].id).toBe("hdr-1");
  });

  it("calls onChange with updated value when header value input changes", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ headers: PRE_HEADERS, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("application/json"), {
      target: { value: "text/plain" },
    });
    const { headers } = onChange.mock.calls[0][0] as { headers: HttpHeader[] };
    expect(headers[0].key).toBe("Content-Type");
    expect(headers[0].value).toBe("text/plain");
    expect(headers[0].id).toBe("hdr-1");
  });

  it("preserves all other headers when updating one key", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ headers: TWO_HEADERS, onChange })} />);
    fireEvent.change(screen.getAllByPlaceholderText("Content-Type")[0], {
      target: { value: "X-Custom" },
    });
    const { headers } = onChange.mock.calls[0][0] as { headers: HttpHeader[] };
    expect(headers).toHaveLength(2);
    expect(headers[1].id).toBe("hdr-2");
  });

  it("calls onChange exactly once per header key change", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ headers: PRE_HEADERS, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("Content-Type"), {
      target: { value: "Accept" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

// ─── 12. Fallback defaults ────────────────────────────────────────────────────

describe("HttpRequestNode — fallback defaults", () => {
  it("defaults method to 'GET' when undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).method = undefined;
    render(<HttpRequestNode {...props} />);
    // GET is selected by default — body handle absent
    expect(screen.queryByTestId("handle-body")).not.toBeInTheDocument();
  });

  it("defaults url to '' when undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).url = undefined;
    render(<HttpRequestNode {...props} />);
    expect(screen.getByPlaceholderText("https://api.example.com/endpoint")).toHaveValue("");
  });

  it("defaults headers to [] when undefined — no header rows rendered", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).headers = undefined;
    render(<HttpRequestNode {...props} />);
    expect(screen.queryByPlaceholderText("Content-Type")).not.toBeInTheDocument();
  });

  it("defaults timeout to 10000 when undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).timeout = undefined;
    render(<HttpRequestNode {...props} />);
    expect(screen.getByRole("spinbutton")).toHaveValue(10000);
  });

  it("does not crash when connectedHandles is undefined", () => {
    expect(() =>
      render(<HttpRequestNode {...makeProps({ connectedHandles: undefined })} />)
    ).not.toThrow();
  });

  it("renders all content correctly when data is completely empty", () => {
    const props = {
      id: "node-1",
      data: {} as unknown as Record<string, unknown>,
      selected: false,
    } as NodeProps;
    render(<HttpRequestNode {...props} />);
    expect(screen.getByText("HTTP Request")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toHaveValue(10000);
  });
});

// ─── 13. Payload shape ────────────────────────────────────────────────────────

describe("HttpRequestNode — onChange payload shape", () => {
  const ALLOWED_KEYS = new Set<string>(["method", "url", "headers", "timeout", "onChange", "connectedHandles"]);

  it("method payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ method: "GET", onChange })} />);
    fireEvent.click(screen.getAllByRole("button")[1]); // POST
    for (const k of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(k)).toBe(true);
    }
  });

  it("method payload is exactly { method: value } — no extra keys", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ method: "GET", onChange })} />);
    fireEvent.click(screen.getAllByRole("button")[1]);
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["method"]);
  });

  it("url payload is exactly { url: value } — no extra keys", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("https://api.example.com/endpoint"), {
      target: { value: "https://api.test.com" },
    });
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["url"]);
  });

  it("timeout payload is exactly { timeout: number } — no extra keys", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "5000" } });
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["timeout"]);
  });

  it("add-header payload is exactly { headers: array } — no extra keys", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ headers: [], onChange })} />);
    fireEvent.click(getAddHeaderBtn());
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["headers"]);
  });

  it("remove-header payload is exactly { headers: array } — no extra keys", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ headers: PRE_HEADERS, onChange })} />);
    fireEvent.click(getRemoveBtn(0));
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["headers"]);
  });

  it("update-header payload is exactly { headers: array } — no extra keys", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ headers: PRE_HEADERS, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("Content-Type"), {
      target: { value: "Accept" },
    });
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["headers"]);
  });

  it("payload values are never undefined", () => {
    const onChange = vi.fn();
    render(<HttpRequestNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getAllByRole("button")[1]);
    for (const val of Object.values(onChange.mock.calls[0][0])) {
      expect(val).not.toBeUndefined();
    }
  });
});

// ─── 14. Selected state ───────────────────────────────────────────────────────

describe("HttpRequestNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<HttpRequestNode {...makeProps()} selected={true} />);
    expect(screen.getByText("HTTP Request")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<HttpRequestNode {...makeProps()} selected={false} />);
    expect(screen.getByText("HTTP Request")).toBeInTheDocument();
  });
});
