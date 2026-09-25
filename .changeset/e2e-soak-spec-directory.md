---
"@ionizeio/canvas": patch
---

The manual `E2E soak` workflow's `spec` input also takes a directory under `e2e/` (checked to contain no dots, so never `..`), so a soak can replay a project's whole journey set in the order a shard runs it. Repository tooling only; nothing in the package changes.
