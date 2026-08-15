import { test } from "vitest";

// `bunx --bun vite` currently crashes React Router typegen:
// `TypeError: generate is not a function`.
// Running the Bun adapter under Node Vite fails with `Bun is not defined`.
// Production Bun coverage lives in bun.production.test.ts.
test.skip("bun development server is blocked by React Router typegen under Bun", () => {});
