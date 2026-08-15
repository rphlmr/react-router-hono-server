import { spawn } from "node:child_process";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const artifactDirectory = path.join(root, "out", "test-artifacts");

await rm(artifactDirectory, { recursive: true, force: true });
await mkdir(artifactDirectory, { recursive: true });
await run("pnpm", ["build"]);
await run("pnpm", ["pack", "--pack-destination", artifactDirectory]);
if (process.env.RRHS_LATEST_COMPATIBLE === "1") {
  await writeFile(
    path.join(artifactDirectory, "latest-versions.json"),
    `${JSON.stringify(await resolveLatestCompatibleVersions(), null, 2)}\n`,
  );
}

const artifacts = (await readdir(artifactDirectory)).filter((file) => file.endsWith(".tgz"));
if (artifacts.length !== 1) {
  throw new Error(`Expected one package artifact, found ${artifacts.length}.`);
}

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

async function resolveLatestCompatibleVersions() {
  const supportedMajors = {
    "@cloudflare/vite-plugin": 1,
    "@hono/node-server": 2,
    "@react-router/dev": 8,
    "@react-router/fs-routes": 8,
    "@react-router/node": 8,
    hono: 4,
    react: 19,
    "react-dom": 19,
    "react-router": 8,
    vite: 8,
    wrangler: 4,
  };
  return Object.fromEntries(
    await Promise.all(
      Object.entries(supportedMajors).map(async ([name, major]) => {
        const output = await capture("pnpm", ["view", `${name}@${major}`, "version", "--json"]);
        const versions = JSON.parse(output);
        return [name, Array.isArray(versions) ? versions.at(-1) : versions];
      }),
    ),
  );
}

function capture(command: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: ["ignore", "pipe", "inherit"] });
    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}
