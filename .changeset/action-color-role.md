---
"@ionizeio/canvas": minor
---

Minor because it adds public API: `ColorTokens` gains the optional `action` and `action-foreground` roles, the call-to-action fill and its ink. `<ThemeProvider tokens={{ action }}>` now recolors the primary Button (its fill, label, loading spinner and glass puck) and the split button's action half and chevron without touching `primary`, which keeps what is selected, checked, current, linked or focused. Omitted, actions paint with `primary` exactly as before, and a `tokens={{ primary }}` rebrand still repaints actions with its primary pair. This is the seam the Dark Factory palette uses to draw actions green and selection violet.
