---
"@ionizeio/canvas": patch
---

The last status colors move onto the theme's roles through `statusColors`: every menu (the web Dropdown and every RowMenu, which painted a fixed palette red) draws a destructive row in the `destructive-text` role like the native Dropdowns already did, an ActionPanel's danger title takes the same error ink, a Stats or breakdown delta reads in the success color or the error ink, and the charts' status marks (the success and destructive bars and series, the waterfall's rises and falls, the status strip, the Gauge, ProgressRing and Sparkline tones) take the solid status colors, with MetricBreakdown's rate readout in the tone's ink. The CSS hand-off's `--p-menu-destructive`, `--panel-danger`, `--delta-up` and `--delta-down` now reference those roles instead of holding fixed values, so they follow the palette and any override. No prop changes.
