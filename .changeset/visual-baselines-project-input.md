---
"@ionizeio/canvas": patch
---

The manual `Visual baselines` workflow no longer interpolates its `project` input into a shell script: the value reaches the script through `env` and must exactly name a project defined in `playwright.config.ts` (read from the config itself), and anything else fails with an error that lists the projects. Repository tooling only; nothing in the package changes.
