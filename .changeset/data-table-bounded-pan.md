---
"@ionizeio/canvas": patch
---

A web or Android `DataTable` narrower than 640 px no longer grows to fit its longest cell on one line. While it panned, nothing bounded the table's width inside its horizontal scroller, so every cell's text stayed on a single line and the longest cell set the width of the whole table: a 1,507-character prop description made the docs' prop table about 9,500 px wide on a phone, and on Android each row split that width by its own content, so short rows pushed their text thousands of pixels to the right. The table is now the scroller's width, or the columns' minimum widths added up when those are wider: the columns share that width and wrap their text, and the table scrolls sideways only when the minimums do not fit, as the documentation already described. Short cells that used to sit on one line inside a panning table now wrap within their column.
