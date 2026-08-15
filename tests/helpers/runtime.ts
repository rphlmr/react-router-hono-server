import { spawnSync } from "node:child_process";

export function hasCommand(command: string) {
  const result = spawnSync(command, ["--version"], {
    stdio: "ignore",
  });
  return result.status === 0;
}
