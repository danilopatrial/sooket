import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VectorSearchNode } from "@/components/canvas/nodes/VectorSearchNode";
import type { VectorSearchNodeData } from "@/components/canvas/nodes/VectorSearchNode";
import { NODE_REGISTRY } from "@/components/canvas/nodes/registry";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

// ─── Test fixtures ─────────────────────────────────────────────────────────────

const DEFAULT_DATA: VectorSearchNodeData = {
  provider:     "supabase",
  supabaseUrl:  "",
  supabaseKey:  "",
  functionName: "match_documents",
  matchCount:   5,
  pineconeHost: "",
  pineconeKey:  "",
  namespace:    "",
  topK:         5,
};

const PINECONE_DATA: VectorSearchNodeData = {
  ...DEFAULT_DATA,
  provider:     "pinecone",
  pineconeHost: "my-index-abc.svc.pinecone.io",
  pineconeKey:  "pc-key-123",
  namespace:    "prod",
  topK:         10,
};

const SUPABASE_FILLED: VectorSearchNodeData = {
  ...DEFAULT_DATA,
  supabaseUrl:  "https://abc.supabase.co",
  supabaseKey:  "service-key-xyz",
  functionName: "search_docs",
  matchCount:   8,
};

function makeProps(overrides: Partial<VectorSearchNodeData> = {}): NodeProps {
  const data: VectorSearchNodeData = { ...DEFAULT_DATA, ...overrides };
  return {
    id:       "node-vs",
    data:     data as unknown as Record<string, unknown>,
    selected: false,
  } as NodeProps;
}

// ─── 1. Registry ──────────────────────────────────────────────────────────────

describe("VectorSearchNode — registry entry", () => {
  const entry = NODE_REGISTRY.find((n) => n.type === "vector-search");

  it("has a registry entry with type 'vector-search'", () => {
    expect(entry).toBeDefined();
  });

  it("is in the 'external' category", () => {
    expect(entry?.category).toBe("external");
  });

  it("has primaryInput 'embedding'", () => {
    expect(entry?.primaryInput).toBe("embedding");
  });

  it("has primaryOutput 'results'", () => {
    expect(entry?.primaryOutput).toBe("results");
  });

  it("defaultData.provider is 'supabase'", () => {
    expect(entry?.defaultData.provider).toBe("supabase");
  });

  it("defaultData.functionName is 'match_documents'", () => {
    expect(entry?.defaultData.functionName).toBe("match_documents");
  });

  it("defaultData.matchCount is 5", () => {
    expect(entry?.defaultData.matchCount).toBe(5);
  });

  it("defaultData.topK is 5", () => {
    expect(entry?.defaultData.topK).toBe(5);
  });

  it("defaultData.timeout is 15000", () => {
    expect(entry?.defaultData.timeout).toBe(15000);
  });

  it("defaultData contains all required keys", () => {
    const keys = Object.keys(entry?.defaultData ?? {});
    for (const k of [
      "provider", "supabaseUrl", "supabaseKey", "functionName", "matchCount",
      "pineconeHost", "pineconeKey", "namespace", "topK",
    ]) {
      expect(keys).toContain(k);
    }
  });
});

// ─── 2. Rendering — default (supabase) ────────────────────────────────────────

