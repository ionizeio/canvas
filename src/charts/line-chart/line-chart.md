# LineChart

Categorical-x series lines with nice y ticks, gridlines, and a legend for multiple series. `curved` draws a monotone cubic that never overshoots the data, `dots` marks each datum, and `baseline` + `fade` give the trading-app price idiom (dashed previous close, gain/loss auto tone, gradient fill). A series that means success or failure carries its own `success` / `destructive` tone instead of a ramp color. Press or scrub the plot to inspect a category.

## Usage

```tsx
<LineChart
  title="Active users"
  labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"]}
  series={[
    { label: "Web", values: [119, 122, 131, 147, 157, 176, 182] },
    { label: "Mobile", values: [63, 93, 101, 121, 162, 207, 251] }
  ]}
/>
```

## Variants

### Curved

```tsx
<LineChart
  title="Signups"
  labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
  series={[{ label: "Signups", values: [24, 31, 28, 42, 39, 47, 51] }]}
  curved
/>
```

### Dots

```tsx
<LineChart
  title="Signups"
  labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
  series={[{ label: "Signups", values: [24, 31, 28, 42, 39, 47, 51] }]}
  dots
/>
```

### Compact

```tsx
<LineChart
  compact
  title="Signups"
  labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
  series={[{ label: "Signups", values: [24, 31, 28, 42, 39, 47, 51] }]}
/>
```

### Success vs failure

```tsx
<LineChart
  title="Sign-ins"
  labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
  series={[
    { label: "Granted", values: [812, 905, 874, 961, 1024, 640, 588], success: true },
    { label: "Denied", values: [41, 38, 56, 47, 62, 29, 24], destructive: true }
  ]}
/>
```

### Gradient fade, multi-series

```tsx
<LineChart
  title="Sessions by platform"
  labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
  series={[
    { label: "Web", values: [42, 48, 45, 61, 58, 71, 84] },
    { label: "iOS", values: [28, 31, 36, 34, 41, 49, 56] }
  ]}
  fade
/>
```

### Price vs previous close

```tsx
<LineChart
  title="OLY · today"
  labels={["9:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "1:00"]}
  series={[{ label: "Price", values: [186.1, 187.5, 186.8, 187.4, 188.1, 188.9, 190.5, 191.7] }]}
  baseline={188}
  fade
/>
```

### Formatted values

```tsx
<LineChart
  title="Monthly recurring revenue"
  labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
  series={[{ label: "MRR", values: [112, 118, 127, 125, 138, 151] }]}
  formatValue={(v) => `$${v}k`}
/>
```

### Press to inspect

```tsx
<LineChart
  title="Active users"
  labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"]}
  series={[
    { label: "Web", values: [204, 229, 252, 254, 271, 275, 272, 274] },
    { label: "Mobile", values: [128, 155, 167, 183, 185, 199, 220, 228] }
  ]}
  defaultSelected={5}
/>
```

## Do & Don't

### Line

**Do** — Compare series that share one scale, and let the legend plus the fixed series colors carry identity.

```tsx
<LineChart
title="Signups"
labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
series={[
  { label: "Web", values: [120, 180, 150, 240, 300, 280] },
  { label: "Mobile", values: [60, 90, 140, 160, 220, 260] }
]}
curved
/>

```

**Don't** — Mix measures of different scales on one axis: the smaller series flatlines against the baseline and reads as noise. Normalize, or use two charts.

```tsx
<LineChart
title="Revenue vs conversion"
labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
series={[
  { label: "Revenue", values: [12000, 18000, 15000, 24000, 30000, 28000] },
  { label: "Conversion rate", values: [2.1, 2.4, 2.2, 2.8, 3.1, 3] }
]}
/>

```
