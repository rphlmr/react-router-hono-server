import { spawnSync } from "node:child_process";

export function hasCommand(command: string) {
  const result = spawnSync(command, ["--version"], {
    stdio: "ignore",
  });
  return result.status === 0;
}

export function requireCommand(command: string, runtime = command) {
  if (!hasCommand(command)) {
    throw new Error(`${runtime} is required for this suite but ${command} is not available.`);
  }
}
