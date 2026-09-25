---
"@ionizeio/canvas": patch
---

The manual `E2E soak` workflow gains a `trace` input (`retain-on-failure`, the suite's own setting, or `off`), so a soak can tell whether the screencast a Playwright trace records takes part in a failure. Repository tooling only; nothing in the package changes.
