---
"@ionizeio/canvas": patch
---

The e2e configuration's note on `--disable-frame-rate-limit` now states what the soak measured on the shipped configuration: 1 hang in 320 passes of the material spec with the switch, against 8 in 128 without it, so the switch mitigates the Chromium stall rather than removing it. Repository tests only; nothing in the package changes.
