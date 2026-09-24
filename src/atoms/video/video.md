# Video

Plays a clip. Give it a `source` (a `{ uri }`, or a bundled asset from `require`), an optional `poster` shown until the clip's first frame is on screen, and the clip's `aspectRatio` (width over height, 16 / 9 by default): the frame fills its parent's width at that ratio and letterboxes the picture on black. Without `controls` it is an inline player: the whole picture is one play and pause control, a play emblem sits over the paused picture, and a spinner shows while the clip loads. With `controls` each platform shows transport its own way: iOS and Android hand the frame to their own player controls, and the web draws the kit's control bar under the picture, with play and pause, the elapsed time, a seek slider, the length, mute, and full screen. `autoplay` starts a clip once it is ready unless the system asks to reduce motion; browsers autoplay only `muted` clips, and this site's own policy blocks autoplay, so the examples here play on tap. Name every clip with `accessibilityLabel`: its controls are announced as "Play", "Pause", "Seek" and "Mute" followed by that name. Playback runs through the optional `expo-video` peer; without it the frame keeps its size and poster in a labeled frame.

## Usage

```tsx
<Video source={{ uri: "/video-sample.mp4" }} poster={{ uri: "/video-sample.jpg" }} accessibilityLabel="Sample clip" />
```

## Variants

### Controls

```tsx
<Video source={{ uri: "/video-sample.mp4" }} poster={{ uri: "/video-sample.jpg" }} controls radius="xl" accessibilityLabel="Sample clip with controls" />
```

### Cover

```tsx
<Video source={{ uri: "/video-sample.mp4" }} poster={{ uri: "/video-sample.jpg" }} cover aspectRatio={1} radius="lg" accessibilityLabel="Square crop of the sample clip" />
```

### Loop and muted

```tsx
<Video source={{ uri: "/video-sample.mp4" }} poster={{ uri: "/video-sample.jpg" }} loop muted radius="lg" accessibilityLabel="Looping muted sample clip" />
```
