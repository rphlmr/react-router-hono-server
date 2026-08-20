import { once } from "node:events";

import { spawnProcess, waitForHttp } from "../helpers/process";

describe("waitForHttp", () => {
  test.skipIf(process.platform === "win32")(
    "reports when the process exits from a signal before becoming ready",
    async () => {
      const managed = spawnProcess({
        command: process.execPath,
        args: ["-e", "setInterval(() => {}, 1_000)"],
        cwd: process.cwd(),
      });

      try {
        managed.child.kill("SIGTERM");
        await once(managed.child, "exit");

        await expect(
          waitForHttp("http://127.0.0.1:1", {
            logs: () => "captured output",
            process: managed,
          }),
        ).rejects.toThrow(
          "Process exited before http://127.0.0.1:1 became ready.\n\n" +
            "exitCode=null signalCode=SIGTERM\n\ncaptured output",
        );
      } finally {
        await managed.stop();
      }
    },
  );

  test("includes process state and logs when readiness times out", async () => {
    const managed = spawnProcess({
      command: process.execPath,
      args: ["-e", "setInterval(() => {}, 1_000)"],
      cwd: process.cwd(),
    });

    try {
      await expect(
        waitForHttp("http://127.0.0.1:1", {
          interval: 1,
          logs: () => "captured output",
          process: managed,
          timeout: 10,
        }),
      ).rejects.toThrow(
        new RegExp(
          `Timed out waiting for http://127\\.0\\.0\\.1:1:[\\s\\S]+` +
            `pid=${String(managed.child.pid)} exitCode=null signalCode=null\\n\\ncaptured output`,
        ),
      );
    } finally {
      await managed.stop();
    }
  });
});
