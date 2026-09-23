---
"@ionizeio/canvas": minor
---

Adds `hover`, Dark Factory's translucent hover wash, as a color role: the brand violet at 8% (10% in dark) that a hovered row or quiet control washes with, in every palette (`rgba(123, 108, 240, 0.08)` blush, `rgba(63, 127, 224, 0.08)` mint, `rgba(164, 150, 255, 0.1)` dark), as `ColorTokens.hover` and `--hover` in the CSS hand-off. It is translucent, so it reads on any surface and over glass; `accent` stays the same wash composited on `card`, and a token map without the role washes with `accent`. Minor: new public API (a color role and its custom property).
