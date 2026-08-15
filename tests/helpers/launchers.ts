import path from "node:path";
import { fixtureBin, type ManagedProcess, runCommand, spawnProcess } from "./process";

export type RuntimeName = "node" | "bun" | "deno" | "cloudflare";

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
    return spawnProcess({
      command: "bunx",
      args: [
        "--bun",
        "vite",
        "--configLoader",
        "runner",
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
        "--strictPort",
      ],
      cwd,
      env: {
        ...process.env,
        NODE_ENV: "development",
        PORT: String(port),
      },
    });
  },
};

const cloudflareLauncher: RuntimeLauncher = {
  name: "cloudflare",
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
      command: fixtureBin(cwd, "vite"),
      args: ["preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
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
      command: fixtureBin(cwd, "vite"),
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
    return spawnProcess({
      command: "deno",
      args: [
        "run",
        "--unstable-cron",
        "-A",
        "npm:vite",
        "dev",
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
        "--strictPort",
      ],
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
  cloudflare: cloudflareLauncher,
};

export function getLauncher(runtime: RuntimeName) {
  return launchers[runtime];
}
