---
"@ionizeio/canvas": patch
---

`FOCUS_RESET`'s notes now say why it names an outline style as well as a zero width: the browser's own focus ring is `auto`, which ignores the width, so `outline-width: 0` alone still draws it in Chromium, Firefox and WebKit wherever the CSS hand-off is not loaded. The repository's focus tests treat an `auto` outline as drawn whatever its width. Comments and tests only; the reset's value does not change.
