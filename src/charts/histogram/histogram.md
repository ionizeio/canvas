# Histogram

An auto-binned frequency distribution: pass raw sample `values` and the chart bins them into nice-edged uniform buckets (Sturges' rule by default, `bins` to override) and draws contiguous bars on a numeric axis. Press or scrub a bar to inspect its range and count. The accessible name lists every bin with its bounds and tally.

## Usage

```tsx
<Histogram
  title="Response times"
  label="Latency ms"
  values={[42, 38, 51, 44, 47, 39, 58, 62, 44, 41, 49, 53, 46, 43, 71, 48]}
/>
```

## Variants

### Explicit bins

```tsx
<Histogram
  bins={5}
  values={[1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 5, 5, 6, 7, 8, 9, 12, 2, 3, 1, 4, 2, 3, 5]}
/>
```

### Compact, no grid

```tsx
<Histogram
  compact
  hideGrid
  values={[4.2, 4.8, 5.1, 4.4, 6.2, 5.5, 4.9, 5.0, 4.6, 7.8, 5.2, 4.7, 5.4, 4.3, 5.8]}
/>
```

## Do & Don't

### Histogram

**Do** - Hand the chart raw samples and let it choose nice bin edges.

```tsx
<Histogram
title="Response times"
label="Latency ms"
values={[42, 38, 51, 44, 47, 39, 58, 62, 44, 41, 49, 53, 46, 43, 71, 48]}
/>
```

**Don't** - Pre-bucketing the samples into a bar Chart throws away the distribution's edges and the inspectable ranges.

```tsx
<Chart
data={[
  { label: "small", value: 9 },
  { label: "medium", value: 5 },
  { label: "large", value: 2 },
]}
/>
```
