---
"@ionizeio/canvas": patch
---

A web or Android `DataTable` now keeps everything inside it mounted when its container crosses the 640px width where the columns start or stop panning. It used to add or remove its horizontal scroller at that width, so React remounted the header, every row, stateful custom cells, the `emptyMessage`, an open inline editor (swapped for a new field) and a virtualized body (its scroll position lost), on every resize across the width and once on every phone mount, whose first frame is unmeasured. The scroller is now always there on those platforms and panning switches only its styles: while the table fits, its content is exactly the table's width, so the layout is unchanged, nothing scrolls and there is no extra tab stop. The table role now sits on the same node at every width, so the pagination footer follows the table instead of sitting inside it at wider widths. iOS, which collapses to its primary column instead of panning, is unchanged.
