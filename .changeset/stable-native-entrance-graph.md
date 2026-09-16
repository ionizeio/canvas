---
"@ionizeio/canvas": patch
---

Keep native glass overlays visible when their entrance opens by retaining one animated transform graph and keeping ancestor opacity at one. Hold an unmeasured anchored surface outside hit testing and accessibility without remounting its content, preserve corner placement on resize, and coordinate descendant focus callbacks with inherited entrance readiness. Centered panels remain ready without requiring their own size event, and reduced motion settles at the final frame.

Popover preserves the original opener while waiting for layout, then moves focus into its existing panel. Refitting the same panel retains its focus session, and closing restores focus through the existing controller.

Native pixel and interaction verification used React Native 0.86. The declared React Native 0.74 floor is covered by public-API source review, types and native bundles, not a device run.
