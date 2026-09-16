# LineChart

Categorical-x series lines with nice y ticks, gridlines, and a legend for multiple series. `curved` draws a monotone cubic that never overshoots the data, `dots` marks each datum, and `baseline` + `fade` give the trading-app price idiom (dashed previous close, gain/loss auto tone, gradient fill). A series that means success or failure carries its own `success` / `destructive` tone instead of a ramp color. Press or scrub the plot to inspect a category.

## Usage

```tsx
<LineChart
title="Active users"
labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"]}
series={[
  { label: "Web", values: [119, 119, 122, 114, 131, 154, 147, 164, 157, 155, 176, 175, 179, 182] },
  { label: "Mobile", values: [63, 68, 93, 104, 101, 98, 121, 143, 162, 186, 207, 230, 228, 251] },
  { label: "API", values: [32, 41, 41, 38, 35, 37, 39, 47, 50, 62, 71, 69, 81, 79] }
]}
curved
dots
/>
```

## Variants

### Price vs previous close

```tsx
<LineChart
title="OLY · today"
labels={["9:30a", "9:40a", "9:50a", "10:00a", "10:10a", "10:20a", "10:30a", "10:40a", "10:50a", "11:00a", "11:10a", "11:20a", "11:30a", "11:40a", "11:50a", "12:00p", "12:10p", "12:20p", "12:30p", "12:40p", "12:50p", "1:00p", "1:10p", "1:20p", "1:30p", "1:40p", "1:50p", "2:00p", "2:10p", "2:20p", "2:30p", "2:40p", "2:50p", "3:00p", "3:10p", "3:20p", "3:30p", "3:40p", "3:50p"]}
series={[{ label: "Price", values: [186.1, 186.6, 186.4, 187.1, 187.5, 187.5, 187.6, 187.3, 186.8, 187.5, 187.0, 186.6, 186.7, 187.1, 186.7, 187.4, 187.5, 187.4, 188.1, 187.6, 188.5, 188.4, 188.9, 189.2, 189.5, 189.6, 190.5, 190.6, 190.7, 190.4, 190.2, 190.8, 190.5, 190.5, 191.4, 191.1, 191.8, 191.6, 191.7] }]}
baseline={188}
fade
curved
/>
```

### Gradient fade, multi-series

```tsx
<LineChart
title="Sessions by platform"
labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
series={[
  { label: "Web", values: [42, 48, 45, 61, 58, 71, 84] },
  { label: "iOS", values: [28, 31, 36, 34, 41, 49, 56] },
  { label: "Android", values: [19, 22, 21, 27, 30, 33, 41] }
]}
fade
curved
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
curved
/>
```

### Compact

```tsx
<LineChart
compact
title="Signups"
labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
series={[{ label: "Signups", values: [24, 31, 28, 42, 39, 47, 51] }]}
curved
/>
```

### Formatted values

```tsx
<LineChart
title="Monthly recurring revenue"
labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
series={[{ label: "MRR", values: [112, 118, 127, 125, 138, 151] }]}
formatValue={(v) => `$${v}k`}
curved
defaultSelected={4}
/>
```

### Press to inspect

```tsx
<LineChart
title="Active users"
labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]}
series={[
  { label: "Web", values: [204, 229, 252, 254, 271, 275, 272, 274, 281, 305, 313, 333] },
  { label: "Mobile", values: [128, 155, 167, 183, 185, 199, 220, 228, 254, 270, 281, 291] }
]}
curved
defaultSelected={8}
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
