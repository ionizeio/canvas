# ScatterPlot

Numeric x/y point clouds with nice ticks and gridlines on both axes. Multi-series clouds use the series tokens; pressing near a point rings it and flags its coordinates.

## Usage

```tsx
<ScatterPlot
  title="Load vs latency"
  series={[
    { label: "us-east", points: [{ x: 94, y: 20 }, { x: 220, y: 37 }, { x: 339, y: 63 }, { x: 446, y: 71 }, { x: 596, y: 99 }, { x: 741, y: 115 }] },
    { label: "eu-west", points: [{ x: 114, y: 33 }, { x: 227, y: 52 }, { x: 340, y: 92 }, { x: 455, y: 111 }, { x: 579, y: 129 }, { x: 737, y: 141 }] },
    { label: "ap-south", points: [{ x: 133, y: 45 }, { x: 251, y: 72 }, { x: 377, y: 102 }, { x: 492, y: 135 }, { x: 613, y: 161 }, { x: 740, y: 171 }] }
  ]}
/>
```

## Variants

### Compact single series

```tsx
<ScatterPlot
  compact
  series={[
    { label: "Campaigns", points: [{ x: 1.2, y: 14 }, { x: 2.8, y: 26 }, { x: 4.2, y: 38 }, { x: 5.9, y: 46 }, { x: 7.3, y: 58 }, { x: 8.1, y: 63 }] }
  ]}
/>
```
