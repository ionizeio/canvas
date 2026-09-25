---
"@ionizeio/canvas": patch
---

The manual `E2E soak` workflow can replay the cross-engine journey and touch projects (`journeys-chromium`, `journeys-firefox`, `journeys-webkit`, `touch-chromium`, `touch-webkit`), installs only the browser the chosen project runs, and takes the hang probe's delay as an input (`hang_probe_ms`, checked and passed through `env`). The hang probe now reports on Firefox and WebKit too: on Linux what their processes' threads did across a window, whether a new evaluation in the page's own world and one in Playwright's utility world still answer, the document's loading and font state, and whether a screenshot comes back. Repository tooling only; nothing in the package changes.
