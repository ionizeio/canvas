---
"@ionizeio/canvas": patch
---

Measure safe-area insets inside Drawer and ActionSheet native Modal windows, keeping content clear of the status bar, notch and home indicator. Apply only the insets for the edges each panel touches. The optional safe-area peer remains optional; without it the existing plain-view fallback is preserved. When an app has no root safe-area provider, modal content waits for its first native inset measurement before mounting.
