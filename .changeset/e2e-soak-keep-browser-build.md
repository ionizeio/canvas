---
"@ionizeio/canvas": patch
---

A lane of the `E2E soak` that keeps a crashed browser's core dump (`crash_dumps: on`) now also keeps the Playwright browser build that wrote it, compressed beside the core: a core reads only against its exact binaries, and Playwright's are stripped, so naming its frames later takes those files and the report's module offsets. Repository tooling only; nothing in the package changes.
