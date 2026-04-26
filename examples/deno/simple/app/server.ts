import { createHonoServer } from "react-router-hono-server/deno";
import { Hono } from "hono";
import { getRuntimeKey } from "hono/adapter";

const app = new Hono()

app.get('/runtime', (c) => {
  return c.json({
    runtime: getRuntimeKey()
  })
})

Deno.cron('example', '* * * * *', () => {
  console.log("example cron")
})

export default createHonoServer({
  app
});
