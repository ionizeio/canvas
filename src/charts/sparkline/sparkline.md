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
  <Column>
    <Sparkline primary values={[4, 8, 6, 12, 10, 16, 14, 18, 16, 20, 24]} />
    <Sparkline success values={[4, 8, 6, 12, 10, 16, 14, 18, 16, 20, 24]} />
    <Sparkline destructive values={[24, 20, 16, 18, 14, 16, 10, 12, 6, 8, 4]} />
    <Sparkline muted values={[4, 8, 6, 12, 10, 16, 14, 18, 16, 20, 24]} />
  </Column>
</Container>
```

### Sizes

```tsx
<Container xxxs>
  <Column>
    <Sparkline compact values={[4, 8, 6, 12, 10, 16, 14, 18, 16, 20, 24]} />
    <Sparkline values={[4, 8, 6, 12, 10, 16, 14, 18, 16, 20, 24]} />
    <Sparkline tall values={[4, 8, 6, 12, 10, 16, 14, 18, 16, 20, 24]} />
  </Column>
</Container>
```

### Line

```tsx
<Container xxxs>
  <Sparkline line values={[4, 8, 6, 12, 10, 16, 14, 18, 16, 20, 24]} />
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
