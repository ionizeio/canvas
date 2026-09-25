---
"@ionizeio/canvas": patch
---

The manual `E2E soak` workflow can now replay another commit (`ref`) and run 4, 8, 12 or 16 parallel lanes (`lanes`, default 8), and soaks of different commits run side by side. A replayed commit older than the hang probe runs without it. Repository tooling only; nothing in the package changes.
