---
"@ionizeio/canvas": patch
---

Split the docs web export: one chunk per route and one per component's examples and
prop tables, so a component page ships its own docs instead of every component's. A
hosted Backdrop ships only its floor in server markup; the star field lands after
hydration instead of being drawn at zero size into every pre-rendered page.