describe("VectorSearchNode — rendering (supabase, default)", () => {
  it("renders without crashing with defaultData", () => {
    render(<VectorSearchNode {...makeProps()} />);
    expect(screen.getByText("Vector Search")).toBeInTheDocument();
  });

  it("shows 'Supabase pgvector' subtitle in header", () => {
    render(<VectorSearchNode {...makeProps()} />);
    // The subtitle appears in the header; getAllByText handles the duplicate in the body section
    expect(screen.getAllByText("Supabase pgvector").length).toBeGreaterThanOrEqual(1);
  });

  it("shows the 'PG' provider tab button", () => {
    render(<VectorSearchNode {...makeProps()} />);
    expect(screen.getByRole("button", { name: "PG" })).toBeInTheDocument();
  });

  it("shows the 'PC' provider tab button", () => {
    render(<VectorSearchNode {...makeProps()} />);
    expect(screen.getByRole("button", { name: "PC" })).toBeInTheDocument();
  });

  it("shows 'Embedding input' label", () => {
    render(<VectorSearchNode {...makeProps()} />);
    expect(screen.getByText("Embedding input")).toBeInTheDocument();
  });

  it("shows 'float[ ]' type hint", () => {
    render(<VectorSearchNode {...makeProps()} />);
    expect(screen.getByText("float[ ]")).toBeInTheDocument();
  });

  it("shows supabaseUrl input with placeholder '$SUPABASE_URL'", () => {
    render(<VectorSearchNode {...makeProps()} />);
    expect(screen.getByPlaceholderText("$SUPABASE_URL")).toBeInTheDocument();
  });

  it("shows supabaseKey input with placeholder '$SUPABASE_SERVICE_KEY'", () => {
    render(<VectorSearchNode {...makeProps()} />);
    expect(screen.getByPlaceholderText("$SUPABASE_SERVICE_KEY")).toBeInTheDocument();
  });

  it("shows functionName input with placeholder 'match_documents'", () => {
    render(<VectorSearchNode {...makeProps()} />);
    expect(screen.getByPlaceholderText("match_documents")).toBeInTheDocument();
  });

  it("shows default functionName value 'match_documents' in its input", () => {
    render(<VectorSearchNode {...makeProps()} />);
    expect(screen.getByPlaceholderText("match_documents")).toHaveValue("match_documents");
  });

  it("shows matchCount number input with default value 5", () => {
    render(<VectorSearchNode {...makeProps()} />);
    expect(screen.getByRole("spinbutton", { name: "Top K results" })).toHaveValue(5);
  });

  it("shows the 'Outputs' section label", () => {
    render(<VectorSearchNode {...makeProps()} />);
    expect(screen.getByText("Outputs")).toBeInTheDocument();
  });

  it("shows 'results' output label", () => {
    render(<VectorSearchNode {...makeProps()} />);
    expect(screen.getByText("results")).toBeInTheDocument();
  });

  it("shows 'count' output label", () => {
    render(<VectorSearchNode {...makeProps()} />);
    expect(screen.getByText("count")).toBeInTheDocument();
  });

  it("does NOT show Pinecone config when provider is supabase", () => {
    render(<VectorSearchNode {...makeProps()} />);
    expect(screen.queryByPlaceholderText("my-index-abc123.svc.pinecone.io")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("$PINECONE_KEY")).not.toBeInTheDocument();
  });

  it("renders prefilled supabaseUrl value", () => {
    render(<VectorSearchNode {...makeProps({ supabaseUrl: "https://abc.supabase.co" })} />);
    expect(screen.getByPlaceholderText("$SUPABASE_URL")).toHaveValue("https://abc.supabase.co");
  });

  it("renders prefilled supabaseKey value", () => {
    render(<VectorSearchNode {...makeProps({ supabaseKey: "sk-xyz" })} />);
    expect(screen.getByPlaceholderText("$SUPABASE_SERVICE_KEY")).toHaveValue("sk-xyz");
  });

  it("renders prefilled functionName value", () => {
    render(<VectorSearchNode {...makeProps({ functionName: "search_docs" })} />);
    expect(screen.getByPlaceholderText("match_documents")).toHaveValue("search_docs");
  });

  it("renders prefilled matchCount value", () => {
    render(<VectorSearchNode {...makeProps({ matchCount: 10 })} />);
    expect(screen.getByRole("spinbutton", { name: "Top K results" })).toHaveValue(10);
  });
});

// ─── 3. Rendering — pinecone provider ─────────────────────────────────────────

