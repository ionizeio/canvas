---
"@ionizeio/canvas": patch
---

The `E2E soak` workflow's notes record what its crash capture found: the one Firefox parent-process SIGSEGV it caught in the Firefox journeys is a use-after-free in Playwright's own Firefox patch (the headless compositor widget's draw target, swapped and released on the compositor thread when a window resizes while WebRender's render thread reads it without a lock), which stock Firefox does not have and the docs pages do not cause; the two earlier crashes left no core and are only consistent with it. The notes also say a kept core is safe in the public artifacts only because the soak job holds no secrets. Repository tooling only; nothing in the package changes.
