# Treemap

Squarified value tiles: each datum becomes a ramp-colored rectangle whose area is proportional to its value, packed largest-first with near-square aspect ratios, with the label and formatted value rendered inside only when the tile fits them. Flat one-level data; nesting and drill-down are deferred scope. Press a tile to flag its value and share (the others dim); the accessible name carries every tile with its share regardless of which labels fit.

## Usage

```tsx
<Treemap
title="Storage by service"
data={[
  { label: "Media", value: 620 },
  { label: "Backups", value: 340 },
  { label: "Logs", value: 180 },
  { label: "Search index", value: 120 },
  { label: "Thumbnails", value: 90 },
  { label: "Exports", value: 45 },
  { label: "Other", value: 25 },
]}
/>
```

## Variants

### Compact

```tsx
<Treemap
compact
data={[
  { label: "Chrome", value: 61 },
  { label: "Safari", value: 24 },
  { label: "Edge", value: 8 },
  { label: "Firefox", value: 5 },
  { label: "Other", value: 2 },
]}
/>
```

### Inspected

```tsx
<Treemap
title="Revenue by product"
defaultSelected={0}
data={[
  { label: "Platform", value: 4200 },
  { label: "Add-ons", value: 1400 },
  { label: "Services", value: 900 },
  { label: "Training", value: 300 },
]}
/>
```

## Do & Don't

### Treemap

**Do** - Reserve the treemap for part-of-whole data with real size contrast, where area comparison earns the space.

```tsx
<Treemap
title="Storage by service"
data={[
  { label: "Media", value: 620 },
  { label: "Backups", value: 340 },
  { label: "Logs", value: 180 },
]}
/>
```

**Don't** - A handful of near-equal shares reads better as a PieChart or a BarList; near-equal tiles defeat the area encoding.

```tsx
<Treemap
data={[
  { label: "A", value: 26 },
  { label: "B", value: 25 },
  { label: "C", value: 25 },
  { label: "D", value: 24 },
]}
/>
```
