---
"@ionizeio/canvas": patch
---

The docs site takes expo-font 57.0.4, whose web loader compares a font face's family name without the quotes Firefox's CSSOM keeps. With 57.0.1, Firefox found none of the pre-rendered page's seven faces loaded, so right after hydration expo-font moved their style element seven times and declared every face a second time: each face was fetched again and the page's text vanished, then showed in a fallback face, before its own returned. A new cross-engine journey (`e2e/journeys/fonts.e2e.ts`) holds Chromium, Firefox and WebKit to adopting the document's faces. Docs site and tests only; nothing in the package changes.
