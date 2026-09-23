---
"@ionizeio/canvas": patch
---

Keyboard focus rings take the palette's `ring` colour and sit 2px off the control: the kit's `Pressable` hands the colour and offset to the browser's own ring (Chromium paints it; Firefox and Safari keep their own ring colour unless the page loads `styles/canvas.css`, whose new `:focus-visible` rule draws a solid 2px `--ring` ring everywhere). Controls that hid the ring without painting a focus state of their own now show it: the Accordion and Collapsible headers (drawn inside the header when the group sits in a card or the iOS inset group), the Calendar's day cells, chevrons and event blocks, the iOS-skin Pagination, Tabs, Navbar and Sidebar rows, and the drag handle.
