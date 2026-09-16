---
"@ionizeio/canvas": patch
---

Grid tiles are equal-height and the grid spans its parent.

The Grid root now carries the FILL nature (`width:"100%"`, sharing a Row with
hugging siblings), so it reaches its parent's edges instead of measuring
whatever width its own cells produced from the pre-measurement guess in a
centering parent. Its cells stretch to the height of the row they wrapped
onto, and a cell publishes the new `bounded` layout-axis fact
(`GRID_CELL_AXIS` in `src/style/sizing.ts`), which a Card reads to grow to the
row's height without `grow`: a row of cards shares a flush bottom edge however
unevenly their content runs, CSS Grid's default `align-items: stretch`. A
`GridItem` fills its cell the same way, so a wide hero card matches its
neighbours. DashboardGrid cells publish the same fact, so a Card widget fills
its tile without being asked; a field, a chart, or a hug component keeps its
own height in either grid. Card's explicit `grow` is unchanged elsewhere.
