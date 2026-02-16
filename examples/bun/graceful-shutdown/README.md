# Bun Graceful Shutdown Example

This example demonstrates the graceful shutdown feature of the Bun adapter for `react-router-hono-server`.

## Features

- ✅ Graceful shutdown hook (`onGracefulShutdown`)
- ✅ Signal handler setup (SIGTERM, SIGINT)
- ✅ Clean resource cleanup before process exit
- ✅ Production-ready pattern

## How It Works

### 1. Server Configuration

In [app/server.ts](./app/server.ts), simply configure the server with a graceful shutdown callback:

```ts
export default createHonoServer({
  onGracefulShutdown: async () => {
    console.log('🧹 Running cleanup tasks...');
    // Your cleanup logic here (close DB connections, etc.)
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Cleanup complete!');
  },
});
```

**That's it!** The Bun adapter automatically registers SIGTERM and SIGINT signal handlers when you provide an `onGracefulShutdown` callback. No additional setup needed.

### 2. Shutdown Flow

When you send a SIGTERM or SIGINT signal (e.g., Ctrl+C):

1. Automatic signal handler is triggered
2. Server stops accepting new connections
3. Existing inflight requests complete
4. `onGracefulShutdown` callback executes
5. Process exits cleanly

## Running the Example

### Development

```bash
bun install
bun run dev
```

### Production

```bash
bun run build
bun run start
```

Then press `Ctrl+C` to test the graceful shutdown. You should see:

```
📡 Received SIGINT, shutting down gracefully...
Initiating graceful shutdown...
Server stopped, all requests completed
🧹 Running cleanup tasks...
✅ Cleanup complete!
Cleanup callback completed
👋 Shutdown complete
```

## Key Files

- [app/server.ts](./app/server.ts) - Server configuration with graceful shutdown callback
- [app/routes/_index.tsx](./app/routes/_index.tsx) - Demo page explaining the feature

## Notes

- The `onGracefulShutdown` callback only runs in **production mode**
- During development, the callback is ignored
- Signal handlers (SIGTERM, SIGINT) are automatically registered in production
- The server waits indefinitely for inflight connections to complete

## Deployment

When deploying to production environments (Docker, Kubernetes, etc.), ensure:

1. Your container/orchestrator sends SIGTERM for graceful shutdown
2. Allow sufficient time for graceful shutdown before force kill
3. Configure health checks to stop sending traffic during shutdown

### Docker Example

```dockerfile
FROM oven/bun:latest
WORKDIR /app
COPY . .
RUN bun install
RUN bun run build
CMD ["bun", "./scripts/start.ts"]

# Important: Use exec form to handle signals properly
# OR use: ENTRYPOINT ["bun", "./scripts/start.ts"]
```

### Kubernetes Example

```yaml
spec:
  containers:
  - name: app
    lifecycle:
      preStop:
        exec:
          command: ["/bin/sh", "-c", "sleep 5"]
  terminationGracePeriodSeconds: 30
```

This gives the app time to finish graceful shutdown before Kubernetes force-kills the pod.
