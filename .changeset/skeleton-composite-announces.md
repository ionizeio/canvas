---
"@ionizeio/canvas": patch
---

The composite Skeleton scaffolds (`card`, `list`, `table`) now announce their loading state to assistive technology once, the way the single shapes already do. Their wrapper kept the `progressbar` role and label but also carried the flags meant to hide the inner muted blocks, and react-native-web forwards only the `aria-hidden` alias, so the wrapper hid its own progressbar and a screen reader never heard that content was loading (Android's `no-hide-descendants` hid the host node the same way). The hide flags now sit on an inner wrapper around the blocks; the outer node keeps the role, the label and the busy state, and the rendered look is unchanged.
