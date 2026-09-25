---
"@ionizeio/canvas": patch
---

The end-to-end suite runs on Playwright 1.64.0-alpha-2026-09-25 (Chromium 155, Firefox 156 build 1551, WebKit 26.6), pinned exactly with an override that keeps `@axe-core/playwright`'s `playwright-core` peer on the same build. Firefox build 1551 carries the fix for microsoft/playwright#42731: a navigation to a `Cross-Origin-Opener-Policy: same-origin` page, which every docs page is, could drop the page world's execution context event, so a Firefox test's first `page.evaluate` waited forever (about one Firefox test in 8,000 on the E2E soak; none in 44,800 on this build). The committed Linux screenshot baselines hold on Chromium 155. Tests only; nothing in the package changes.
