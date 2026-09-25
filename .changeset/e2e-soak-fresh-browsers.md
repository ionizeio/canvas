---
"@ionizeio/canvas": patch
---

The manual `E2E soak` workflow gains `browsers: fresh`, which runs each pass as its own Playwright run so every pass meets its first tests in newly launched browsers, keeping only the failing passes' reports; `passes` and `hang_probe_ms` are checked to ranges a loop and a timer can hold. The hang probe also samples WebKit's WPE and MiniBrowser processes and no longer throws when a process exits mid-sample, and `gotoDocs` reports a paint check whose evaluation was still out at the deadline as "stopped answering" even after earlier readings. Repository tooling and tests only; nothing in the package changes.
