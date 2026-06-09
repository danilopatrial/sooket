#!/usr/bin/env node
// Thin executable wrapper — all logic lives in cli.mjs, which is kept
// shebang-free so tests and bundlers can import it on every platform.
import { main } from "./cli.mjs";

main();