describe("VectorSearchNode — rendering (pinecone)", () => {
  it("shows 'Pinecone' subtitle in header when provider is pinecone", () => {
    render(<VectorSearchNode {...makeProps({ provider: "pinecone" })} />);
    expect(screen.getAllByText("Pinecone").length).toBeGreaterThanOrEqual(1);
  });

  it("shows Pinecone index host input", () => {
    render(<VectorSearchNode {...makeProps({ provider: "pinecone" })} />);
    expect(screen.getByPlaceholderText("my-index-abc123.svc.pinecone.io")).toBeInTheDocument();
  });

  it("shows Pinecone API key input", () => {
    render(<VectorSearchNode {...makeProps({ provider: "pinecone" })} />);
    expect(screen.getByPlaceholderText("$PINECONE_KEY")).toBeInTheDocument();
  });

  it("shows Pinecone namespace input with placeholder 'default'", () => {
    render(<VectorSearchNode {...makeProps({ provider: "pinecone" })} />);
    expect(screen.getByPlaceholderText("default")).toBeInTheDocument();
  });

  it("shows topK number input with default value 5 for pinecone", () => {
    render(<VectorSearchNode {...makeProps({ provider: "pinecone" })} />);
    expect(screen.getByRole("spinbutton", { name: "Top K results" })).toHaveValue(5);
  });

  it("renders prefilled pineconeHost value", () => {
    render(<VectorSearchNode {...makeProps({ provider: "pinecone", pineconeHost: "my-index.svc.pinecone.io" })} />);
    expect(screen.getByPlaceholderText("my-index-abc123.svc.pinecone.io")).toHaveValue("my-index.svc.pinecone.io");
  });

  it("renders prefilled pineconeKey value", () => {
    render(<VectorSearchNode {...makeProps({ provider: "pinecone", pineconeKey: "pc-key" })} />);
    expect(screen.getByPlaceholderText("$PINECONE_KEY")).toHaveValue("pc-key");
  });

  it("renders prefilled namespace value", () => {
    render(<VectorSearchNode {...makeProps({ provider: "pinecone", namespace: "prod" })} />);
    expect(screen.getByPlaceholderText("default")).toHaveValue("prod");
  });

  it("renders prefilled topK value", () => {
    render(<VectorSearchNode {...makeProps({ provider: "pinecone", topK: 20 })} />);
    expect(screen.getByRole("spinbutton", { name: "Top K results" })).toHaveValue(20);
  });

  it("does NOT show Supabase config when provider is pinecone", () => {
    render(<VectorSearchNode {...makeProps({ provider: "pinecone" })} />);
    expect(screen.queryByPlaceholderText("$SUPABASE_URL")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("$SUPABASE_SERVICE_KEY")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("match_documents")).not.toBeInTheDocument();
  });

  it("shows 'namespace' label with 'optional' hint", () => {
    render(<VectorSearchNode {...makeProps({ provider: "pinecone" })} />);
    expect(screen.getByText("optional")).toBeInTheDocument();
  });

  it("still shows 'results' and 'count' output labels for pinecone", () => {
    render(<VectorSearchNode {...makeProps({ provider: "pinecone" })} />);
    expect(screen.getByText("results")).toBeInTheDocument();
    expect(screen.getByText("count")).toBeInTheDocument();
  });
});

// ─── 4. Handles ───────────────────────────────────────────────────────────────

describe("VectorSearchNode — handles", () => {
  it("renders the 'embedding' handle (target, left)", () => {
    render(<VectorSearchNode {...makeProps()} />);
    const h = screen.getByTestId("handle-embedding");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the 'results' handle (source, right)", () => {
    render(<VectorSearchNode {...makeProps()} />);
    const h = screen.getByTestId("handle-results");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("renders the 'count' handle (source, right)", () => {
    render(<VectorSearchNode {...makeProps()} />);
    const h = screen.getByTestId("handle-count");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has exactly 3 handles for supabase provider", () => {
    render(<VectorSearchNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(3);
  });

  it("has exactly 3 handles for pinecone provider", () => {
    render(<VectorSearchNode {...makeProps({ provider: "pinecone" })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(3);
  });

  it("handles are present regardless of provider switch", () => {
    render(<VectorSearchNode {...makeProps({ provider: "pinecone" })} />);
    expect(screen.getByTestId("handle-embedding")).toBeInTheDocument();
    expect(screen.getByTestId("handle-results")).toBeInTheDocument();
    expect(screen.getByTestId("handle-count")).toBeInTheDocument();
  });
});

// ─── 5. Provider tab onChange ─────────────────────────────────────────────────

describe("VectorSearchNode — provider tab onChange", () => {
  it("calls onChange({ provider: 'supabase' }) when PG is clicked", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ provider: "pinecone", onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "PG" }));
    expect(onChange).toHaveBeenCalledWith({ provider: "supabase" });
  });

  it("calls onChange({ provider: 'pinecone' }) when PC is clicked", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "PC" }));
    expect(onChange).toHaveBeenCalledWith({ provider: "pinecone" });
  });

  it("calls onChange exactly once when PG is clicked", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ provider: "pinecone", onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "PG" }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("calls onChange exactly once when PC is clicked", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "PC" }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("provider payload is exactly { provider: value } — no extra keys", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "PC" }));
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["provider"]);
  });

  it("does not throw when PG clicked and onChange is not provided", () => {
    expect(() => {
      render(<VectorSearchNode {...makeProps({ provider: "pinecone" })} />);
      fireEvent.click(screen.getByRole("button", { name: "PG" }));
    }).not.toThrow();
  });
});

