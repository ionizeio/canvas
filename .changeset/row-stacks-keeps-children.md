---
"@ionizeio/canvas": patch
---

A `Row stacks` whose children carry a `span` now keeps every child mounted when it crosses its breakpoint. It used to drop the span cells and re-key its children as it stacked, so React remounted everything inside: a field lost its text and focus when a window was resized across the breakpoint, and on a phone the whole row remounted right after hydration, when it switched from the server's desktop layout. The stacked Row keeps its cells and drops only their width, which is how Grid already behaves, so the stacked layout looks the same as before.
