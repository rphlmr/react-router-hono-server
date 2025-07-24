# react-router-hono-server

## 2.17.0-next.0

### Minor Changes

- 8eae0a7: ## Node and Bun
  - Lock Hono Node Server version to temporarily fix defer issue.
    - Bundle `@hono/node-server` and `@hono/vite-dev-server` to make sure the correct version is used. This will be reverted once the issue is resolved in Hono.
  - Improve performance by awaiting the import of React Router build before starting the server. (instead of awaiting it in the first request)
    - If your server bundle is large, import can take a while, so this change will improve the first request performance since it will be done before the server starts listening.
