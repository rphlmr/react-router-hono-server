import { cp, lstat, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eventually } from "./eventually";
import {
  BROWSER_UA,
  type CommandResult,
  fixtureBin,
  getFreePort,
  type ManagedProcess,
  runCommand,
  spawnProcess,
  waitForHttp,
} from "./process";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const SKIP_COPY_DIRS = new Set(["node_modules", "build", ".react-router"]);

export type FixtureName = "basic";

class FixtureApp {
  readonly name: FixtureName;
  readonly cwd: string;
  readonly port: number;
  readonly url: string;
  buildResult?: CommandResult;
  private server?: ManagedProcess;

  constructor(options: { name: FixtureName; cwd: string; port: number }) {
    this.name = options.name;
    this.cwd = options.cwd;
    this.port = options.port;
    this.url = `http://127.0.0.1:${options.port}`;
  }

  async build() {
    this.buildResult = await runCommand({
      command: fixtureBin(this.cwd, "react-router"),
      args: ["build"],
      cwd: this.cwd,
      env: {
        ...process.env,
        NODE_ENV: "production",
      },
    });
    return this.buildResult;
  }

  async startProduction() {
    this.server = spawnProcess({
      command: process.execPath,
      args: [path.join(this.cwd, "build/server/index.js")],
      cwd: this.cwd,
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: String(this.port),
      },
    });
    await waitForHttp(this.url, { logs: () => this.logs() });
  }

  async startDev() {
    this.server = spawnProcess({
      command: fixtureBin(this.cwd, "react-router"),
      args: ["dev", "--host", "127.0.0.1", "--port", String(this.port), "--strictPort"],
      cwd: this.cwd,
      env: {
        ...process.env,
        NODE_ENV: "development",
        PORT: String(this.port),
      },
    });
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

  async stop() {
    await this.server?.stop();
    this.server = undefined;
    await rm(this.cwd, { recursive: true, force: true });
  }
}

export class ProductionFixture extends FixtureApp {
  static async create(name: FixtureName) {
    return await createPreparedFixture(ProductionFixture, name);
  }

  static async start(name: FixtureName) {
    const app = await ProductionFixture.create(name);
    await app.build();
    await app.startProduction();
    return app;
  }

  async start() {
    await this.startProduction();
  }
}

export class DevServerFixture extends FixtureApp {
  static async start(name: FixtureName) {
    const app = await createPreparedFixture(DevServerFixture, name);
    await app.startDev();
    return app;
  }
}

async function createPreparedFixture<T extends FixtureApp>(
  Fixture: new (options: { name: FixtureName; cwd: string; port: number }) => T,
  name: FixtureName
) {
  const source = path.join(REPO_ROOT, "tests/fixtures", name);
  const nodeModules = path.join(source, "node_modules");

  try {
    await lstat(nodeModules);
  } catch {
    throw new Error(`Fixture ${name} is missing node_modules. Run pnpm install from the repo root first.`);
  }

  const cwd = await mkdtemp(path.join(os.tmpdir(), `react-router-hono-server-${name}-`));
  await cp(source, cwd, {
    recursive: true,
    filter: (sourcePath) => {
      const relative = path.relative(source, sourcePath);
      return !relative.split(path.sep).some((part) => SKIP_COPY_DIRS.has(part));
    },
  });
  await symlink(nodeModules, path.join(cwd, "node_modules"), "dir");

  return new Fixture({
    name,
    cwd,
    port: await getFreePort(),
  });
}
