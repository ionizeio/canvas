---
"@ionizeio/canvas": patch
---

Wait for the measured Carousel scrollport before checking real keyboard Tab entry in the browser regression test. Preserve all focus, paging, geometry and accessibility assertions. This corrects the test's initialization precondition without changing component behavior.