// ─── 6. Supabase fields onChange ──────────────────────────────────────────────

describe("VectorSearchNode — supabase fields onChange", () => {
  it("calls onChange({ supabaseUrl }) when URL field changes", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("$SUPABASE_URL"), {
      target: { value: "https://abc.supabase.co" },
    });
    expect(onChange).toHaveBeenCalledWith({ supabaseUrl: "https://abc.supabase.co" });
  });

  it("calls onChange({ supabaseUrl: '' }) when URL field is cleared", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ supabaseUrl: "https://abc.supabase.co", onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("$SUPABASE_URL"), {
      target: { value: "" },
    });
    expect(onChange).toHaveBeenCalledWith({ supabaseUrl: "" });
  });

  it("calls onChange({ supabaseKey }) when service key field changes", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("$SUPABASE_SERVICE_KEY"), {
      target: { value: "eyJhbGciOiJIUz..." },
    });
    expect(onChange).toHaveBeenCalledWith({ supabaseKey: "eyJhbGciOiJIUz..." });
  });

  it("calls onChange({ functionName }) when RPC function field changes", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("match_documents"), {
      target: { value: "search_docs" },
    });
    expect(onChange).toHaveBeenCalledWith({ functionName: "search_docs" });
  });

  it("calls onChange({ matchCount: 10 }) when matchCount is changed", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Top K results" }), { target: { value: "10" } });
    expect(onChange).toHaveBeenCalledWith({ matchCount: 10 });
  });

  it("clamps matchCount to 1 when value is 0", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Top K results" }), { target: { value: "0" } });
    expect(onChange).toHaveBeenCalledWith({ matchCount: 1 });
  });

  it("clamps matchCount to 1 when value is negative", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Top K results" }), { target: { value: "-5" } });
    expect(onChange).toHaveBeenCalledWith({ matchCount: 1 });
  });

  it("accepts matchCount boundary value of 1", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Top K results" }), { target: { value: "1" } });
    expect(onChange).toHaveBeenCalledWith({ matchCount: 1 });
  });

  it("accepts matchCount at max boundary 100", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Top K results" }), { target: { value: "100" } });
    expect(onChange).toHaveBeenCalledWith({ matchCount: 100 });
  });

  it("matchCount payload contains a number, not a string", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Top K results" }), { target: { value: "7" } });
    expect(typeof onChange.mock.calls[0][0].matchCount).toBe("number");
  });

  it("supabaseUrl payload is exactly { supabaseUrl: value } — no extra keys", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("$SUPABASE_URL"), {
      target: { value: "https://x.supabase.co" },
    });
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["supabaseUrl"]);
  });

  it("does not throw when supabaseUrl changes and onChange is not provided", () => {
    expect(() => {
      render(<VectorSearchNode {...makeProps()} />);
      fireEvent.change(screen.getByPlaceholderText("$SUPABASE_URL"), {
        target: { value: "https://x.supabase.co" },
      });
    }).not.toThrow();
  });
});

// ─── 7. Pinecone fields onChange ──────────────────────────────────────────────

