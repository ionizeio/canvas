---
"@ionizeio/canvas": patch
---

The docs site keeps a photo-bearing example mounted when its preview re-renders. The Playground and the Don't previews rebuild their example scopes on every render, and the wrapper that resolves the sample photo and clip paths was a new component each time, so every Image, Avatar, Video and other photo-bearing example remounted whenever the stage re-rendered, for instance when its measured width changed. Entering full screen resizes the viewport in Firefox, so the Video's full-screen button put the clip in full screen and the remount took the `<video>` out of the document at once, which ends full screen. Each component is now wrapped once, and `test/docs-photos.test.tsx` holds a rebuilt scope to the same component types and a re-rendered example to one mount. Docs site and tests only; nothing in the package changes.
