---
"@ionizeio/canvas": patch
---

The docs dev server no longer runs out of memory after 50 to 100 pages. Every document it renders re-evaluates the web server bundle, and expo-updates, imported by the hidden diagnostics route, subscribed at evaluation time to a module object Expo keeps process-wide, so each render left a listener that pinned the whole previous bundle (about 20 MB). The diagnostics route now reads the update identity through a native-only module, so expo-updates stays out of the web bundles, and a docs test keeps it there. No change to the package's behaviour.
