/**
 * Please read this.
 *
 * Queue only works with wrangler dev (npm run build && npm run start)
 */

import { MessageBatch, Queue, R2Bucket } from "@cloudflare/workers-types/experimental";
import { createHonoServer } from "react-router-hono-server/cloudflare";

type Environment = {
  readonly ERROR_QUEUE: Queue<Error>;
  readonly ERROR_BUCKET: R2Bucket;
};

const app = await createHonoServer<{
  Bindings: Environment;
}>({
  configure(app) {
    app.get("/queue", (c) => {
      if (Math.random() < 0.5) {
        return c.text("Queue demo simulated a ... Success! Refresh to retry.");
      }
      throw new Error("Queue demo simulated a ... Failed! Refresh to retry.");
    });

    app.onError(async (err, c) => {
      await c.env.ERROR_QUEUE.send(err);
      return c.text(err.message, { status: 500 });
    });
  },
});

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<Error>, env: Environment) {
    let file = "";
    for (const message of batch.messages) {
      const error = message.body;
      file += error.stack || error.message || String(error);
      file += "\r\n";
    }
    await env.ERROR_BUCKET.put(`errors/${Date.now()}.log`, file);
  },
};
