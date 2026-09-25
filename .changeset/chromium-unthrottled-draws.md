---
"@ionizeio/canvas": patch
---

The e2e suite's intermittent 60 s timeouts in the glass material captures are fixed at their cause. On the CI runner, where the software compositor takes about a second per frame of the glass pages' backdrop blurs, Chromium's renderer sometimes held its next draw for a display acknowledgement that never came, and the whole frame pipeline went to sleep for good. Every Chromium project now launches with `--disable-frame-rate-limit`, which lifts that wait: the E2E soak measured 8 hangs in 128 passes of the material spec without it and 0 in 128 with it, with the Linux screenshot baselines unchanged. The four-frame drain added before captures (5da48254) is removed, since the soak showed it did not prevent the stall; the real-frame waits in `settledBox` and the overlay-state resize audit stay, because `page.clock` fakes the page's own `requestAnimationFrame`. Repository tests only; nothing in the package changes.
