---
"@ionizeio/canvas": patch
---

Typography's roles take Dark Factory's dense type scale: bold titles stepping from the display 24 down to the heading 14 (`h1` 20, `h2` 17, `h3` 16, `h4` 15, `h5` 14), body copy at 12.5 medium, `lead` at 14 medium, `small` and `muted` at 11.5 semibold, `tiny` at 11 semibold, and `caption` as Dark Factory's uppercase eyebrow at 10 bold. `code` and `mono` sit at 11.5 and 12 in Geist Mono. Every line height is a whole pixel, so text lays out the same on Android, iOS and the web. The `--role-*` custom properties carry the same values. The props are unchanged; only the sizes and weights they resolve to differ, so screens that use Typography render smaller and bolder titles.
