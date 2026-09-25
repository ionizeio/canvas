---
"@ionizeio/canvas": patch
---

The end-to-end suite's `gotoDocs` now says what its paint check saw when it gives up: a page read in the wrong look reports how many readings it took and the last one, and a page whose first evaluation never returned says it was never read, instead of both reporting that the page "never painted". Tests only; nothing in the package changes.
