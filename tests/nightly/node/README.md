# Node.js nightly container

This image reproduces the Node.js portion of `.github/workflows/nightly.yaml`
with Node.js 24, Vite+, and the Playwright browsers available.

Run it from the repository root:

```sh
vp run test:node:nightly:docker
```

The repository is mounted read-only and copied inside the container before the
nightly dependency updates run. Pass a command after the image name to inspect
the prepared worktree without running the tests:

```sh
docker run --rm -it \
  --mount "type=bind,source=$PWD,target=/source,readonly" \
  react-router-hono-server-nightly-node \
  bash
```
