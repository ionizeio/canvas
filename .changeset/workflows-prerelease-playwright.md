---
"@ionizeio/canvas": patch
---

The manual `E2E soak` workflow's `playwright` input takes a prerelease too (e.g. `1.64.0-alpha-2026-09-25`), swaps both `@playwright/test` and `playwright` so the CLI that installs and launches the browsers matches the runner, and checks the version it reports. The `Visual baselines` workflow gains the same input, so an upgrade's Linux baselines can be minted before the upgrade lands. Repository tooling only; nothing in the package changes.
