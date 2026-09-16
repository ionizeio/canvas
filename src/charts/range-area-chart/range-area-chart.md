# RangeAreaChart

A min/max envelope: a translucent band between each label's `low` and `high`, an optional solid `mid` line through it, and the standard scrub-to-inspect flag showing High, Mid, and Low. The y domain hugs the data rather than anchoring at zero, since an envelope is a range idiom, not a magnitude bar. Forecast bands, error envelopes, and daily temperature ranges all read this way.

## Usage

```tsx
<RangeAreaChart
title="Latency envelope"
label="p50 to p99"
labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
curved
data={[
  { low: 42, high: 118, mid: 61 },
  { low: 38, high: 102, mid: 55 },
  { low: 44, high: 131, mid: 66 },
  { low: 40, high: 95, mid: 52 },
  { low: 47, high: 144, mid: 71 },
  { low: 36, high: 88, mid: 49 },
  { low: 34, high: 81, mid: 46 },
]}
/>
```

## Variants

### Band only

```tsx
<RangeAreaChart
title="Daily temperature"
label="Range"
labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
curved
data={[
  { low: -4, high: 6 },
  { low: -2, high: 9 },
  { low: 2, high: 14 },
  { low: 7, high: 19 },
  { low: 11, high: 24 },
  { low: 15, high: 28 },
]}
/>
```

### Success tone, inspected

```tsx
<RangeAreaChart
title="Forecast"
label="Confidence band"
success
defaultSelected={2}
labels={["W1", "W2", "W3", "W4"]}
data={[
  { low: 90, high: 110, mid: 100 },
  { low: 95, high: 125, mid: 108 },
  { low: 100, high: 140, mid: 118 },
  { low: 104, high: 158, mid: 129 },
]}
/>
```

## Do & Don't

### RangeAreaChart

**Do** - Encode uncertainty as the band and the estimate as the mid line, in one mark.

```tsx
<RangeAreaChart
title="Forecast"
label="Confidence band"
labels={["W1", "W2", "W3", "W4"]}
data={[
  { low: 90, high: 110, mid: 100 },
  { low: 95, high: 125, mid: 108 },
  { low: 100, high: 140, mid: 118 },
  { low: 104, high: 158, mid: 129 },
]}
/>
```

**Don't** - Two separate lines for low and high leave the envelope unreadable as a region and double the legend.

```tsx
<LineChart
labels={["W1", "W2", "W3", "W4"]}
series={[
  { label: "Low", values: [90, 95, 100, 104] },
  { label: "High", values: [110, 125, 140, 158] },
]}
/>
```
