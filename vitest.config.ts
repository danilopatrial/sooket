import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// Tests that touch the real SQLite layer must run in the Node environment:
// jsdom (a browser-like env) can't externalize the `node:sqlite` built-in and
// errors with "Cannot bundle Node.js built-in". Anything under api/** or db/**
// qualifies by convention; a handful of lib/** tests import the DB-backed
// modules directly and are listed explicitly so they share that environment.
const NODE_ENV_TESTS = [
  "__tests__/api/**/*.test.ts",
  "__tests__/db/**/*.test.ts",
  "__tests__/lib/cors.test.ts",
  "__tests__/lib/idempotency.test.ts",
  "__tests__/lib/metrics.test.ts",
];

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
          include: NODE_ENV_TESTS,
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          include: ["__tests__/**/*.test.{ts,tsx}"],
          exclude: NODE_ENV_TESTS,
          environment: "jsdom",
        },
      },
    ],
  },
});
