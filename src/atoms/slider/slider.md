# Slider

Drag (or tap) along a track to pick a value in a range. Controlled by `value`, bounded by `min` / `max`, and snapped to `step`. Like the other input-like controls, a slider fills the parent it is given; a step of its own (`xs`, `lg`, …, with `start` to pin it to the leading edge) or a Container step sets its measure.

Pass `ref` to access the interactive adjustable track, including when a header is shown. Use `useRef<ComponentRef<typeof Slider>>(null)` from React, or `useRef<View>(null)` with React Native's `View` type. Object and callback refs are supported and detach on unmount. Calling `ref.current?.focus()` or `.blur()` delegates to the host without activating the control. Browser focus is supported; native focus depends on the platform and React Native version, and is separate from accessibility focus.

Name the setting with string `children`, or pass `accessibilityLabel` when the visible title is omitted or contains rich content.

## Usage

```tsx
<Slider accessibilityLabel="Volume" defaultValue={60} />
```

On iOS 26 the handle is a real Apple Liquid Glass control: a bright knob that springs up as you drag, with the material's edge-lensing and specular showing on a physical device (the OS "transforms controls into liquid glass during interaction"). This is automatic from the glass surface, the platform default there, so there is no prop to set; under a solid surface, Reduce Transparency, or Increase Contrast the handle falls back to a solid knob. The Android and web handles keep their own native look.

## Variants

### With label

```tsx
<Slider defaultValue={65}>Volume</Slider>
```

### With description

```tsx
<Slider defaultValue={40} description="Applies to alert sounds.">Volume</Slider>
```

### Small

```tsx
<Slider small accessibilityLabel="Volume" defaultValue={40} />
```

### Large

```tsx
<Slider large accessibilityLabel="Volume" defaultValue={75} />
```

### Stepped

```tsx
<Slider accessibilityLabel="Playback speed" defaultValue={6} max={10} step={2} />
```

### Disabled

```tsx
<Slider disabled accessibilityLabel="Volume" defaultValue={30} />
```

### Measure

```tsx
<Column>
  <Slider xs start defaultValue={40}>xs step, pinned to the start (320)</Slider>
  <Slider lg start defaultValue={40}>lg step, pinned to the start (512)</Slider>
  <Container lg start><Slider defaultValue={40}>Bare, in an lg Container: fills it (512)</Slider></Container>
</Column>
```

## Do & Don't

### Range

**Do** — Give the track room to breathe so the thumb has a clear travel path and the value reads at a glance. Pass the label as `children`; the slider owns the title above the rail.

```tsx
<Slider defaultValue={65} min={0} max={100}>Volume</Slider>
```

**Don't** — Cramming the slider into a tiny width leaves no travel, so the thumb can barely move and the value is hard to set.

```tsx
<View style={{ width: 64 }}>
  <Slider accessibilityLabel="Volume" defaultValue={65} min={0} max={100} />
</View>
```

### Bounds

**Do** — Pair the slider with its current value so the number is explicit, not just inferred from the thumb position. `showValue` renders the live readout above the track.

```tsx
<Slider showValue defaultValue={48} min={0} max={100}>Volume</Slider>
```

**Don't** — A slider with no readout and no visible label leaves users guessing what the value is and what it controls.

```tsx
<Slider accessibilityLabel="Volume" defaultValue={48} min={0} max={100} />
```

### State

**Do** — Use the disabled state for values the user cannot change yet; it dims clearly so it does not look interactive.

```tsx
<Slider disabled accessibilityLabel="Volume" defaultValue={20} min={0} max={100} />
```

**Don't** — Don't fake a disabled slider with a faint inline track; the real `disabled` prop also blocks the gesture and sets accessibility state.

```tsx
<View style={{ width: 320, maxWidth: "100%", height: 20, justifyContent: "center" }}>
  <View style={{ width: "100%", height: 4, borderRadius: 999, backgroundColor: tokens.muted }}>
    <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "20%", borderRadius: 999, backgroundColor: alpha(tokens.primary, 0.4) }} />
  </View>
</View>
```
