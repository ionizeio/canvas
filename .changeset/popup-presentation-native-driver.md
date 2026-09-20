---
"@ionizeio/canvas": patch
---

Run the liquid popup presentation (the droplet every glass option list and menu opens from, its travel, overshoot and close, and the Dropdown-class hand-off) on the native animation driver on iOS and Android. The material's frame is now a transform of its resting box plus a uniform corner radius instead of an animated width, height and offset, so the springs no longer commit a shadow tree per animated view per frame: the JS thread is idle between frames and the seed frame's flush costs nothing there. The corner stays exact on the seed shape's shorter side (a capsule at the droplet, the skin's own radius at rest) and follows the scale on the other; a closed pane now leaves on the animation frame after it has handed the pill back, so the trigger's glass is painting before the pane uncovers it. The web keeps the same graph on its JS driver; solid mode and Reduce Motion are unchanged.
