import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: [
      "src/adapters/node.ts",
      "src/adapters/bun.ts",
      "src/adapters/cloudflare.ts",
      "src/adapters/aws-lambda.ts",
      "src/dev.ts",
      "src/middleware.ts",
      "src/http.ts",
    ],
    outDir: "dist",
    format: ["esm"],
    clean: true,
    dts: true,
    external: [
      // virtual module provided by React Router at build time
      "virtual:react-router/server-build",
      "react",
    ],
  },
  {
    entry: ["src/cli.ts"],
    outDir: "dist",
    format: ["esm"],
    // biome-ignore lint/suspicious/useAwait: required by tsup
    onSuccess: async () => {
      const banner = "#!/usr/bin/env node\n";
      const cliFilePath = "dist/cli.js";
      const originalContent = fs.readFileSync(cliFilePath, "utf-8");
      fs.writeFileSync(cliFilePath, banner + originalContent);
      fs.chmodSync(cliFilePath, "755");
    },
  },
]);

process.on("beforeExit", (code) => {
  if (code === 0) {
    setupExamples();
  }
});

function setupExamples() {
  console.log("Setting up examples...");
  const adapters = fs.readdirSync("examples");

  for (const adapter of adapters) {
    const adapterPath = path.join("examples", adapter);

    if (!fs.statSync(adapterPath).isDirectory()) {
      continue;
    }

    const examples = fs.readdirSync(adapterPath);

    for (const example of examples) {
      const examplePath = path.join(adapterPath, example);

      if (!fs.statSync(examplePath).isDirectory()) {
        continue;
      }

      const moduleDir = path.join(examplePath, "node_modules", "react-router-hono-server");

      fs.rmSync(moduleDir, { recursive: true, force: true });
      fs.mkdirSync(moduleDir, { recursive: true });
      fs.cpSync(path.resolve("dist"), path.join(moduleDir, "dist"), { recursive: true });

      // Copy package.json
      fs.copyFileSync("package.json", path.join(moduleDir, "package.json"));
    }
  }
  console.log("Examples setup complete.");
}
