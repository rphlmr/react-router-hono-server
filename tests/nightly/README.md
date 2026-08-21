# Nightly runtime containers

Each adapter has a repository-owned image that reproduces its job from
`.github/workflows/nightly.yaml`. Run an image from the repository root:

| Adapter            | Command                                  |
| ------------------ | ---------------------------------------- |
| Node.js            | `vp run test:node:nightly:docker`       |
| Bun                | `vp run test:bun:nightly:docker`        |
| Deno               | `vp run test:deno:nightly:docker`       |
| Cloudflare Workers | `vp run test:cloudflare:nightly:docker` |
| AWS Lambda         | `vp run test:aws:nightly:docker`        |

All images mount the repository read-only and copy it into an isolated
worktree before updating dependencies. The adapter directories document their
runtime-specific images and inspection commands.
