import { type DrizzleD1Database, drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { createHonoServer } from "react-router-hono-server/cloudflare";

import * as schema from "~/database/schema";

type Bindings = {
  db: DrizzleD1Database<typeof schema>;
};

const app = new Hono<{ Bindings: Bindings }>();

export default await createHonoServer({
  app,
  getLoadContext(c) {
    const db = drizzle(c.env.DB, { schema });
    return { db };
  },
});

declare module "react-router" {
  interface AppLoadContext extends Bindings {}
}
