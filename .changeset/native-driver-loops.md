---
"@ionizeio/canvas": minor
---

Run every looping animation on the native driver on iOS and Android, and add the cycle shapers that make that possible.

New public API: `thereAndBack(easing)`, `holdThen(hold, easing)` and `keyframes(points)` in the motion helpers turn one `Animated.timing` into an out-and-back pulse, a hold followed by a sweep, or a keyframed schedule, so a loop can be a single native timing (React Native refuses an `Animated.sequence` inside a native loop and `Animated.delay` hardcodes the JS driver).

The Backdrop clock, Spinner, the indeterminate Progress sweep, the Skeleton shimmer and the InputOTP caret now pass `useNativeDriver: supportsNativeDriver` (native off-thread, the JS driver on web). Under the New Architecture a JS-driven frame is a Fabric shadow-tree commit per animated view whose cost scales with the whole tree, so the JS-driven Backdrop alone saturated the JS thread of an idle screen (150% CPU and rAF near 3 frames per second on the iPhone 17 Pro simulator); natively driven it idles at a few percent with rAF at 60 frames per second. The Backdrop clock resumes a stopped flight from its wall-clock phase, since a natively driven value cannot report its position to JS. The channel shapes (a linear flight, an out-and-back twinkle and breath, a parked-then-sweep event) are unchanged.
