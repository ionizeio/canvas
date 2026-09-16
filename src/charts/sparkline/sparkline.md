# Sparkline

A compact trend strip: a row of thin bars whose heights track a series of values,
with the series in a soft wash of the tone and the latest bar in the full accent.
Pass `values` and it sizes each bar against the series max and paints the tone, so
no call site hand-composes a row of `flexGrow` + `height` + `backgroundColor`
Views to draw an inline trend on a stat card or dashboard.

## Usage

```tsx
<Container xxxs>
  <Sparkline values={[4, 8, 6, 12, 10, 16, 14, 18, 16, 20, 24]} />
</Container>
```

## Variants

### Tones

```tsx
<Container xxxs>
  <Column relaxed>
    <Sparkline primary values={[29, 31, 36, 40, 40, 45, 48, 48, 45, 49, 47, 51, 53, 57, 60, 66, 64, 64, 63, 63, 65, 64, 64, 65, 65, 67, 72, 77, 82, 89]} />
    <Sparkline success values={[29, 31, 36, 40, 40, 45, 48, 48, 45, 49, 47, 51, 53, 57, 60, 66, 64, 64, 63, 63, 65, 64, 64, 65, 65, 67, 72, 77, 82, 89]} />
    <Sparkline destructive values={[89, 82, 77, 72, 67, 65, 65, 64, 64, 65, 63, 63, 64, 64, 66, 60, 57, 53, 51, 47, 49, 45, 48, 48, 45, 40, 40, 36, 31, 29]} />
    <Sparkline muted values={[18, 19, 20, 23, 19, 21, 17, 16, 16, 19, 20, 20, 21, 22, 26, 25, 24, 23, 24, 22, 20, 23, 20, 20, 20, 17, 16, 17, 19, 20]} />
  </Column>
</Container>
```

### Sizes

```tsx
<Container xxxs>
  <Column relaxed>
    <Sparkline compact values={[28, 33, 39, 45, 45, 42, 48, 45, 47, 53, 55, 60, 61, 63, 63, 62, 64, 65, 62, 69, 72, 78, 78, 82, 85, 92, 94, 92, 91, 96]} />
    <Sparkline values={[28, 33, 39, 45, 45, 42, 48, 45, 47, 53, 55, 60, 61, 63, 63, 62, 64, 65, 62, 69, 72, 78, 78, 82, 85, 92, 94, 92, 91, 96]} />
    <Sparkline tall values={[28, 33, 39, 45, 45, 42, 48, 45, 47, 53, 55, 60, 61, 63, 63, 62, 64, 65, 62, 69, 72, 78, 78, 82, 85, 92, 94, 92, 91, 96]} />
  </Column>
</Container>
```

### Line

```tsx
<Container xxxs>
  <Column relaxed>
    <Sparkline line success values={[185.3, 184.0, 183.5, 185.0, 185.8, 186.2, 187.2, 188.7, 189.1, 187.8, 187.7, 187.0, 186.9, 187.0, 188.1, 187.5, 188.9, 188.8, 189.8, 190.6, 189.4, 188.1, 189.0, 190.1, 191.6, 192.6, 193.6, 194.4, 195.8, 194.7, 193.4, 192.8, 191.7, 191.0]} />
    <Sparkline line destructive values={[191.0, 191.7, 192.8, 193.4, 194.7, 195.8, 194.4, 193.6, 192.6, 191.6, 190.1, 189.0, 188.1, 189.4, 190.6, 189.8, 188.8, 188.9, 187.5, 188.1, 187.0, 186.9, 187.0, 187.7, 187.8, 189.1, 188.7, 187.2, 186.2, 185.8, 185.0, 183.5, 184.0, 185.3]} />
  </Column>
</Container>
```

## Variants

### Track

`track` paints the plot area with the muted track, so the strip keeps a visible
frame. A flat or all-zero series then reads as a chart sitting at zero rather
than as one that failed to load, and a row of strips scans evenly because every
one holds the same band whatever its data. Use it where strips sit side by side;
a lone sparkline inside running text is usually better without.

```tsx
<Container xxxs>
  <Sparkline track values={[0, 0, 0, 0, 0, 0, 0, 0]} />
</Container>
```

## Do & Don't

### Pair with a value

**Do** — Anchor the sparkline to an explicit headline value and delta with the Stats molecule, which owns the metric-card anatomy and renders the trend strip from its `spark` field.

```tsx
<Container xxxs>
  <Stats items={[{ label: "Requests", value: "24.5k", delta: "+8.2%", spark: [4, 8, 6, 12, 10, 16, 14, 18, 16, 20, 24] }]} />
</Container>
```

**Don't** — Draw a bare trend strip with no current value; the reader has to decode the slope.

```tsx
<View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, height: 24 }}>
  <View style={{ flexGrow: 1, borderRadius: 2, backgroundColor: "#4f46e5", height: 8 }} />
  <View style={{ flexGrow: 1, borderRadius: 2, backgroundColor: "#4f46e5", height: 16 }} />
  <View style={{ flexGrow: 1, borderRadius: 2, backgroundColor: "#4f46e5", height: 24 }} />
</View>
```
