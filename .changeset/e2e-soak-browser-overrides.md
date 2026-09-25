---
"@ionizeio/canvas": patch
---

The manual `E2E soak` workflow can now run full Chromium in its new headless mode (`channel`) or add Chromium switches (`chromium_args`) through its own `playwright.soak.config.ts`, which layers them over the suite's configuration for the Chromium projects only, and soaks no longer queue behind each other, so two hypotheses about one commit run side by side. Repository tooling only; nothing in the package changes.
