---
"@ionizeio/canvas": patch
---

The manual `npm deprecate` workflow no longer interpolates its `range` and `message` inputs into shell scripts: both reach the scripts through `env`, and the lines that echo them (and the registry's copy of the message in the run summary) are fenced with `stop-commands`, so a line in a message cannot act as a workflow command. The `E2E soak` workflow's spec and Playwright-version checks become anchored patterns and print a rejected value shell-quoted. Repository tooling only; nothing in the package changes.
