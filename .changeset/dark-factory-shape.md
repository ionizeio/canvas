---
"@ionizeio/canvas": minor
---

Minor because it adds public API: `shape` gains a `tile` corner role (12 on every platform, `--radius-tile` in the hand-off) for KPI cards, stat tiles and icon tiles, tighter than a content card.

The web corners are now Dark Factory's: 8 on rectangular controls (icon buttons, menu rows, nav highlights, pagination tiles), 10 on fields, 12 on menus and popovers, 14 on cards, 18 on dialogs and toasts, 22 on sheets and drawers. iOS and Android keep their platform corners. `--radius-control-ios` now names the pill it always was in the skins (it read 10px), and the Skeleton card placeholder follows the card corner.
