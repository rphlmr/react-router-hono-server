import { Hono } from "hono";

const API_BASENAME = "/api";

// Create an API Hono app
const api = new Hono();

api.get("/", (c) => {
  return c.json({ message: "Hello from the API" });
});

export { api, API_BASENAME };
