---
"@ionizeio/canvas": patch
---

Handle iOS first-use app-link confirmation in native smoke checks and verify Command text entry without relying on an inaccurate iOS focused attribute. Require the last Command result to lie above its footer before tapping. Record actual keyboard events and overlay coordinates, and exercise Drawer input and ActionSheet action/cancel hit targets for native safe-area acceptance.
