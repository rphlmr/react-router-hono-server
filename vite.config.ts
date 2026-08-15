import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    maxWorkers: 2,
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          globals: true,
          include: ["tests/unit/**/*.test.ts"],
          fileParallelism: true,
        },
      },
      {
        test: {
          name: "package",
          environment: "node",
          globals: true,
          include: ["tests/package/**/*.test.ts"],
          fileParallelism: true,
          testTimeout: 60_000,
        },
      },
      {
        test: {
          name: "runtime",
          environment: "node",
          globals: true,
          include: ["tests/integration/**/*.test.ts"],
          fileParallelism: true,
          testTimeout: 60_000,
          hookTimeout: 240_000,
        },
      },
    ],

    coverage: {
      provider: "v8",
      reporter: ["json-summary", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/types/**"],
    },
  },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: [
      ".changeset/**",
      ".github/**",
      "build/**",
      "dist/**",
      "out/**",
      "tests/fixtures/**",
      "CODE_OF_CONDUCT.md",
      "MIGRATION.md",
      "README.md",
      "tests/README.md",
    ],
    sortPackageJson: {
      sortScripts: true,
    },
    sortImports: {
      groups: [
        "type-import",
        ["value-builtin", "value-external"],
        "type-internal",
        "value-internal",
        ["type-parent", "type-sibling", "type-index"],
        ["value-parent", "value-sibling", "value-index"],
        "unknown",
      ],
    },
  },
  lint: {
    ignorePatterns: ["tests/fixtures/**"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "typescript/return-await": ["error", "in-try-catch"],
      "typescript/only-throw-error": "error",
      "prefer-template": "warn",
    },
    options: { typeAware: true, typeCheck: true },
  },
  pack: [
    {
      entry: [
        "src/adapters/node.ts",
        "src/adapters/bun.ts",
        "src/adapters/cloudflare.ts",
        "src/adapters/aws-lambda.ts",
        "src/adapters/deno.ts",
        "src/dev.ts",
        "src/middleware.ts",
        "src/http.ts",
      ],
      outDir: "dist",
      format: ["esm"],
      outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
      clean: true,
      dts: true,
      deps: {
        neverBundle: ["react", "virtual:react-router/server-build"],
      },
    },
    {
      entry: ["src/cli.ts"],
      outDir: "dist",
      format: ["esm"],
      outExtensions: () => ({ js: ".js" }),
      onSuccess: () => {
        const banner = "#!/usr/bin/env node\n";
        const cliFilePath = "dist/cli.js";
        const originalContent = fs.readFileSync(cliFilePath, "utf-8");
        fs.writeFileSync(cliFilePath, banner + originalContent);
        fs.chmodSync(cliFilePath, "755");

        setupOutput();
      },
    },
  ],
});

function setupOutput() {
  console.log("Setting up output...");
  const moduleDir = path.join("out");

  fs.rmSync(moduleDir, { recursive: true, force: true });
  fs.mkdirSync(moduleDir, { recursive: true });
  fs.cpSync(path.resolve("dist"), path.join(moduleDir, "dist"), { recursive: true });
  fs.copyFileSync("package.json", path.join(moduleDir, "package.json"));

  console.log("Output setup complete.");
}
