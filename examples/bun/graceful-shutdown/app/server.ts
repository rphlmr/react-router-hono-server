import { createHonoServer } from "react-router-hono-server/bun";

export default createHonoServer({
  onGracefulShutdown: async () => {
    // Simulate cleanup operations (e.g., closing database connections)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  },
});
