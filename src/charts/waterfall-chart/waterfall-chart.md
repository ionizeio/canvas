# WaterfallChart

The running-total bridge: each step floats from the running total by its signed `value`, and a `total` step snapshots the running total as an absolute bar from zero. The coloring is fixed semantics rather than a prop: rises green, falls red, totals the brand primary, so every bridge reads the same way. Hairline connectors link each bar's end to the next bar's start, and scrubbing a step flags its change and running total.

## Usage

```tsx
<WaterfallChart
title="Q3 revenue bridge"
steps={[
  { label: "Q2", value: 4200, total: true },
  { label: "New", value: 980 },
  { label: "Expansion", value: 460 },
  { label: "Churn", value: -540 },
  { label: "FX", value: -120 },
  { label: "Q3", total: true },
]}
/>
```

## Variants

### Signed steps only

```tsx
<WaterfallChart
title="Headcount"
steps={[
  { label: "Hired", value: 24 },
  { label: "Backfill", value: 8 },
  { label: "Attrition", value: -11 },
  { label: "Transfers", value: -3 },
  { label: "Net", total: true },
]}
/>
```

### Compact, inspected

```tsx
<WaterfallChart
compact
defaultSelected={2}
steps={[
  { label: "Start", value: 100, total: true },
  { label: "Wins", value: 30 },
  { label: "Losses", value: -12 },
  { label: "End", total: true },
]}
/>
```

## Do & Don't

### WaterfallChart

**Do** - Bridge from one total to the next with signed steps; let the fixed coloring carry rise and fall.

```tsx
<WaterfallChart
title="Q3 revenue bridge"
steps={[
  { label: "Q2", value: 4200, total: true },
  { label: "New", value: 980 },
  { label: "Churn", value: -540 },
  { label: "Q3", total: true },
]}
/>
```

**Don't** - Plain bars of period totals hide the walk: what rose, what fell, and by how much.

```tsx
<Chart
data={[
  { label: "Q2", value: 4200 },
  { label: "Q3", value: 4640 },
]}
/>
```
