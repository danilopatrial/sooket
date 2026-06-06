import { describe, it, expect } from "vitest";
import { xmlToJson, jsonToXml } from "@/lib/xml-json";

// ─── xmlToJson ────────────────────────────────────────────────────────────────

describe("xmlToJson", () => {
  // Happy path
  it("converts a simple XML element to a JSON string", () => {
    const result = xmlToJson("<root><name>Alice</name></root>");
    const parsed = JSON.parse(result);
    expect(parsed).toMatchObject({ root: { name: "Alice" } });
  });

  it("converts nested XML to nested JSON", () => {
    const xml = "<order><id>42</id><item><sku>ABC</sku><qty>3</qty></item></order>";
    const parsed = JSON.parse(xmlToJson(xml));
    expect(parsed.order.id).toBe(42);
    expect(parsed.order.item.sku).toBe("ABC");
    expect(parsed.order.item.qty).toBe(3);
  });

  it("preserves XML attributes with @_ prefix", () => {
    const xml = `<user id="7"><name>Bob</name></user>`;
    const parsed = JSON.parse(xmlToJson(xml));
    // fast-xml-parser returns attribute values as strings
    expect(String(parsed.user["@_id"])).toBe("7");
    expect(parsed.user.name).toBe("Bob");
  });

  it("returns compact JSON when prettyPrint=false (default)", () => {
    const result = xmlToJson("<a>1</a>");
    expect(result).not.toContain("\n");
  });

  it("returns indented JSON when prettyPrint=true", () => {
    const result = xmlToJson("<a>1</a>", true);
    expect(result).toContain("\n");
    expect(result).toContain("  ");
  });

  it("round-trips through jsonToXml → xmlToJson", () => {
    const original = { name: "test", value: 99 };
    const xml = jsonToXml(original, "root");
    const parsed = JSON.parse(xmlToJson(xml));
    expect(parsed.root.name).toBe("test");
    expect(parsed.root.value).toBe(99);
  });

  // Edge cases
  it("throws when input is an empty string", () => {
    expect(() => xmlToJson("")).toThrow("input is empty");
  });

  it("throws when input is whitespace only", () => {
    expect(() => xmlToJson("   \n  \t  ")).toThrow("input is empty");
  });

  it("does not throw on unclosed tags (fast-xml-parser is lenient), but returns a JSON string", () => {
    // fast-xml-parser recovers from unclosed tags rather than throwing
    expect(() => {
      const result = xmlToJson("<root><unclosed>");
      JSON.parse(result); // must be valid JSON
    }).not.toThrow();
  });

  it("converts CDATA section content", () => {
    const xml = `<root><data><![CDATA[hello & world]]></data></root>`;
    const parsed = JSON.parse(xmlToJson(xml));
    expect(typeof parsed.root.data).not.toBe("undefined");
  });

  it("handles a single self-closing element", () => {
    const parsed = JSON.parse(xmlToJson("<br/>"));
    expect(parsed).toBeDefined();
  });

  it("handles XML with a declaration header", () => {
    const xml = `<?xml version="1.0"?><root><val>5</val></root>`;
    const parsed = JSON.parse(xmlToJson(xml));
    expect(parsed.root.val).toBe(5);
  });

  it("handles deeply nested XML without crashing", () => {
    const xml = "<a><b><c><d><e>deep</e></d></c></b></a>";
    const parsed = JSON.parse(xmlToJson(xml));
    expect(parsed.a.b.c.d.e).toBe("deep");
  });
});

// ─── jsonToXml ────────────────────────────────────────────────────────────────

describe("jsonToXml", () => {
  // Happy path
  it("converts a plain object to XML with the specified root element", () => {
    const result = jsonToXml({ name: "Alice" }, "root");
    expect(result).toContain("<root>");
    expect(result).toContain("Alice");
    expect(result).toContain("</root>");
  });

  it("converts a JSON string to XML", () => {
    const result = jsonToXml(JSON.stringify({ id: 1, label: "test" }), "item");
    expect(result).toContain("<item>");
    expect(result).toContain("</item>");
  });

  it("uses 'root' as fallback when rootElement is empty string", () => {
    const result = jsonToXml({ a: 1 }, "");
    expect(result).toContain("<root>");
  });

  it("uses 'root' as fallback when rootElement is whitespace", () => {
    const result = jsonToXml({ a: 1 }, "   ");
    expect(result).toContain("<root>");
  });

  it("uses custom rootElement in output tag", () => {
    const result = jsonToXml({ x: 9 }, "payload");
    expect(result).toContain("<payload>");
    expect(result).toContain("</payload>");
  });

  it("returns compact XML when prettyPrint=false (default)", () => {
    const result = jsonToXml({ a: 1, b: 2 }, "root", false);
    expect(result).not.toMatch(/\n\s+/);
  });

  it("returns indented XML when prettyPrint=true", () => {
    const result = jsonToXml({ a: 1, b: 2 }, "root", true);
    expect(result).toContain("\n");
  });

  it("accepts a JS object directly (not stringified)", () => {
    const result = jsonToXml({ foo: "bar" }, "data");
    expect(result).toContain("<foo>bar</foo>");
  });

  it("accepts null as input value embedded in string and throws", () => {
    expect(() => jsonToXml(null, "root")).toThrow("input is empty");
  });

  it("accepts undefined as input value and throws", () => {
    expect(() => jsonToXml(undefined, "root")).toThrow("input is empty");
  });

  // Edge cases
  it("throws when input is an empty string", () => {
    expect(() => jsonToXml("", "root")).toThrow("input is empty");
  });

  it("throws when input is whitespace-only string", () => {
    expect(() => jsonToXml("   ", "root")).toThrow("input is empty");
  });

  it("throws on invalid JSON string input", () => {
    expect(() => jsonToXml("{bad json}", "root")).toThrow("not valid JSON");
  });

  it("throws on partially-valid JSON (trailing comma)", () => {
    expect(() => jsonToXml('{"a":1,}', "root")).toThrow("not valid JSON");
  });

  it("handles numeric root name gracefully", () => {
    expect(() => jsonToXml({ val: 1 }, "item123")).not.toThrow();
  });

  it("round-trips through xmlToJson → jsonToXml", () => {
    const xml = "<root><name>test</name><value>99</value></root>";
    const json = xmlToJson(xml);
    const obj = JSON.parse(json);
    const backToXml = jsonToXml(obj, "ignored-root-not-used-here");
    expect(backToXml).toContain("test");
    expect(backToXml).toContain("99");
  });

  it("handles a boolean value wrapped in an object", () => {
    const result = jsonToXml({ flag: true }, "config");
    expect(result).toContain("true");
  });

  it("handles an array value in the object", () => {
    const result = jsonToXml({ item: ["a", "b", "c"] }, "list");
    expect(result).toContain("<list>");
  });
});
