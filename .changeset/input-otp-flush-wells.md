---
"@ionizeio/canvas": patch
---

Under glass, each InputOTP cell's clear well now fills the cell inside its border, so the well's rim sits flush inside the violet focus ring, as an Input's does. Before, the rim sat a pixel further in, so the focused cell read as a ring, a gap and a second line, and every resting well was 2px smaller than an Input's. Where the glass material falls back to the solid look (Android with no blur target, for one), each cell now draws a single outline instead of two. The CSS hand-off's `--p-otp-caret-blink` turns off under `prefers-reduced-motion`, as the kit's caret already does.
