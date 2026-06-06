import "@testing-library/jest-dom";
import { vi } from "vitest";

// server-only throws outside a server context — mock it globally for all tests
vi.mock("server-only", () => ({}));
