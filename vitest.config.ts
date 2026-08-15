/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
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
          fileParallelism: false,
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
});
