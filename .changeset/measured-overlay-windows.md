---
"@ionizeio/canvas": minor
---

Add explicit `OverlayProvider viewport`, `viewportInsets`, and `separateWindow` options for bounded nested panels, measured header/footer occlusions, and custom native Modal windows. This minor adds public hosting capabilities: content-sized hosts inherit measured window bounds, while native-window hosts start a separate coordinate boundary.

Fit anchored cards above or below their triggers and scroll long content inside the available height. Track resized Android root hosts and iOS keyboard frames, preserve trigger hierarchy while hosted menus open, and exclude touch-dismiss backdrops from keyboard and screen-reader focus. Keep option-list refs and keyboard navigation intact. Preserve Command's search and footer while scrolling results, fit its width to narrow hosts, and focus cards after placement is committed.

Keep pinned-open cards attached to offscreen triggers. Aim the solid iOS Popover pointer using the rendered card width and trigger center, reserve its protrusion, and clamp wide trigger-matched cards to their host.