describe("VectorSearchNode — pinecone fields onChange", () => {
  it("calls onChange({ pineconeHost }) when index host field changes", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ provider: "pinecone", onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("my-index-abc123.svc.pinecone.io"), {
      target: { value: "my-idx.svc.pinecone.io" },
    });
    expect(onChange).toHaveBeenCalledWith({ pineconeHost: "my-idx.svc.pinecone.io" });
  });

  it("calls onChange({ pineconeKey }) when API key field changes", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ provider: "pinecone", onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("$PINECONE_KEY"), {
      target: { value: "pc-abc123" },
    });
    expect(onChange).toHaveBeenCalledWith({ pineconeKey: "pc-abc123" });
  });

  it("calls onChange({ namespace }) when namespace field changes", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ provider: "pinecone", onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("default"), {
      target: { value: "staging" },
    });
    expect(onChange).toHaveBeenCalledWith({ namespace: "staging" });
  });

  it("calls onChange({ namespace: '' }) when namespace is cleared", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ provider: "pinecone", namespace: "prod", onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("default"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ namespace: "" });
  });

  it("calls onChange({ topK: 20 }) when topK is changed", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ provider: "pinecone", onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Top K results" }), { target: { value: "20" } });
    expect(onChange).toHaveBeenCalledWith({ topK: 20 });
  });

  it("clamps topK to 1 when value is 0", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ provider: "pinecone", onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Top K results" }), { target: { value: "0" } });
    expect(onChange).toHaveBeenCalledWith({ topK: 1 });
  });

  it("clamps topK to 1 when value is negative", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ provider: "pinecone", onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Top K results" }), { target: { value: "-3" } });
    expect(onChange).toHaveBeenCalledWith({ topK: 1 });
  });

  it("accepts topK boundary value of 1", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ provider: "pinecone", onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Top K results" }), { target: { value: "1" } });
    expect(onChange).toHaveBeenCalledWith({ topK: 1 });
  });

  it("accepts topK at max boundary 10000", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ provider: "pinecone", onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Top K results" }), { target: { value: "10000" } });
    expect(onChange).toHaveBeenCalledWith({ topK: 10000 });
  });

  it("topK payload contains a number, not a string", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ provider: "pinecone", onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Top K results" }), { target: { value: "15" } });
    expect(typeof onChange.mock.calls[0][0].topK).toBe("number");
  });

  it("pineconeHost payload is exactly { pineconeHost: value } — no extra keys", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ provider: "pinecone", onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("my-index-abc123.svc.pinecone.io"), {
      target: { value: "x.svc.pinecone.io" },
    });
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["pineconeHost"]);
  });

  it("does not throw when pineconeKey changes and onChange is not provided", () => {
    expect(() => {
      render(<VectorSearchNode {...makeProps({ provider: "pinecone" })} />);
      fireEvent.change(screen.getByPlaceholderText("$PINECONE_KEY"), {
        target: { value: "key" },
      });
    }).not.toThrow();
  });
});

// ─── 8. Fallback defaults ─────────────────────────────────────────────────────

describe("VectorSearchNode — fallback defaults", () => {
  it("defaults provider to 'supabase' when undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).provider = undefined;
    render(<VectorSearchNode {...props} />);
    // Supabase config should be visible
    expect(screen.getByPlaceholderText("$SUPABASE_URL")).toBeInTheDocument();
  });

  it("defaults functionName to 'match_documents' when undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).functionName = undefined;
    render(<VectorSearchNode {...props} />);
    expect(screen.getByPlaceholderText("match_documents")).toHaveValue("match_documents");
  });

  it("defaults matchCount to 5 when undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).matchCount = undefined;
    render(<VectorSearchNode {...props} />);
    expect(screen.getByRole("spinbutton", { name: "Top K results" })).toHaveValue(5);
  });

  it("defaults topK to 5 when undefined (pinecone)", () => {
    const props = makeProps({ provider: "pinecone" });
    (props.data as Record<string, unknown>).topK = undefined;
    render(<VectorSearchNode {...props} />);
    expect(screen.getByRole("spinbutton", { name: "Top K results" })).toHaveValue(5);
  });

  it("defaults supabaseUrl to empty string when undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).supabaseUrl = undefined;
    render(<VectorSearchNode {...props} />);
    expect(screen.getByPlaceholderText("$SUPABASE_URL")).toHaveValue("");
  });

  it("defaults supabaseKey to empty string when undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).supabaseKey = undefined;
    render(<VectorSearchNode {...props} />);
    expect(screen.getByPlaceholderText("$SUPABASE_SERVICE_KEY")).toHaveValue("");
  });

  it("defaults pineconeHost to empty string when undefined", () => {
    const props = makeProps({ provider: "pinecone" });
    (props.data as Record<string, unknown>).pineconeHost = undefined;
    render(<VectorSearchNode {...props} />);
    expect(screen.getByPlaceholderText("my-index-abc123.svc.pinecone.io")).toHaveValue("");
  });

  it("defaults namespace to empty string when undefined", () => {
    const props = makeProps({ provider: "pinecone" });
    (props.data as Record<string, unknown>).namespace = undefined;
    render(<VectorSearchNode {...props} />);
    expect(screen.getByPlaceholderText("default")).toHaveValue("");
  });

  it("does not crash when data is completely empty", () => {
    const props = { id: "node-vs", data: {} as unknown as Record<string, unknown>, selected: false } as NodeProps;
    expect(() => render(<VectorSearchNode {...props} />)).not.toThrow();
  });

  it("does not crash when connectedHandles is undefined", () => {
    expect(() =>
      render(<VectorSearchNode {...makeProps({ connectedHandles: undefined })} />)
    ).not.toThrow();
  });

  it("does not crash with completely filled supabase data", () => {
    expect(() =>
      render(<VectorSearchNode {...{ id: "n", data: SUPABASE_FILLED as unknown as Record<string, unknown>, selected: false } as NodeProps} />)
    ).not.toThrow();
  });

  it("does not crash with completely filled pinecone data", () => {
    expect(() =>
      render(<VectorSearchNode {...{ id: "n", data: PINECONE_DATA as unknown as Record<string, unknown>, selected: false } as NodeProps} />)
    ).not.toThrow();
  });
});

