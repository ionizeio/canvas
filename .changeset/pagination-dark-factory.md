---
"@ionizeio/canvas": patch
---

Pagination takes Dark Factory's pager on every platform. The page numbers are bare pills at the Button's heights, the current page is the violet pill, and Previous and Next are hairline circles around chevron icons (the text glyphs are gone, and the arrows follow the reading direction). The rows-per-page trigger is a hairline pill with a chevron, the truncation gap an ellipsis icon, a resting cell takes the instant hover wash on the web, and a disabled pager shows Dark Factory's muted look instead of fading. Neither iOS nor Android ships a pagination control, so the native skins are the web skin, with each platform's own press feedback. Under glass only the current page paints a surface (a brand puck); the other pages and the hairline arrows stay bare. The with-size variant now reads the "Showing X-Y of N" range when `itemCount` is set, as its prop documents. The ButtonGroup split button's Don't example is redrawn in the green call-to-action look.
