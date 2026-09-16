# BulletChart

Goal-attainment rows: each datum is a leading label, a track holding qualitative background bands (`ranges`, ascending bounds in fading washes), the tone-colored measure bar, an optional vertical target tick, and the trailing formatted value. Following the classic bullet-graph anatomy each row carries its own scale, since goals rarely share units; pass `max` to force one shared scale when they do. The compact alternative to a dashboard of gauges: five goals read in five rows.

## Usage

```tsx
<BulletChart
title="Q3 targets"
data={[
  { label: "Revenue", value: 275, target: 300, ranges: [200, 350, 500] },
  { label: "Profit", value: 42, target: 35, ranges: [30, 50, 70] },
  { label: "NPS", value: 61, target: 70, ranges: [40, 60, 80] },
]}
/>
```

## Variants

### Success tone

```tsx
<BulletChart
title="Deploys per week"
success
data={[
  { label: "Web", value: 34, target: 30 },
  { label: "iOS", value: 18, target: 24 },
  { label: "Android", value: 21, target: 24 },
]}
/>
```

### Compact

```tsx
<BulletChart
title="Budgets"
compact
data={[
  { label: "Compute", value: 8200, target: 10000, ranges: [6000, 10000, 14000] },
  { label: "Storage", value: 4100, target: 5000, ranges: [3000, 5000, 8000] },
]}
/>
```

## Do & Don't

### BulletChart

**Do** - Give every goal its row, with the target as a tick and the qualitative context as bands.

```tsx
<BulletChart
title="Q3 targets"
data={[
  { label: "Revenue", value: 275, target: 300, ranges: [200, 350, 500] },
  { label: "Profit", value: 42, target: 35, ranges: [30, 50, 70] },
]}
/>
```

**Don't** - A bare progress bar per goal loses the target, the qualitative bands, and the shared scale that makes rows comparable.

```tsx
<View style={{ borderRadius: 8, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, padding: 20, maxWidth: 480, gap: 8 }}>
  <View style={{ height: 12, backgroundColor: tokens.muted, borderRadius: 6 }}>
    <View style={{ height: 12, width: "60%", backgroundColor: tokens.primary, borderRadius: 6 }} />
  </View>
</View>
```
