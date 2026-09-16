# AreaChart

Categorical-x series fills: overlapping translucent areas by default, or running-sum bands with `stacked`. Shares the line chart's curve, density, furniture, and scrub-to-inspect axes.

## Usage

```tsx
<AreaChart
  labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"]}
  series={[
    { label: "Total", values: [120, 138, 151, 149, 168, 184, 197, 212] },
    { label: "Paid", values: [42, 51, 58, 63, 71, 84, 92, 104] }
  ]}
/>
```

## Variants

### Stacked

```tsx
<AreaChart
  stacked
  labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"]}
  series={[
    { label: "Direct", values: [37, 46, 49, 61, 53, 49, 54, 56] },
    { label: "Search", values: [77, 90, 83, 82, 82, 85, 85, 92] },
    { label: "Social", values: [18, 28, 34, 41, 48, 55, 50, 57] }
  ]}
/>
```
