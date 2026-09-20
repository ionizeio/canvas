# @ionizeio/canvas-blur

## 0.1.0

### Minor Changes

- 8f85af0: Add the optional Android capture renderer @ionizeio/canvas-blur and the Canvas integration for Android 12 or newer. This minor release adds a native material capability without requiring the new package for existing Canvas consumers. The module starts at 0.1.0 and uses Expo SDK 57 native APIs.

### Patch Changes

- 8f85af0: Keep captured backdrops aligned through ancestor scale, rotation, scrolling and separate-window positioning. Observe transform changes without continuous redraw and release both native window observers when the material disconnects.
- 8f85af0: Preserve the original Android host background, borders, corners and overflow while sampling its native paint. Keep visible content separate from sampled paint to avoid doubled translucent fills, and require the complete optional native integration before enabling capture.
- 8f85af0: Gate Android native smoke on the capture module's instrumentation tests using sealed installed production sources and test inputs from the same candidate revision. Preserve JUnit, native test configuration, source identity, and failure logs while keeping generated build output outside the installed package.
- 8f85af0: Refresh separate-window material when retained backdrop content changes without recreating its parent recording. Keep same-window geometry observation passive and remove all source callbacks when capture ends.
