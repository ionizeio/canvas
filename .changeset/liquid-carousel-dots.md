---
"@ionizeio/canvas": patch
---

Move the Carousel's active dot mark as one measured liquid marker under glass: it travels between the dots with stretch, recoil and settle, following the committed slide from a dot press, the arrows, the keyboard, a controlled `index` or a finished swipe, while the dots, their press targets and the slides stay still. The marker is ink like the dots and keeps the skin's own active dot size, a loop back to the first slide travels along the strip, a slide-set change resets it in place, and it is absent wherever the dot strip is. Reduce Motion selects the final bounds at once; solid mode keeps the static dots.
