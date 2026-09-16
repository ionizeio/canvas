# ComposedChart

Bars, lines, and gradient-washed areas sharing one categorical axis: each series picks its mark with a `line` or `area` boolean (bars by default; precedence line > area > bars). The classic "revenue bars with a margin line" chart, on one shared zero-based y axis, with the same scrub-to-inspect, legend, and accessible-name contract as the other cartesian charts. For bar-only grouped data, reach for the bar `Chart`'s grouped mode instead; composed earns its keep when the marks mix.

## Usage

```tsx
<ComposedChart
  title="Revenue and margin"
  labels={["Q1", "Q2", "Q3", "Q4"]}
  series={[
    { label: "Revenue", values: [420, 510, 480, 620] },
    { label: "Margin", values: [110, 170, 150, 240], line: true }
  ]}
/>
```

## Variants

### Area backdrop

```tsx
<ComposedChart
  title="Traffic and conversions"
  labels={["Mon", "Tue", "Wed", "Thu", "Fri"]}
  series={[
    { label: "Sessions", values: [1200, 1420, 1310, 1680, 1540], area: true },
    { label: "Sign-ups", values: [240, 310, 280, 420, 380] }
  ]}
/>
```

### Dots and inspection

```tsx
<ComposedChart
  title="Deploys and incidents"
  labels={["W1", "W2", "W3", "W4", "W5", "W6"]}
  dots
  defaultSelected={3}
  series={[
    { label: "Deploys", values: [12, 18, 15, 22, 19, 24] },
    { label: "Incidents", values: [2, 1, 3, 1, 2, 1], line: true }
  ]}
/>
```

## Do & Don't

### ComposedChart

**Do** - Mix marks when the series mean different things: bars for the magnitude, a line for the derived rate.

```tsx
<ComposedChart
title="Revenue and margin"
labels={["Q1", "Q2", "Q3", "Q4"]}
series={[
  { label: "Revenue", values: [420, 510, 480, 620] },
  { label: "Margin", values: [110, 170, 150, 240], line: true },
]}
/>
```

**Don't** - All-bar composed data belongs on the bar Chart's grouped mode; composed adds nothing but indirection.

```tsx
<ComposedChart
labels={["Q1", "Q2", "Q3", "Q4"]}
series={[
  { label: "Revenue", values: [420, 510, 480, 620] },
  { label: "Costs", values: [310, 340, 330, 380] },
]}
/>
```
