# StackedBar

One proportional horizontal bar split into colored segments (the `chart-1`..`chart-8` tokens in fixed order), with a legend carrying each segment's label and share.

## Usage

```tsx
<StackedBar
  segments={[
    { label: "Direct", value: 42 },
    { label: "Organic search", value: 28 },
    { label: "Social", value: 18 }
  ]}
/>
```

## Variants

### Track

`track` paints the unfilled remainder as a muted rail. A full bar looks the same;
a bar whose segments sum to zero draws the rail instead of nothing, so a
composition of nothing still reads as a bar. Use it wherever the strip has to
hold its space, such as inside a `Stats` tile.

```tsx
<StackedBar
  track
  label="Courier queue"
  segments={[
    { label: "Sent", value: 0 },
    { label: "Queued", value: 0 }
  ]}
/>
```

### Strip size and wash

`tall` takes the 24 band a Sparkline plots in, with the chart bar radius, so a
composition and a trend sitting side by side draw as one family. `subtle` washes
the segments for a bar that supports a headline rather than being one, where a
solid bar would outweigh everything around it.

```tsx
<StackedBar
  tall
  subtle
  label="Verified identities"
  segments={[
    { label: "Verified", value: 1502 },
    { label: "Unverified", value: 345 }
  ]}
/>
```

## Do & Don't

### Stacked bar

**Do** — Always ship a legend with a colored dot, label, and percentage per segment.

```tsx
<Card padded>
  <StackedBar
    segments={[
      { label: "Direct", value: 42 },
      { label: "Organic search", value: 28 },
      { label: "Social", value: 18 },
      { label: "Referral", value: 12 }
    ]}
  />
</Card>

```

**Don't** — Colored segments with no legend force the reader to guess which channel each band represents.

```tsx
<View style={{ borderRadius: 8, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, padding: 20, maxWidth: 560 }}>
  <View style={{ flexDirection: "row", overflow: "hidden", borderRadius: 9999, height: 10, width: 520, maxWidth: "100%" }}>
    <View style={{ width: "42%", backgroundColor: "#6366f1" }} />
    <View style={{ width: "28%", backgroundColor: "#14b8a6" }} />
    <View style={{ width: "18%", backgroundColor: "#f59e0b" }} />
    <View style={{ width: "12%", backgroundColor: "#f43f5e" }} />
  </View>
</View>

```
