import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "__tests__/stubs/server-only.ts"),
    },
  },
  test: {
    globals: true,
    setupFiles: ["__tests__/setup.ts"],
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          include: ["__tests__/api/**/*.test.ts", "__tests__/db/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          include: ["__tests__/**/*.test.{ts,tsx}"],
          exclude: ["__tests__/api/**/*.test.ts", "__tests__/db/**/*.test.ts"],
          environment: "jsdom",
        },
      },
    ],
  },
});
