import { test } from "vitest";

// Deno production is covered in deno.production.test.ts.
// Dev via `deno run --unstable-cron -A npm:vite` is slower and not the first contract.
// Running the Deno adapter under Node Vite can fail because `Deno` is not defined.
test.skip("deno development server is not part of the first Deno wave", () => {});
