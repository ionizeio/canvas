---
"@ionizeio/canvas": patch
---

Three follow-ups to keeping a web or Android `DataTable`'s scroller in place at every width. A table that fits its container again clips columns that cannot fit (fixed column widths wider than the container), as it did before; it had become sideways-scrollable there with no keyboard stop to reach the rest. A height-bounded table that pans on a phone again keeps its pagination footer in view and scrolls its rows inside the bound, as it did before. And while a soft keyboard is up (an open inline editor), a tap on the table's own controls (Save, Cancel, a row's checkbox) now acts on the first tap instead of only dismissing the keyboard. A table that fit never had that delay, since it had no scroller; a panning one did, and now neither does.
