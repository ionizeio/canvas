---
"@ionizeio/canvas": patch
---

The scrolled-overlay e2e check scrolls the materials harness page by setting its scroller's `scrollTop`. It called the scroller's `scrollTo({ top })`, but react-native-web replaces that method with its ScrollView's `scrollTo({ x, y, animated })`, so the call animated the page back to the top and the check's precondition failed in CI. Test-only; nothing in the package changes.
