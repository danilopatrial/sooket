"use client";

import { createContext, useContext } from "react";

export interface NodeInfo {
  id: string;
  type: string;
  label: string;
}

interface NodesContextValue {
  nodes: NodeInfo[];
}

export const NodesContext = createContext<NodesContextValue>({ nodes: [] });

export function useWorkflowNodes() {
  return useContext(NodesContext);
}
