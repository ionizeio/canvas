---
"@ionizeio/canvas": minor
---

Minor because it adds public API: `shadow(level, tokens?)` takes the active tokens and tints the shade by the palette's `shade` role (the call without tokens keeps working and uses the light palette's).

On the web the ladder is now Dark Factory's: each level is cast straight down with a negative spread, so it pools under a surface's lower edge instead of haloing it (sm is DF's tile, the default its card, md its hovered card, lg its popover, xl its dialog, a black top-layer shade on every palette). On iOS and Android each level keeps its platform geometry, retinted from the ink to the palette's shade. Every component now passes its tokens, so shadows follow the palette and the scheme, and the `--shadow-*` properties spell the ladder over `var(--shade)`.
