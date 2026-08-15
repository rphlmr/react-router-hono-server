import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { runtimeDefinitions } from "../helpers/launchers";

const root = path.resolve(import.meta.dirname, "../..");

describe("canonical documentation", () => {
  test("marks configuration, server, and script blocks for every runtime", async () => {
    const readme = await readFile(path.join(root, "README.md"), "utf8");
    for (const runtime of Object.keys(runtimeDefinitions)) {
      expect(readme).toContain(`<!-- canonical:${runtime}-vite -->`);
      expect(readme).toContain(`<!-- canonical:${runtime}-server -->`);
      expect(readme).toContain(`<!-- canonical:${runtime}-scripts -->`);
    }
    expect(readme).toContain("<!-- canonical:cloudflare-wrangler -->");
  });

  test("documents the executable runtime commands", async () => {
    const readme = await readFile(path.join(root, "README.md"), "utf8");
    for (const definition of Object.values(runtimeDefinitions)) {
      expect(readme).toContain(`"build": "${definition.scripts.build}"`);
      expect(readme).toContain(`"dev": "${definition.scripts.dev}"`);
      expect(readme).toContain(`"typecheck": "${definition.scripts.typecheck}"`);
      if (definition.name !== "aws") expect(readme).toContain(`"start": "${definition.scripts.start}"`);
    }
  });

  test("does not restore superseded documentation", async () => {
    const readme = await readFile(path.join(root, "README.md"), "utf8");
    for (const stale of [
      "force_react_19",
      "v8_middleware",
      "React 18",
      "React Router 7",
      `./${["exam", "ples"].join("")}`,
      "--configLoader",
      "@hono/node-ws",
    ]) {
      expect(readme).not.toContain(stale);
    }
  });
});
