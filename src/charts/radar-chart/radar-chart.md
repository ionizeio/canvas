# RadarChart

A polygonal multi-axis comparison: concentric rings at nice tick fractions, a spoke per axis, and one closed polygon per series (ramp stroke over a soft matching wash), with the spoke labels just beyond the outer ring. Values align to `axes` by index and the accessible name folds every axis and value; press-to-inspect is deferred scope for this chart.

## Usage

```tsx
<RadarChart
  title="Candidate comparison"
  axes={["Coding", "Design", "Comms", "Ops", "Product"]}
  series={[
    { label: "Casey", values: [8, 6, 9, 5, 7] },
    { label: "Jordan", values: [6, 9, 7, 8, 5] },
  ]}
/>
```

## Variants

### Single series, toned

```tsx
<RadarChart
  success
  axes={["Latency", "Uptime", "Errors", "Cost", "Coverage"]}
  series={[{ label: "API", values: [7, 9, 8, 6, 7] }]}
/>
```

### Compact, no grid

```tsx
<RadarChart
compact
hideGrid
axes={["Spd", "Pwr", "Def", "Mag", "Luck", "HP"]}
series={[{ label: "Build A", values: [12, 18, 9, 15, 7, 14] }]}
/>
```

## Do & Don't

### RadarChart

**Do** - Compare a small number of profiles over the same axes, on one shared scale.

```tsx
<RadarChart
title="Candidate comparison"
axes={["Coding", "Design", "Comms", "Ops", "Product"]}
series={[
  { label: "Casey", values: [8, 6, 9, 5, 7] },
  { label: "Jordan", values: [6, 9, 7, 8, 5] },
]}
max={10}
/>
```

**Don't** - Radar axes are unordered categories; a time series belongs on a LineChart, where the x axis carries the order.

```tsx
<RadarChart
axes={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
series={[{ label: "Revenue", values: [4, 5, 6, 7, 8, 9] }]}
/>
```
