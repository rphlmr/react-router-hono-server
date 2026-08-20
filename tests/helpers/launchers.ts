import path from "node:path";

import { fixtureBin, type ManagedProcess, runCommand, spawnProcess } from "./process";

export type RuntimeName = "node" | "bun" | "deno" | "cloudflare" | "aws";

export type RuntimeCapabilities = {
  browser: boolean;
  webSocket: boolean;
  workerd: boolean;
};

export type RuntimeDefinition = {
  name: RuntimeName;
  packageManager: { command: string; installArgs: string[]; lockfile: string };
  dependencies?: Record<string, string>;
  scripts: { build: string; dev: string; start: string; typecheck: string };
  environment: NodeJS.ProcessEnv;
  capabilities: RuntimeCapabilities;
};

const commonScripts = {
  build: "react-router build",
  dev: "react-router dev",
  typecheck: "react-router typegen && tsc --noEmit",
};

const nodeDependencies = { "@react-router/node": "8.3.0" };
const webSocketDependencies = { "@types/ws": "8.18.1", ws: "8.21.0" };

export const runtimeDefinitions = {
  node: {
    name: "node",
    packageManager: { command: "pnpm", installArgs: ["install"], lockfile: "pnpm-lock.yaml" },
    dependencies: { ...nodeDependencies, ...webSocketDependencies },
    scripts: { ...commonScripts, start: "node ./build/server/index.js" },
    environment: {},
    capabilities: { browser: true, webSocket: true, workerd: false },
  },
  bun: {
    name: "bun",
    packageManager: { command: "bun", installArgs: ["install", "--exact"], lockfile: "bun.lock" },
    dependencies: { ...webSocketDependencies },
    scripts: {
      ...commonScripts,
      build: "bunx --bun react-router build",
      dev: "bun run --bun vite",
      start: "bun ./build/server/index.js",
    },
    environment: {},
    capabilities: { browser: true, webSocket: true, workerd: false },
  },
  deno: {
    name: "deno",
    packageManager: {
      command: "deno",
      installArgs: ["install", "--allow-scripts", "--minimum-dependency-age=0"],
      lockfile: "deno.lock",
    },
    dependencies: { ...webSocketDependencies },
    scripts: {
      ...commonScripts,
      dev: "deno run --conditions=development --allow-all npm:@react-router/dev dev",
      start: "deno run --allow-all ./build/server/index.js",
    },
    environment: {},
    capabilities: { browser: true, webSocket: true, workerd: false },
  },
  cloudflare: {
    name: "cloudflare",
    packageManager: { command: "pnpm", installArgs: ["install"], lockfile: "pnpm-lock.yaml" },
    scripts: { ...commonScripts, dev: "vite dev", start: "vite preview" },
    environment: {},
    capabilities: { browser: true, webSocket: true, workerd: true },
  },
  aws: {
    name: "aws",
    packageManager: { command: "pnpm", installArgs: ["install"], lockfile: "pnpm-lock.yaml" },
    dependencies: { ...nodeDependencies },
    scripts: { ...commonScripts, dev: "react-router dev", start: "node ./build/server/index.js" },
    environment: {},
    capabilities: { browser: false, webSocket: false, workerd: false },
  },
} as const satisfies Record<RuntimeName, RuntimeDefinition>;

export type RuntimeLauncher = RuntimeDefinition & {
  install(cwd: string): ReturnType<typeof runCommand>;
  typecheck(cwd: string): Promise<Awaited<ReturnType<typeof runCommand>>>;
  build(cwd: string): ReturnType<typeof runCommand>;
  startProduction(cwd: string, port: number): ManagedProcess;
  startDev(cwd: string, port: number): ManagedProcess;
};

function commandParts(script: string) {
  const [command, ...args] = script.split(" ");
  return { command, args };
}

function createLauncher(definition: RuntimeDefinition): RuntimeLauncher {
  const runScript = (cwd: string, script: string, environment: NodeJS.ProcessEnv = {}) => {
    const { command, args } = commandParts(script);
    const executable =
      command === "react-router" || command === "tsc" ? fixtureBin(cwd, command) : command;

    return runCommand({
      command: executable,
      args,
      cwd,
      env: { ...process.env, ...definition.environment, ...environment },
    });
  };

  const spawnScript = (
    cwd: string,
    script: string,
    port: number,
    mode: "development" | "production",
  ) => {
    const { command, args } = commandParts(script);
    const executable =
      command === "react-router" || command === "vite" ? fixtureBin(cwd, command) : command;
    const hostArgs =
      mode === "development" || definition.name === "cloudflare"
        ? ["--host", "127.0.0.1", "--port", String(port), "--strictPort"]
        : [];

    return spawnProcess({
      command: executable,
      args: [
        ...args.map((arg) =>
          arg.replace("./build/server/index.js", path.join(cwd, "build/server/index.js")),
        ),
        ...hostArgs,
      ],
      cwd,
      env: { ...process.env, ...definition.environment, NODE_ENV: mode, PORT: String(port) },
    });
  };

  return {
    ...definition,
    install(cwd) {
      return runCommand({
        command: definition.packageManager.command,
        args: definition.packageManager.installArgs,
        cwd,
        env: { ...process.env, ...definition.environment },
        timeout: 180_000,
      });
    },
    async typecheck(cwd) {
      await runScript(cwd, "react-router typegen");
      return runScript(cwd, "tsc --noEmit");
    },
    build(cwd) {
      return runScript(cwd, definition.scripts.build, { NODE_ENV: "production" });
    },
    startProduction(cwd, port) {
      return spawnScript(cwd, definition.scripts.start, port, "production");
    },
    startDev(cwd, port) {
      return spawnScript(cwd, definition.scripts.dev, port, "development");
    },
  };
}

const launchers = Object.fromEntries(
  Object.entries(runtimeDefinitions).map(([runtime, definition]) => [
    runtime,
    createLauncher(definition),
  ]),
) as Record<RuntimeName, RuntimeLauncher>;

export function getLauncher(runtime: RuntimeName) {
  return launchers[runtime];
}
