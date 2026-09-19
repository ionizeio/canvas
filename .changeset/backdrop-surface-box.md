---
"@ionizeio/canvas": patch
---

`Backdrop.Custom` layers can read the surface box they are laid out against:
`useBackdropBox()` returns the surface's measured width and height and the scene's
focus point (null outside a surface). The engine's own particle and gradient layers
were already laid out against that box; a custom layer could only read the window,
which put a scene's bespoke art off the visible area whenever the surface was smaller
than the screen (a documentation stage, a card, a harness column). No change for scenes
that keep reading the window.
