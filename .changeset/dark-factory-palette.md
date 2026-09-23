---
"@ionizeio/canvas": minor
---

Minor because it adds public API: `ColorTokens` gains optional translucent roles, with matching `--*` custom properties in `styles/canvas.css`: the soft washes `primary-soft`, `success-soft`, `warning-soft` and `destructive-soft`, the text-field fill `field-fill`, the modal backdrop `scrim`, the shadow tint `shade`, and the inverse surface pair `inverse` and `inverse-foreground`. Every modal backdrop (Dialog, AlertDialog, ActionSheet, Drawer) now dims the page with `scrim` when the theme carries it, and keeps its former black dim when a custom token map omits it.

The default colors are now Dark Factory's, in light and dark, on every platform: a lavender-tinted page with white cards and indigo-gray ink in light, deep indigo surfaces in dark, `primary` in Dark Factory's violet (selection, links, focus) and `action` in its green (the primary Button and the split button's action). Each role is a Dark Factory value or a recorded rule over one (`tools/darkfactory/derive-tokens.ts`), solved to the kit's contrast floors where the raw value falls short; `bun run check-df` replaces the Riskora Figma parity check. The eight chart series are new, anchored on Dark Factory's hues and ordered so every neighbouring pair stays distinct for colorblind readers. Avatar initials take the better of white and near-black on their identity fill, so they keep 4.5:1 on the new series.

`brandColors` and the `--orb-*` custom properties are deprecated: nothing in the kit reads them, and they keep their former values until a major removes them.
