---
"@ionizeio/canvas": minor
---

Add `Video`, an atom that plays a clip with an optional poster. Without `controls` it is an inline player: the picture is one play and pause control, with a play emblem while paused and a spinner while loading. With `controls`, iOS and Android show their own player controls (AVKit and Media3) and the web shows the kit's control bar under the picture: play and pause, elapsed time, a seek slider, the length, mute and full screen. Fit is a boolean axis (`contain`, the default, `cover`, `stretch`), playback takes `autoplay` (skipped when the system asks to reduce motion), `loop` and `muted`, and the frame takes `aspectRatio` and `radius`.

Playback runs through `expo-video`, a new OPTIONAL peer loaded like `react-native-qrcode-svg`: apps that never render `Video` need nothing new; without the peer, `Video` keeps its size and poster in a labeled frame and warns once in development.

Minor because it adds public API: the `Video` component and its `VideoProps`, `VideoSource` and `VideoRadius` types.
