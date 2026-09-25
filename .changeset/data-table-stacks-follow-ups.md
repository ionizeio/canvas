---
"@ionizeio/canvas": patch
---

Follow-ups to `DataTable stacks`. A stacked row's selection box and row actions now center on its first line of cell text, as the kit's labelled controls do; on the web they sat about 10 px above it. A stacked cell whose column has no label (a trailing menu column) no longer carries an empty label above its content. The Android skin's stacked label is the web's caption label, since Material 3 has no data table of its own. The DataTable docs now say that the iOS first-column layout, unlike panning and stacking, drops the later columns' cells below its width and mounts them again when the table widens. The docs' phone-width check now also fails a page whose Props table scrolls sideways inside its own frame, which the page-level check could not see.
