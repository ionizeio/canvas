---
"@ionizeio/canvas": patch
---

Fit hosted overlays above the Android keyboard in full-screen edge-to-edge windows, where adjustResize leaves the root layout unchanged. Intersect native keyboard coordinates with measured bounds so legacy resized windows retain their existing geometry without subtracting the keyboard twice.
