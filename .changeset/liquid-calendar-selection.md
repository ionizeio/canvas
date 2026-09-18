---
"@ionizeio/canvas": patch
---

Move the Calendar's selected day as one measured liquid surface under glass: it travels between the days of one month through the grid and along the week strip (a diagonal move stretches along both axes), while the numbers, event dots, today's tint and the pressed state stay fixed; a month, view, density or cell-size change re-measures and resets it in place instead of travelling between months. In `range` mode the start and end are independent surfaces (the start travels on a restart, the end appears in place on completion and withdraws on a restart, a one-day range keeps both on one cell). The day peek and the hover card open and close on the liquid popup material and stay mounted through their exits. Reduce Motion selects the final bounds at once; solid mode keeps the skin's own filled day.
