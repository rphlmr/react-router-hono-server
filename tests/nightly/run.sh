#!/usr/bin/env bash

set -euo pipefail

if [[ ! -f /source/package.json ]]; then
  echo "Mount the repository read-only at /source." >&2
  exit 1
fi

case "${RRHS_NIGHTLY_RUNTIME:-}" in
  aws | bun | cloudflare | deno | node) ;;
  *)
    echo "RRHS_NIGHTLY_RUNTIME must name a supported runtime." >&2
    exit 1
    ;;
esac

tar \
  --exclude=.git \
  --exclude=build \
  --exclude=coverage \
  --exclude=dist \
  --exclude=node_modules \
  --exclude=out \
  -C /source \
  -cf - \
  . | tar -C /worktree -xf -
cd /worktree

if (( $# > 0 )); then
  exec "$@"
fi

export RRHS_LATEST_COMPATIBLE=1

# Vite+, its Vite alias, and Vitest must be upgraded together with `vp migrate`.
mapfile -t dependency_names < <(
  node -p 'const manifest = require("./package.json"); [...Object.keys(manifest.dependencies), ...Object.keys(manifest.devDependencies)].filter((name) => !["typescript", "@types/node", "vite-plus", "vitest", "@vitest/coverage-v8"].includes(name)).join("\n")'
)
mapfile -t peer_dependency_specs < <(
  node -p 'Object.entries(require("./package.json").peerDependencies).map(([name, range]) => name + "@" + range).join("\n")'
)

vp update --latest "${dependency_names[@]}"
vp add --save-dev "${peer_dependency_specs[@]}"
vp run "test:${RRHS_NIGHTLY_RUNTIME}"
