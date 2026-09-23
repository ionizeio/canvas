---
"@ionizeio/canvas": patch
---

The glass material host and its runtime are split per platform: Android gets its own files (the canvas-blur capture and expo-blur frost), the web keeps the CSS frost and the Chromium lens, and each platform resolves its own glass tints. Nothing renders differently; an Android app no longer bundles the web lens (the Android Button fixture drops from 8.7 KB to 7.1 KB gzip).
