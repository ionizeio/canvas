# Backdrop

The engine for a full-screen animated background. Canvas owns the surface, the shared clock, the frame budget and the accessibility ladder; your application owns the scene, composed from `Backdrop.Particles`, `Backdrop.Gradient`, `Backdrop.Shader` and `Backdrop.Custom` layers. The kit deliberately ships no artwork of its own, so the animation belongs to your app: point the same engine at different children and it renders something else entirely.

Layers paint back to front in declaration order. `depth` is the parallax rate: `0` pins a layer to the far field, `1` travels with the flight, and above `1` rushes past in the foreground. `phase` staggers siblings around the cycle so they do not all arrive together.

`twinkle` scintillates a particle field. The bodies are dealt into phase buckets that flare at unrelated moments rather than brightening as one, and the bright ones grow a diffraction glint at the peak, so the effect reads as individual stars catching the light instead of the whole sky breathing.

Mount a single `<BackdropHost>` at your app root and the surface is shared by every `<Backdrop>` beneath it, which keeps one drawing surface alive across navigation instead of one per screen. Without a host a `<Backdrop>` simply renders in place.

**If you are not installing `@shopify/react-native-skia`, add one line to your Metro config.** It is an optional peer used by a future GPU renderer, and Backdrop draws perfectly without it. But Metro resolves `require("...")` at build time and ignores the guarded try/catch around it, so an absent optional peer is a hard bundling failure rather than a graceful runtime fallback. Stub it to an empty module in `metro.config.js`:

```js
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@shopify/react-native-skia") return { type: "empty" };
  return context.resolveRequest(context, moduleName, platform);
};
```

Consumers who do install Skia need no entry, because normal resolution succeeds.

## Usage

```tsx
<View style={{ height: 220 }}>
  <Backdrop>
    <Backdrop.Particles
      field={Array.from({ length: 90 }, (_, i) => ({
        x: ((i * 37) % 101) / 101,
        y: ((i * 61) % 97) / 97,
        r: 0.6 + ((i * 13) % 7) / 4,
        a: 0.3 + ((i * 7) % 10) / 14,
      }))}
    />
  </Backdrop>
</View>
```

## Variants

### Calm

```tsx
<View style={{ height: 220 }}>
  <Backdrop calm>
    <Backdrop.Particles
      field={Array.from({ length: 70 }, (_, i) => ({ x: ((i * 29) % 97) / 97, y: ((i * 53) % 89) / 89, r: 0.7 + ((i * 5) % 6) / 4, a: 0.35 + ((i * 9) % 10) / 15 }))}
    />
  </Backdrop>
</View>
```

### Energetic

```tsx
<View style={{ height: 220 }}>
  <Backdrop energetic>
    <Backdrop.Particles
      field={Array.from({ length: 70 }, (_, i) => ({ x: ((i * 29) % 97) / 97, y: ((i * 53) % 89) / 89, r: 0.7 + ((i * 5) % 6) / 4, a: 0.35 + ((i * 9) % 10) / 15 }))}
    />
  </Backdrop>
</View>
```

### Sparse

```tsx
<View style={{ height: 220 }}>
  <Backdrop sparse>
    <Backdrop.Particles
      field={Array.from({ length: 120 }, (_, i) => ({ x: ((i * 31) % 101) / 101, y: ((i * 47) % 91) / 91, r: 0.6 + ((i * 7) % 6) / 4, a: 0.3 + ((i * 11) % 10) / 14 }))}
    />
  </Backdrop>
</View>
```

### Dense

```tsx
<View style={{ height: 220 }}>
  <Backdrop dense>
    <Backdrop.Particles
      field={Array.from({ length: 120 }, (_, i) => ({ x: ((i * 31) % 101) / 101, y: ((i * 47) % 91) / 91, r: 0.6 + ((i * 7) % 6) / 4, a: 0.3 + ((i * 11) % 10) / 14 }))}
    />
  </Backdrop>
</View>
```

### Subtle

```tsx
<View style={{ height: 220 }}>
  <Backdrop subtle>
    <Backdrop.Particles
      field={Array.from({ length: 90 }, (_, i) => ({ x: ((i * 37) % 101) / 101, y: ((i * 61) % 97) / 97, r: 0.8 + ((i * 13) % 7) / 4, a: 0.4 + ((i * 7) % 10) / 14 }))}
    />
  </Backdrop>
</View>
```

### Vivid

```tsx
<View style={{ height: 220 }}>
  <Backdrop vivid>
    <Backdrop.Particles
      field={Array.from({ length: 90 }, (_, i) => ({ x: ((i * 37) % 101) / 101, y: ((i * 61) % 97) / 97, r: 0.8 + ((i * 13) % 7) / 4, a: 0.4 + ((i * 7) % 10) / 14 }))}
    />
  </Backdrop>
</View>
```

### Still

```tsx
<View style={{ height: 220 }}>
  <Backdrop still>
    <Backdrop.Particles
      field={Array.from({ length: 90 }, (_, i) => ({ x: ((i * 37) % 101) / 101, y: ((i * 61) % 97) / 97, r: 0.8 + ((i * 13) % 7) / 4, a: 0.4 + ((i * 7) % 10) / 14 }))}
    />
  </Backdrop>
</View>
```

### Gradient clouds

```tsx
<View style={{ height: 220 }}>
  <Backdrop>
    <Backdrop.Gradient
      blobs={[
        { color: "#6366f1", cx: 0.35, cy: 0.35, r: 0.5, o: 0.35, end: 0.62 },
        { color: "#ec4899", cx: 0.7, cy: 0.6, r: 0.44, o: 0.28, end: 0.6 },
      ]}
      size={420}
    />
  </Backdrop>
</View>
```

### Travelling layers

```tsx
<View style={{ height: 220 }}>
  <Backdrop>
    {[0, 0.5].map((phase) => (
      <Backdrop.Particles
        key={phase}
        field={Array.from({ length: 40 }, (_, i) => ({
          x: 0.5 + Math.cos(i * 2.4) * (0.05 + ((i * 11) % 40) / 100),
          y: 0.5 + Math.sin(i * 2.4) * (0.05 + ((i * 11) % 40) / 100),
          r: 0.8 + ((i * 7) % 5) / 3,
          a: 0.4 + ((i * 3) % 10) / 16,
        }))}
        phase={phase}
      />
    ))}
  </Backdrop>
</View>
```

## Do & Don't

**Do** — Reach for `subtle` behind anything people have to read. A backdrop sits under body text, and the prominence axis is what keeps it from competing with it.

```tsx
<View style={{ height: 220 }}>
  <Backdrop subtle calm>
    <Backdrop.Particles
      field={Array.from({ length: 80 }, (_, i) => ({ x: ((i * 41) % 97) / 97, y: ((i * 23) % 89) / 89, r: 0.7 + ((i * 5) % 5) / 4, a: 0.3 + ((i * 7) % 10) / 15 }))}
      depth={0}
      twinkle
    />
  </Backdrop>
</View>
```

**Don't** — Run a vivid, energetic backdrop under long-form content. The motion pulls the eye off the words, and the extra brightness cuts text contrast.

```tsx
<View style={{ height: 220 }}>
  <Backdrop vivid energetic dense>
    <Backdrop.Particles
      field={Array.from({ length: 80 }, (_, i) => ({ x: ((i * 41) % 97) / 97, y: ((i * 23) % 89) / 89, r: 1.6 + ((i * 5) % 5) / 2, a: 0.8 + ((i * 7) % 10) / 50 }))}
      depth={1}
      sprite="spark"
    />
  </Backdrop>
</View>
```
