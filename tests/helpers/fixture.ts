import { cp, lstat, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eventually } from "./eventually";
import { getLauncher, type RuntimeLauncher, type RuntimeName } from "./launchers";
import { BROWSER_UA, type CommandResult, getFreePort, type ManagedProcess, waitForHttp } from "./process";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const SKIP_COPY_DIRS = new Set(["node_modules", "build", ".react-router"]);

export type FixtureName = "basic";

export class FixtureApp {
  readonly name: FixtureName;
  readonly runtime: RuntimeName;
  readonly cwd: string;
  readonly port: number;
  readonly url: string;
  buildResult?: CommandResult;
  private readonly launcher: RuntimeLauncher;
  private server?: ManagedProcess;

  constructor(options: { name: FixtureName; runtime: RuntimeName; cwd: string; port: number }) {
    this.name = options.name;
    this.runtime = options.runtime;
    this.cwd = options.cwd;
    this.port = options.port;
    this.url = `http://127.0.0.1:${options.port}`;
    this.launcher = getLauncher(options.runtime);
  }

  async build() {
    this.buildResult = await this.launcher.build(this.cwd);
    return this.buildResult;
  }

  async startProduction() {
    this.server = this.launcher.startProduction(this.cwd, this.port);
    await waitForHttp(this.url, { logs: () => this.logs() });
  }

  async startDev() {
    this.server = this.launcher.startDev(this.cwd, this.port);
    await waitForHttp(this.url, { logs: () => this.logs() });
  }

  async fetch(pathname: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    if (!headers.has("user-agent")) {
      headers.set("user-agent", BROWSER_UA);
    }

    return await fetch(new URL(pathname, this.url), {
      ...init,
      headers,
    });
  }

  async text(pathname: string, init?: RequestInit) {
    const response = await this.fetch(pathname, init);
    return await response.text();
  }

  async edit(relativePath: string, contents: string) {
    const filePath = path.join(this.cwd, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, contents);
  }

  async eventually(assertion: () => Promise<void>, options?: { timeout?: number; interval?: number }) {
    await eventually(assertion, {
      ...options,
      logs: () => this.logs(),
    });
  }

  logs() {
    return this.server?.logs() ?? "";
  }

  get alive() {
    const child = this.server?.child;
    return Boolean(child && child.exitCode === null && child.signalCode == null);
  }

  async stop() {
    await this.server?.stop();
    this.server = undefined;
    await rm(this.cwd, { recursive: true, force: true });
  }
}

export class ProductionFixture extends FixtureApp {
  static async create(name: FixtureName, runtime: RuntimeName = "node") {
    return await createPreparedFixture(name, runtime);
  }

  static async start(name: FixtureName, runtime: RuntimeName = "node") {
    const app = await ProductionFixture.create(name, runtime);
    await app.build();
    await app.startProduction();
    return app;
  }

  async start() {
    await this.startProduction();
  }
}

export class DevServerFixture extends FixtureApp {
  static async start(name: FixtureName, runtime: RuntimeName = "node") {
    const app = await createPreparedFixture(name, runtime);
    await app.startDev();
    return app;
  }
}

async function createPreparedFixture(name: FixtureName, runtime: RuntimeName) {
  const source = path.join(REPO_ROOT, "tests/fixtures", name);
  const nodeModules = path.join(source, "node_modules");

  try {
    await lstat(nodeModules);
  } catch {
    throw new Error(`Fixture ${name} is missing node_modules. Run pnpm install from the repo root first.`);
  }

  const cwd = await mkdtemp(path.join(os.tmpdir(), `react-router-hono-server-${runtime}-${name}-`));
  await cp(source, cwd, {
    recursive: true,
    filter: (sourcePath) => {
      const relative = path.relative(source, sourcePath);
      return !relative.split(path.sep).some((part) => SKIP_COPY_DIRS.has(part));
    },
  });
  await symlink(nodeModules, path.join(cwd, "node_modules"), "dir");

  if (runtime !== "node") {
    await cp(path.join(REPO_ROOT, "tests/fixtures/overlays", runtime), cwd, { recursive: true });
  }

  return new FixtureApp({
    name,
    runtime,
    cwd,
    port: await getFreePort(),
  });
}
