# react-router-hono-server

## 2.24.1

### Patch Changes

- f207d80: chore: 🔨 Update hono and related dependencies. Make hono a peer dep

## 2.24.0

### Minor Changes

- f1f2e3d: chore: 🔨 Update hono dependencies

### Patch Changes

- 1defe62: Add compatibility with environment API being promoted to v8 instead of unstable in React Router

## 2.23.0

### Minor Changes

- 0ccf170: chore: bump hono to v4.11.4 ([#173](https://github.com/rphlmr/react-router-hono-server/issues/173))

## 2.22.0

### Minor Changes

- 179e2ea: Upgrade to latest hono

## 2.21.0

### Minor Changes

- ee2abf2: Add support for React Router 7.8.0 unstable middleware changes

## 2.20.0

### Minor Changes

- 23eac74: make modules imported by the server entry a chunk

## 2.19.0

### Minor Changes

- 9703630: Prevent build import conflicts by splitting imports into chunks
- 9703630: Rollback single file server output (revert to 2.16.0 behavior)

## 2.18.0

### Minor Changes

- dacbc3a: Make Bun use the same entry.server as Node

### Patch Changes

- dacbc3a: Fix wrong peer deps

## 2.17.0

### Minor Changes

- 482a557: Upgrade hono dependencies
- 8eae0a7: ## Node and Bun
  - Lock Hono Node Server version to temporarily fix defer issue.
    - Bundle `@hono/node-server` and `@hono/vite-dev-server` to make sure the correct version is used. This will be reverted once the issue is resolved in Hono.
  - Improve performance by awaiting the import of React Router build before starting the server. (instead of awaiting it in the first request)
    - If your server bundle is large, import can take a while, so this change will improve the first request performance since it will be done before the server starts listening.

### Patch Changes

- 1a21a8b: remove obsolete build target options from reactRouterHonoServer
- 9bf869b: Statically import RR build

## 2.17.0-next.2

### Patch Changes

- 1a21a8b: remove obsolete build target options from reactRouterHonoServer

## 2.17.0-next.1

### Patch Changes

- 9bf869b: Statically import RR build

## 2.17.0-next.0

### Minor Changes

- 8eae0a7: ## Node and Bun
  - Lock Hono Node Server version to temporarily fix defer issue.
    - Bundle `@hono/node-server` and `@hono/vite-dev-server` to make sure the correct version is used. This will be reverted once the issue is resolved in Hono.
  - Improve performance by awaiting the import of React Router build before starting the server. (instead of awaiting it in the first request)
    - If your server bundle is large, import can take a while, so this change will improve the first request performance since it will be done before the server starts listening.
