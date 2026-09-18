---
"@ionizeio/canvas": patch
---

Move the Sidebar's active row fill as one measured liquid surface under glass: it travels between rows, across sections and through the scroll body with vertical stretch, recoil and settle while icons, labels, badges, `aria-current`, focus and hit targets stay fixed; a row hidden in a closed section withdraws the surface, a collapse or density change resets it in place, Reduce Motion selects the final bounds at once and solid mode keeps the skin's own row fill. GlassSurface gains an internal host ref so a surface can serve as a measurement space.
