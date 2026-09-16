# Chart

A single- or multi-series bar chart: vertical columns (or horizontal rows) sized against the axis max, with per-category values and labels. Pass `labels` + `series` for grouped clusters colored by the `chart-1`..`chart-8` tokens, add `stacked` to accumulate those series within one column per category, or give a series its own `success` / `destructive` tone when it means success or failure; press or scrub a category to inspect it.

## Usage

```tsx
<Chart
  title="Signups"
  data={[
    { label: "Mon", value: 45 },
    { label: "Tue", value: 60 },
    { label: "Wed", value: 35 },
    { label: "Thu", value: 70 },
    { label: "Fri", value: 55 },
    { label: "Sat", value: 80 },
    { label: "Sun", value: 95 }
  ]}
  max={100}
/>
```

## Variants

### Grouped bars

```tsx
<Chart
title="Revenue, costs, profit"
labels={["Q1 '23", "Q2 '23", "Q3 '23", "Q4 '23", "Q1 '24", "Q2 '24", "Q3 '24", "Q4 '24"]}
series={[
  { label: "Revenue", values: [49, 51, 61, 61, 62, 70, 84, 89] },
  { label: "Costs", values: [32, 32, 33, 38, 41, 48, 55, 59] },
  { label: "Profit", values: [17, 19, 28, 23, 21, 22, 29, 30] }
]}
/>
```

### Stacked columns

```tsx
<Chart
title="Token issuance by client"
stacked
labels={["acme", "globex", "initech", "umbrella", "soylent"]}
series={[
  { label: "Authorization code", values: [1840, 1210, 960, 640, 410] },
  { label: "Client credentials", values: [920, 1480, 340, 1120, 260] },
  { label: "Refresh token", values: [610, 380, 720, 290, 180] },
  { label: "Device code", values: [140, 90, 260, 70, 55] }
]}
/>
```

### Success vs failure

```tsx
<Chart
title="Sign-ins"
labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
series={[
  { label: "Granted", values: [812, 905, 874, 961, 1024, 640, 588], success: true },
  { label: "Denied", values: [41, 38, 56, 47, 62, 29, 24], destructive: true }
]}
/>
```

### Horizontal rows

```tsx
<Chart
title="Coverage"
horizontal
data={[
  { label: "Atoms", value: 92 },
  { label: "Molecules", value: 78 },
  { label: "Organisms", value: 64 },
  { label: "Charts", value: 85 }
]}
max={100}
/>
```

### Tones

```tsx
<Column loose>
  <Chart
  title="Checks passing"
  success
  data={[
    { label: "Mon", value: 82 },
    { label: "Tue", value: 88 },
    { label: "Wed", value: 91 },
    { label: "Thu", value: 86 },
    { label: "Fri", value: 94 }
  ]}
  max={100}
  />
  <Chart
  title="Error rate"
  destructive
  data={[
    { label: "Mon", value: 14 },
    { label: "Tue", value: 9 },
    { label: "Wed", value: 22 },
    { label: "Thu", value: 12 },
    { label: "Fri", value: 7 }
  ]}
  max={25}
  />
</Column>
```

## Do & Don't

### Bar

**Do** — Keep a labelled axis row and a single bar tone so the buckets read at a glance.

```tsx
<Chart title="Signups" max={100} data={[
  { label: "Mon", value: 45 },
  { label: "Tue", value: 60 },
  { label: "Wed", value: 35 },
  { label: "Thu", value: 70 },
  { label: "Fri", value: 55 },
  { label: "Sat", value: 80 },
  { label: "Sun", value: 95 }
]} />

```

**Don't** — Every bar the same full-strength fill and no labels: nothing is emphasized and the axis is unreadable.

```tsx
<View style={{ borderRadius: 8, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, padding: 20, maxWidth: 560 }}>
  <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: 120, width: 520, maxWidth: "100%" }}>
    <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: "0%", borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: tokens.primary, height: 63 }} />
    <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: "0%", borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: tokens.primary, height: 84 }} />
    <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: "0%", borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: tokens.primary, height: 49 }} />
    <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: "0%", borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: tokens.primary, height: 98 }} />
    <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: "0%", borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: tokens.primary, height: 77 }} />
    <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: "0%", borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: tokens.primary, height: 112 }} />
    <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: "0%", borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: tokens.primary, height: 118 }} />
  </View>
</View>

```