// ─── 9. Payload shape / no rogue keys ────────────────────────────────────────

describe("VectorSearchNode — onChange payload shape", () => {
  const ALLOWED_KEYS = new Set<string>([
    "provider", "supabaseUrl", "supabaseKey", "functionName", "matchCount",
    "pineconeHost", "pineconeKey", "namespace", "topK", "timeout",
    "onChange", "connectedHandles",
  ]);

  it("provider payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "PC" }));
    for (const k of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(k)).toBe(true);
    }
  });

  it("supabaseUrl payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("$SUPABASE_URL"), {
      target: { value: "https://x.supabase.co" },
    });
    for (const k of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(k)).toBe(true);
    }
  });

  it("matchCount payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Top K results" }), { target: { value: "3" } });
    for (const k of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(k)).toBe(true);
    }
  });

  it("topK payload contains only allowed keys (pinecone)", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ provider: "pinecone", onChange })} />);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Top K results" }), { target: { value: "3" } });
    for (const k of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(k)).toBe(true);
    }
  });

  it("namespace payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ provider: "pinecone", onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("default"), { target: { value: "ns" } });
    for (const k of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(k)).toBe(true);
    }
  });

  it("no onChange payload value is undefined", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "PC" }));
    for (const val of Object.values(onChange.mock.calls[0][0])) {
      expect(val).not.toBeUndefined();
    }
  });
});

// ─── 9b. Timeout field ────────────────────────────────────────────────────────

describe("VectorSearchNode — timeout field", () => {
  const timeoutInput = () => screen.getByRole("spinbutton", { name: "Request timeout (seconds)" });

  it("renders the timeout input in seconds (default 15)", () => {
    render(<VectorSearchNode {...makeProps()} />);
    expect(timeoutInput()).toHaveValue(15);
  });

  it("defaults to 15 s when timeout is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).timeout = undefined;
    render(<VectorSearchNode {...props} />);
    expect(timeoutInput()).toHaveValue(15);
  });

  it("reflects a custom timeout value in seconds", () => {
    render(<VectorSearchNode {...makeProps({ timeout: 30000 })} />);
    expect(timeoutInput()).toHaveValue(30);
  });

  it("stores the timeout in milliseconds on change", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ onChange })} />);
    fireEvent.change(timeoutInput(), { target: { value: "45" } });
    expect(onChange).toHaveBeenCalledWith({ timeout: 45000 });
  });

  it("clamps a zero or negative timeout to the 1 s minimum", () => {
    const onChange = vi.fn();
    render(<VectorSearchNode {...makeProps({ onChange })} />);
    fireEvent.change(timeoutInput(), { target: { value: "0" } });
    expect(onChange).toHaveBeenCalledWith({ timeout: 1000 });
    fireEvent.change(timeoutInput(), { target: { value: "-5" } });
    expect(onChange).toHaveBeenCalledWith({ timeout: 1000 });
  });

  it("is available in both supabase and pinecone providers", () => {
    const { rerender } = render(<VectorSearchNode {...makeProps({ provider: "supabase" })} />);
    expect(timeoutInput()).toBeInTheDocument();
    rerender(<VectorSearchNode {...makeProps({ provider: "pinecone" })} />);
    expect(timeoutInput()).toBeInTheDocument();
  });
});

// ─── 10. Selected state ───────────────────────────────────────────────────────

describe("VectorSearchNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<VectorSearchNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Vector Search")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<VectorSearchNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Vector Search")).toBeInTheDocument();
  });
});
