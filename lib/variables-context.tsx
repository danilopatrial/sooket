"use client";

import { createContext, useContext } from "react";

interface VariablesContextValue {
  names: string[];
  refresh: () => void;
}

export const VariablesContext = createContext<VariablesContextValue>({
  names: [],
  refresh: () => {},
});

export function useVariables() {
  return useContext(VariablesContext);
}
