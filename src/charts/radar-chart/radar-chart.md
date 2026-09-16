# RadarChart

A polygonal multi-axis comparison: concentric rings at nice tick fractions, a spoke per axis, and one closed polygon per series (ramp stroke over a soft matching wash), with the spoke labels just beyond the outer ring. Values align to `axes` by index and the accessible name folds every axis and value; press-to-inspect is deferred scope for this chart.

## Usage

```tsx
<Container lg>
  <RadarChart
  title="Candidate comparison"
  axes={["Coding", "Design", "Comms", "Ops", "Product"]}
  series={[
    { label: "Casey", values: [8, 6, 9, 5, 7] },
    { label: "Jordan", values: [6, 9, 7, 8, 5] },
  ]}
  max={10}
/>
</Container>
```

## Variants

### Single series, toned

```tsx
<Container lg>
  <RadarChart
  title="Service posture"
  success
  axes={["Latency", "Uptime", "Errors", "Cost", "Coverage"]}
  series={[{ label: "API", values: [7, 9, 8, 6, 7] }]}
  max={10}
/>
</Container>
```

### Compact, no grid

```tsx
<Container lg>
  <RadarChart
  compact
  hideGrid
  axes={["Spd", "Pwr", "Def", "Mag", "Luck", "HP"]}
  series={[{ label: "Build A", values: [12, 18, 9, 15, 7, 14] }]}
/>
</Container>
```

## Do & Don't

### RadarChart

**Do** - Compare a small number of profiles over the same axes, on one shared scale.

```tsx
<Container lg>
  <RadarChart
  title="Candidate comparison"
  axes={["Coding", "Design", "Comms", "Ops", "Product"]}
  series={[
    { label: "Casey", values: [8, 6, 9, 5, 7] },
    { label: "Jordan", values: [6, 9, 7, 8, 5] },
  ]}
  max={10}
/>
</Container>
```

**Don't** - Radar axes are unordered categories; a time series belongs on a LineChart, where the x axis carries the order.

```tsx
<Container lg>
  <RadarChart
  axes={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
  series={[{ label: "Revenue", values: [4, 5, 6, 7, 8, 9] }]}
/>
</Container>
```
