import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode } from "@/lib/workflow-types";
import type { XmlJsonNodeData } from "@/lib/node-types";
import { toText } from "./utils";
import { xmlToJson, jsonToXml } from "@/lib/xml-json";

class XmlJsonNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext) {
    const inputSrc = ctx.inputFor("input");
    if (!inputSrc) throw new Error("XML↔JSON node has no input connected");

    const r = await ctx.evalInput(inputSrc);
    if (r.active === false) return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };

    const { direction = "xml-to-json", rootElement = "root", prettyPrint = false } = (node.data as unknown) as XmlJsonNodeData;

    const result = direction === "xml-to-json"
      ? xmlToJson(toText(r.value), prettyPrint)
      : jsonToXml(r.value, rootElement ?? "root", prettyPrint);

    return { value: result, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new XmlJsonNode();
