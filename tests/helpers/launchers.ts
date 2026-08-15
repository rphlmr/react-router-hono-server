import path from "node:path";
import { fixtureBin, type ManagedProcess, runCommand, spawnProcess } from "./process";

export type RuntimeName = "node" | "bun" | "deno";

export type RuntimeLauncher = {
  name: RuntimeName;
  build(cwd: string): ReturnType<typeof runCommand>;
  startProduction(cwd: string, port: number): ManagedProcess;
  startDev(cwd: string, port: number): ManagedProcess;
};

const nodeLauncher: RuntimeLauncher = {
  name: "node",
  build(cwd) {
    return runCommand({
      command: fixtureBin(cwd, "react-router"),
      args: ["build"],
      cwd,
      env: {
        ...process.env,
        NODE_ENV: "production",
      },
    });
  },
  startProduction(cwd, port) {
    return spawnProcess({
      command: process.execPath,
      args: [path.join(cwd, "build/server/index.js")],
      cwd,
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: String(port),
      },
    });
  },
  startDev(cwd, port) {
    return spawnProcess({
      command: fixtureBin(cwd, "react-router"),
      args: ["dev", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
      cwd,
      env: {
        ...process.env,
        NODE_ENV: "development",
        PORT: String(port),
      },
    });
  },
};

const bunLauncher: RuntimeLauncher = {
  name: "bun",
  build(cwd) {
    return runCommand({
      command: fixtureBin(cwd, "react-router"),
      args: ["build"],
      cwd,
      env: {
        ...process.env,
        NODE_ENV: "production",
      },
    });
  },
  startProduction(cwd, port) {
    return spawnProcess({
      command: "bun",
      args: [path.join(cwd, "build/server/index.js")],
      cwd,
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: String(port),
      },
    });
  },
  startDev(cwd, port) {
    // `bunx --bun vite` currently crashes React Router typegen (`generate is not a function`).
    // Dev still uses `reactRouterHonoServer({ runtime: "bun" })` through Node Vite.
    return spawnProcess({
      command: fixtureBin(cwd, "react-router"),
      args: ["dev", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
      cwd,
      env: {
        ...process.env,
        NODE_ENV: "development",
        PORT: String(port),
      },
    });
  },
};

const denoLauncher: RuntimeLauncher = {
  name: "deno",
  build(cwd) {
    return runCommand({
      command: fixtureBin(cwd, "react-router"),
      args: ["build"],
      cwd,
      env: {
        ...process.env,
        NODE_ENV: "production",
      },
    });
  },
  startProduction(cwd, port) {
    return spawnProcess({
      command: "deno",
      args: ["run", "--unstable-cron", "-A", path.join(cwd, "build/server/index.js")],
      cwd,
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: String(port),
      },
    });
  },
  startDev(cwd, port) {
    // `deno run ... npm:vite` is slower and more brittle than Node Vite.
    // Dev still uses `reactRouterHonoServer({ runtime: "deno" })` through Node Vite
    // when we enable it; production is the first Deno contract.
    return spawnProcess({
      command: fixtureBin(cwd, "react-router"),
      args: ["dev", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
      cwd,
      env: {
        ...process.env,
        NODE_ENV: "development",
        PORT: String(port),
      },
    });
  },
};

const launchers: Record<RuntimeName, RuntimeLauncher> = {
  node: nodeLauncher,
  bun: bunLauncher,
  deno: denoLauncher,
};

export function getLauncher(runtime: RuntimeName) {
  return launchers[runtime];
}
