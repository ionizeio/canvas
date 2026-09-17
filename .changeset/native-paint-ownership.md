---
"@ionizeio/canvas": patch
"@ionizeio/canvas-blur": patch
---

Preserve the original Android host background, borders, corners and overflow while sampling its native paint. Keep visible content separate from sampled paint to avoid doubled translucent fills, and require the complete optional native integration before enabling capture.
