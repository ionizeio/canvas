# AreaChart

Categorical-x series fills: overlapping translucent areas by default, or running-sum bands with `stacked`. Shares the line chart's curve, density, furniture, and scrub-to-inspect axes.

## Usage

```tsx
<Container xl>
  <AreaChart
  title="Traffic by channel"
  labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"]}
  series={[
    { label: "Direct", values: [37, 46, 49, 61, 53, 49, 54, 56, 59, 52, 54, 56, 51, 63, 75, 86] },
    { label: "Search", values: [77, 90, 83, 82, 82, 85, 85, 92, 85, 96, 99, 89, 106, 108, 110, 101] },
    { label: "Social", values: [18, 28, 34, 41, 48, 55, 50, 57, 65, 65, 67, 71, 78, 89, 101, 98] }
  ]}
  stacked
  curved
/>
</Container>
```

## Variants

### Overlapping series

```tsx
<Container xl>
  <AreaChart
  title="Signups"
  labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]}
  series={[
    { label: "Total", values: [120, 138, 151, 149, 168, 184, 197, 212, 208, 231, 252, 266] },
    { label: "Paid", values: [42, 51, 58, 63, 71, 84, 92, 104, 101, 118, 131, 142] }
  ]}
/>
</Container>
```
