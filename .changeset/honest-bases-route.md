---
"react-router-hono-server": patch
---

## Summary

- Support independent React Router `basename` and Vite `base` URL spaces across development and production.
- Route generated JavaScript and CSS assets according to Vite’s base while preserving document, route-data, and public-directory URL ownership.

## What's changed

### Vite base routing

- **Development server:** Propagate Vite’s configured `base` through the plugin environment and scope Hono’s module, dependency, and asset exclusions to the Vite pathname prefix, including absolute and full-URL bases.
- **Node, Bun, and Deno adapters:** Serve generated assets beneath an absolute pathname base and strip that prefix before resolving files, while preserving user-provided asset rewrite callbacks.
- **Cloudflare adapter:** Match generated assets under an absolute Vite base and remove the pathname prefix before forwarding requests to the asset binding.
- **Shared path handling:** Add classification and normalization for root, absolute, full-URL, and relative Vite bases. Full-URL and relative bases remain externally/Vite-owned rather than creating a fixed server-side mount.
- **Documentation and release metadata:** Document independent `basename`/`base` configuration, runtime-specific asset ownership, and the patch release covering the fix.

## Compatibility

- React Router’s `basename` continues to control documents, route data, and the handler independently from Vite-generated URLs.
- Root-relative behavior remains unchanged; relative bases (`""` and `"./"`) preserve Vite-emitted URLs, and public-directory files remain served from the origin root.
- AWS production continues to leave generated assets externally owned.

## Test coverage

- Added unit coverage for Vite base classification, generated-asset route mapping, prefix stripping, and composition with adapter rewrite callbacks.
- Added integration coverage across development, Node/Bun/Deno production, Cloudflare asset bindings, AWS production, nested and root document basenames, full-URL bases, and relative bases.
- Updated development-plugin tests and fixture preparation to exercise Vite base configuration and generated CSS/asset URLs.

