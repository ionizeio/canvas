---
"@ionizeio/canvas": patch
---

The manual `E2E soak` workflow can drop the suite's own Chromium switches (`pacing: chromium-default`) and soak another `@playwright/test` release installed on the runner only (`playwright`), to tell whether a newer Chromium still needs `--disable-frame-rate-limit`. Repository tooling only; nothing in the package changes.
