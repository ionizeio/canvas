---
"@ionizeio/canvas": patch
---

The web and iOS Toast take Dark Factory's toast pill: the deep `inverse` fill in every palette and scheme, a pill while it holds one line and the sheet corner once a description wraps, a bold 12.5 px message in the pill's ink, and Dark Factory's toast shadow. The description, action and dismiss take the inks the Android snackbar uses on the same fill, and the intent glyphs the dark scheme's status inks, so every part reads on the pill; iOS keeps its 44 pt touch targets. Android keeps the Material 3 snackbar. `toast({ destructive: true })` from `useToast()` now shows the destructive intent; the provider used to drop it.
