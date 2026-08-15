import { type ChildProcess, spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";

const tracked = new Set<ManagedProcess>();
const MAX_LOG_LENGTH = 64 * 1024;

export type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export class CommandFailedError extends Error {
  readonly result: CommandResult;

  constructor(command: string, args: string[], result: CommandResult) {
    super(
      [
        `Command failed (${result.exitCode}): ${command} ${args.join(" ")}`,
        result.stdout ? `stdout:\n${result.stdout}` : "",
        result.stderr ? `stderr:\n${result.stderr}` : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    );
    this.result = result;
  }
}

export class ManagedProcess {
  readonly child: ChildProcess;
  stdout = "";
  stderr = "";

  constructor(child: ChildProcess) {
    this.child = child;
    child.stdout?.on("data", (chunk) => {
      this.stdout = appendBounded(this.stdout, String(chunk));
    });
    child.stderr?.on("data", (chunk) => {
      this.stderr = appendBounded(this.stderr, String(chunk));
    });
    tracked.add(this);
  }

  logs() {
    return [this.stdout && `stdout:\n${this.stdout}`, this.stderr && `stderr:\n${this.stderr}`]
      .filter(Boolean)
      .join("\n\n");
  }

  async stop(timeoutMs = 5_000) {
    const { pid } = this.child;
    if (pid && this.child.exitCode === null) {
      killProcessTree(pid, "SIGTERM");
      const exited = await waitForExit(this.child, timeoutMs);
      if (!exited && this.child.exitCode === null) {
        killProcessTree(pid, "SIGKILL");
        await waitForExit(this.child, 2_000);
      }
    }
    tracked.delete(this);
  }
}

export async function getFreePort() {
  return await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Failed to allocate a free port"));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

export function fixtureBin(cwd: string, name: string) {
  return path.join(cwd, "node_modules", ".bin", name);
}

export async function runCommand(options: {
  command: string;
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  timeout?: number;
}) {
  const child = spawn(options.command, options.args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const managed = new ManagedProcess(child);
  const timer = setTimeout(() => {
    if (child.pid) killProcessTree(child.pid, "SIGKILL");
  }, options.timeout ?? 120_000);
  const exitCode = await waitForExitCode(child);
  clearTimeout(timer);
  const result: CommandResult = {
    exitCode: exitCode ?? 1,
    stdout: managed.stdout,
    stderr: managed.stderr,
  };
  tracked.delete(managed);

  if (result.exitCode !== 0) {
    throw new CommandFailedError(options.command, options.args, result);
  }

  return result;
}

export function spawnProcess(options: { command: string; args: string[]; cwd: string; env?: NodeJS.ProcessEnv }) {
  const child = spawn(options.command, options.args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
  });

  return new ManagedProcess(child);
}

export async function waitForHttp(
  url: string,
  options: { timeout?: number; interval?: number; logs?: () => string; process?: ManagedProcess } = {}
) {
  const timeout = options.timeout ?? 30_000;
  const interval = options.interval ?? 100;
  const deadline = Date.now() + timeout;
  let lastError: unknown;

  while (Date.now() < deadline) {
    if (options.process && options.process.child.exitCode !== null) {
      throw new Error(`Process exited before ${url} became ready.\n\n${options.logs?.() ?? ""}`);
    }
    try {
      await fetch(url, {
        redirect: "manual",
        headers: { "user-agent": BROWSER_UA },
        signal: AbortSignal.timeout(1_000),
      });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  const logs = options.logs?.();
  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error([`Timed out waiting for ${url}: ${detail}`, logs].filter(Boolean).join("\n\n"));
}

function appendBounded(current: string, chunk: string) {
  const combined = current + chunk;
  return combined.length > MAX_LOG_LENGTH ? combined.slice(-MAX_LOG_LENGTH) : combined;
}

export const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function killProcessTree(pid: number, signal: NodeJS.Signals) {
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
      return;
    }
    process.kill(-pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      // already exited
    }
  }
}

function waitForExit(child: ChildProcess, timeoutMs: number) {
  if (child.exitCode !== null || child.signalCode) {
    return Promise.resolve(true);
  }

  return new Promise<boolean>((resolve) => {
    const onExit = () => {
      clearTimeout(timer);
      resolve(true);
    };
    const timer = setTimeout(() => {
      child.off("exit", onExit);
      resolve(false);
    }, timeoutMs);
    child.once("exit", onExit);
  });
}

function waitForExitCode(child: ChildProcess) {
  return new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => {
      resolve(code);
    });
  });
}

function stopTrackedSync() {
  for (const child of tracked) {
    if (child.child.pid && child.child.exitCode === null) {
      killProcessTree(child.child.pid, "SIGKILL");
    }
  }
}

process.on("exit", stopTrackedSync);
process.on("SIGINT", () => {
  stopTrackedSync();
  process.exit(1);
});
process.on("SIGTERM", () => {
  stopTrackedSync();
  process.exit(1);
});
