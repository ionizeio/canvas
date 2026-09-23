---
"@ionizeio/canvas": patch
---

Web glass is now Dark Factory's plain frost on every browser: each surface paints its layer's tint over a 24px backdrop blur with no saturation shift, edged by a 1px inset hairline, with no refraction and no specular highlight. The Chromium lens (the SVG displacement filter) is removed, so glass renders the same in Chrome, Safari and Firefox. Text-entry fields and other clear surfaces draw an unblurred translucent fill, as Dark Factory's inputs do. The web tints are Dark Factory's (a white 0.52 shell in light, a near-clear shell in dark, denser content and menu panes); iOS Liquid Glass and the Android blur keep their material and tints, and `glassByScheme` keeps its values as the native set. In the CSS hand-off `--glass-lens` and `--glass-illumination` become deprecated aliases and `--surface-backdrop` is `none`.
