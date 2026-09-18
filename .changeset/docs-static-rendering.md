---
"@ionizeio/canvas": patch
---

Pre-render every docs page (the web export is static) so a page paints its content
before its bundle runs, with the bundle fetched early and executed after the first
contentful paint. Each page carries its own title and canonical link. Two kit changes
make server rendering faithful: the glass material resolves to frost for a server
render and the hydration render (the Chromium lens lands in the commit after), and a
hosted Backdrop paints its surface inline in server markup until the host takes the
claim after hydration, so a pre-rendered page ships its floor.
