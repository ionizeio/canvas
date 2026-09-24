---
"@ionizeio/canvas": patch
---

The repository gains a manual `E2E soak` workflow that replays an end-to-end spec in shard order, several passes per lane on parallel Linux runners, to reproduce a failure CI meets only rarely, and an opt-in hang probe (`E2E_HANG_PROBE_MS`, armed by the soak) that attaches the renderer's state, per-process CPU and a Chromium compositor trace to a test that is still running past the threshold. It exists to find the root cause of the glass material captures that intermittently hang in Chromium's `Page.captureScreenshot` on CI. Repository tooling only; nothing in the package changes.
