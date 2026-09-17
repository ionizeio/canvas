---
"@ionizeio/canvas": patch
---

Preserve the Switch track's measured native host across solid and glass changes
so its rounded background and thumb coordinate space survive material updates.
Keep the segmented ButtonGroup coordinate host stable for the same reason,
including when it has no test ID. Preserve control state and layout instead
of replacing either host.
