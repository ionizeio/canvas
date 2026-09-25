---
"@ionizeio/canvas": patch
---

The e2e hang probe now finishes against a wedged renderer: every step is bounded and recorded, the passive samples (per-process CPU and, on Linux, each renderer and GPU thread's state, wait channel and CPU ticks) come first, a JavaScript stack is taken through the debugger's pause, and no step waits on the renderer to release a DevTools session. Repository tooling only; nothing in the package changes.
