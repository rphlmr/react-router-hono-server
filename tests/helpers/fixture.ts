import { cp, mkdir, mkdtemp, readdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eventually } from "./eventually";
import { getLauncher, type RuntimeLauncher, type RuntimeName } from "./launchers";
import { BROWSER_UA, type CommandResult, getFreePort, type ManagedProcess, runCommand, waitForHttp } from "./process";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const SKIP_COPY_DIRS = new Set(["node_modules", "build", ".react-router"]);
const ARTIFACT_DIRECTORY = path.join(REPO_ROOT, "out", "test-artifacts");

export type FixtureName = "basic" | "prerendered";

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
    try {
      await waitForHttp(this.url, { logs: () => this.logs(), process: this.server });
    } catch (error) {
      await this.stop();
      throw error;
    }
  }

  async startDev() {
    this.server = this.launcher.startDev(this.cwd, this.port);
    try {
      await waitForHttp(this.url, { logs: () => this.logs(), process: this.server });
    } catch (error) {
      await this.stop();
      throw error;
    }
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

  async read(relativePath: string) {
    return await readFile(path.join(this.cwd, relativePath), "utf8");
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
  const cwd = await mkdtemp(path.join(os.tmpdir(), `react-router-hono-server-${runtime}-${name}-`));

  try {
    await copyFixture(path.join(REPO_ROOT, "tests/fixtures/basic"), cwd);
    if (name !== "basic") {
      await copyFixture(path.join(REPO_ROOT, "tests/fixtures", name), cwd);
    }

    if (runtime !== "node") {
      await cp(path.join(REPO_ROOT, "tests/fixtures/overlays", runtime), cwd, { recursive: true });
    }

    const launcher = getLauncher(runtime);
    const artifact = await findPackageArtifact();
    let packageSource = artifact;
    if (runtime === "deno") {
      // Deno links file: tarballs as files and does not install dependencies declared by local directories.
      packageSource = path.join(cwd, ".package-artifact");
      await mkdir(packageSource);
      await runCommand({
        command: "tar",
        args: ["-xzf", artifact, "--strip-components=1", "-C", packageSource],
        cwd,
      });
    }
    const manifestPath = path.join(cwd, "package.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.scripts = launcher.scripts;
    Object.assign(manifest.dependencies, launcher.dependencies);
    manifest.dependencies["react-router-hono-server"] = `file:${packageSource}`;
    if (runtime === "deno") {
      const packageManifest = JSON.parse(await readFile(path.join(packageSource, "package.json"), "utf8"));
      Object.assign(manifest.dependencies, packageManifest.dependencies);
    }
    if (process.env.RRHS_LATEST_COMPATIBLE === "1") {
      const versions = JSON.parse(await readFile(path.join(ARTIFACT_DIRECTORY, "latest-versions.json"), "utf8"));
      for (const [dependency, version] of Object.entries(versions)) {
        if (dependency in manifest.dependencies) manifest.dependencies[dependency] = version;
        if (dependency in manifest.devDependencies) manifest.devDependencies[dependency] = version;
      }
    }
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    await launcher.install(cwd);
    await assertIsolatedInstall(cwd, artifact);
    await launcher.typecheck(cwd);

    return new FixtureApp({ name, runtime, cwd, port: await getFreePort() });
  } catch (error) {
    await rm(cwd, { recursive: true, force: true });
    throw error;
  }
}

async function copyFixture(source: string, cwd: string) {
  await cp(source, cwd, {
    recursive: true,
    filter: (sourcePath) => {
      const relative = path.relative(source, sourcePath);
      return !relative.split(path.sep).some((part) => SKIP_COPY_DIRS.has(part));
    },
  });
}

async function findPackageArtifact() {
  const artifacts = (await readdir(ARTIFACT_DIRECTORY)).filter((file) => file.endsWith(".tgz"));
  if (artifacts.length !== 1) {
    throw new Error(`Expected one packed package in ${ARTIFACT_DIRECTORY}; run pnpm test:prepare first.`);
  }
  return path.join(ARTIFACT_DIRECTORY, artifacts[0]);
}

async function assertIsolatedInstall(cwd: string, artifact: string) {
  const packagePath = path.join(cwd, "node_modules", "react-router-hono-server", "package.json");
  const installed = JSON.parse(await readFile(packagePath, "utf8"));
  const root = await readFile(path.join(REPO_ROOT, "package.json"), "utf8").then(JSON.parse);
  if (installed.name !== root.name || installed.version !== root.version) {
    throw new Error(`Fixture did not install ${artifact}.`);
  }

  const resolvedPackagePath = await realpath(
    path.join(cwd, "node_modules/react-router-hono-server/dist/adapters/node.js")
  );
  if (resolvedPackagePath.startsWith(REPO_ROOT)) {
    throw new Error(`Fixture resolved the package through the repository root: ${resolvedPackagePath}`);
  }

  const appRequire = createRequire(path.join(cwd, "package.json"));
  const packageRequire = createRequire(packagePath);
  for (const dependency of ["react", "react-dom", "react-router", "hono", "vite"]) {
    const appResolution = await realpath(appRequire.resolve(dependency));
    const packageResolution = await realpath(packageRequire.resolve(dependency));
    if (appResolution !== packageResolution) {
      throw new Error(
        `${dependency} is duplicated: application resolved ${appResolution}, package resolved ${packageResolution}.`
      );
    }
  }
}
