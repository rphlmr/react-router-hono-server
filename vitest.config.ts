/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: [],
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,

    coverage: {
      provider: "v8",
      reporter: ["json-summary", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/types/**"],
    },
  },
});
