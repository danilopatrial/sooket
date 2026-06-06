import { XMLParser, XMLBuilder } from "fast-xml-parser";

const PARSER_OPTIONS = { ignoreAttributes: false, attributeNamePrefix: "@_" } as const;
const BUILDER_OPTIONS = { ignoreAttributes: false, attributeNamePrefix: "@_" } as const;

export function xmlToJson(xmlStr: string, prettyPrint = false): string {
  if (!xmlStr.trim()) throw new Error("XML↔JSON: input is empty");
  const parser = new XMLParser(PARSER_OPTIONS);
  let parsed: unknown;
  try {
    parsed = parser.parse(xmlStr);
  } catch (err) {
    throw new Error(`XML↔JSON: invalid XML — ${err instanceof Error ? err.message : String(err)}`);
  }
  return prettyPrint ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed);
}

export function jsonToXml(input: unknown, rootElement: string, prettyPrint = false): string {
  const root = rootElement && rootElement.trim() ? rootElement.trim() : "root";

  let obj: unknown;
  if (input !== null && typeof input === "object") {
    obj = input;
  } else {
    const jsonStr = String(input ?? "");
    if (!jsonStr.trim()) throw new Error("XML↔JSON: input is empty");
    try {
      obj = JSON.parse(jsonStr);
    } catch {
      throw new Error("XML↔JSON: input is not valid JSON");
    }
  }

  const builder = new XMLBuilder({ ...BUILDER_OPTIONS, format: prettyPrint });
  return builder.build({ [root]: obj }) as string;
}
