---
"@ionizeio/canvas": patch
---

Run the Backdrop and the Skeleton shimmer as compositor CSS animations on the web.
react-native-web has no native animated module, so a looping `Animated.View` there
re-renders through React on every animation frame: the docs sky cost one React commit
and about forty inline style writes per frame at idle, enough to saturate the main
thread in an unthrottled browser and starve a Suspense retry. A new loop primitive
(`createLoopChannel`, `LoopView`) binds opacity and transform to a shared periodic
channel through `inputRange` / `outputRange` tracks with a phase offset, rendering the
natively driven interpolation graph on iOS and Android and a react-native-web
`animationKeyframes` animation on the web, with the phase carried in the animation
delay so a remounted surface continues mid-flight. The Backdrop clock's channels are
now `LoopChannel`s (bind bespoke `Backdrop.Custom` art through `LoopView` rather than
through `Animated.interpolate`), the SVG renderer nests twinkle buckets inside their
layer, and the Skeleton shares one shimmer channel across every placeholder on screen.
