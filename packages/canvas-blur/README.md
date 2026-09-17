# Canvas Blur

Optional native Android capture and frost renderer for `@ionizeio/canvas`.
Install `@ionizeio/canvas-blur` 0.1.0 or newer alongside Canvas in an Expo SDK 57 app, then rebuild
the native app so Expo autolinking includes the Android module. Expo Go cannot load
this custom module. Canvas remains installable without this package.

The native renderer uses Android 12 (API 31) RenderNode and RenderEffect. Earlier
Android versions expose `available: false`; Canvas chooses another supported
material or its complete solid appearance. This package has no iOS native module.

`PaintHost` preserves React Native's original background, border, corners and
overflow. Its content `CaptureHost` records an eligible backdrop only while
`captureEnabled` is true and a live frost consumer retains it. The visible
content recording stays separate from the sampled recording, which adds only
the paint owner's native background drawable. This keeps translucent fills
single-painted and excludes sibling overlay content from the sampled backdrop.
A direct decorative `CaptureHost` records its own paint without a parent underlay.

`FrostView` references that host through `targetRef` and accepts `intensity` and
`tint`. Sampling uses native matrices for ancestor transforms, scrolling and
separate-window offsets. Ancestor capture targets are rejected. Idle and detached
hosts release their capture recordings, while their foreground children remain
mounted. `getCaptureStats()` supplies lifecycle diagnostics for native verification.

Canvas requires the complete `PaintHost`, `CaptureHost` and `FrostView` integration
before activating this renderer. A missing or partial integration selects the
complete solid appearance for surfaces that require this native capture path.
Canvas owns role selection and capture coordination; application components should
normally consume Canvas surfaces instead of coordinating these primitives directly.

Development builds compile with `bun run build:blur` from the repository root.
The docs app links the built package and autolinks `../packages`; it does not pin
a local directory dependency in its package manifest.
