---
"react-router-hono-server": patch
---

Fix `redirect()` and `getPath()` to recognize only a trailing Single Fetch `.data` suffix and correctly normalize `/_.data` for root and trailing-slash routes. Detect suffixes on the original encoded URL so Hono's path decoding does not misclassify encoded dots, suffixes, or underscores.

Thanks @trackoor for reporting this in #320.
