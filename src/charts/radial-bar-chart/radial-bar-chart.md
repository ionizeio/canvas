# RadialBarChart

Concentric arc rings, one per category, innermost first: each pairs a muted full-circle track with a ramp-colored value arc revealed clockwise from 12 o'clock, and a column legend carries the formatted values. Every ring sweeps against the same `max` (the largest entry by default), so the chart compares attainment, not shares. Press a ring to select it (the others dim); press elsewhere to clear.

## Usage

```tsx
<RadialBarChart
  label="Platform activation"
  max={100}
  data={[
    { label: "iOS", value: 64 },
    { label: "Android", value: 48 },
    { label: "Web", value: 82 }
  ]}
/>
```

## Variants

### Compact, no legend

```tsx
<RadialBarChart
  compact
  hideLegend
  data={[
    { label: "Q1", value: 92 },
    { label: "Q2", value: 71 }
  ]}
/>
```

### Inspected

```tsx
<RadialBarChart
  defaultSelected={1}
  data={[
    { label: "Hot", value: 420 },
    { label: "Warm", value: 260 },
    { label: "Cold", value: 890 }
  ]}
/>
```

## Do & Don't

### RadialBarChart

**Do** - Compare attainment on rings that share one sweep maximum, with the values in the legend.

```tsx
<Card padded>
  <RadialBarChart
    label="Platform activation"
    data={[
      { label: "iOS", value: 64 },
      { label: "Web", value: 82 },
    ]}
    max={100}
  />
</Card>
```

**Don't** - Rings encoding shares of a whole belong on PieChart; nested rings without a shared maximum cannot be compared by eye.

```tsx
<Card padded>
  <RadialBarChart
    label="Traffic split"
    data={[
      { label: "Direct", value: 60 },
      { label: "Search", value: 40 },
    ]}
  />
</Card>
```
