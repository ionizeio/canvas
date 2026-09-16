# BarList

Ranked label and value rows, each with a color swatch, a truncating label, a right-aligned value, an optional delta, and a proportional track bar. Bars size against the largest row by default (the ranking idiom); `share` sizes them against the sum of the rows and appends percent readouts (the composition idiom). Rows become drill-in buttons with `onPressItem`. For comparing magnitudes on a shared axis without deltas or shares, reach for the bar `Chart` and its `horizontal` mode instead.

## Usage

```tsx
<BarList
title="Top pages"
items={[
  { label: "/pricing", value: 18400, delta: "+12%" },
  { label: "/docs", value: 12100, delta: "+4%" },
  { label: "/blog/launch", value: 8700, delta: "-2%", down: true },
  { label: "/changelog", value: 5300, delta: "+1%" },
]}
/>
```

## Variants

### Share of total

```tsx
<BarList
title="Sign-up sources"
share
items={[
  { label: "google", value: 412 },
  { label: "email", value: 318 },
  { label: "github", value: 142 },
  { label: "passkey", value: 88 },
]}
/>
```

### Drill-in rows

```tsx
<BarList
title="Top referrers"
onPressItem={() => {}}
items={[
  { label: "news.ycombinator.com", value: 4210, delta: "+18%" },
  { label: "reddit.com", value: 2380, delta: "-6%", down: true },
  { label: "linkedin.com", value: 1240, delta: "+2%" },
]}
/>
```

### Plain, inside a card

```tsx
<Card padded>
  <Column>
    <Typography h4>This week</Typography>
    <BarList
      plain
      compact
      items={[
        { label: "Deploys", value: 42 },
        { label: "Rollbacks", value: 3, chart4: true },
        { label: "Incidents", value: 1, chart8: true },
      ]}
    />
  </Column>
</Card>
```

## Do & Don't

### BarList

**Do** - Let the component own the whole row anatomy: swatch, label, value, delta, and the proportional bar.

```tsx
<BarList
title="Top pages"
items={[
  { label: "/pricing", value: 18400, delta: "+12%" },
  { label: "/docs", value: 12100, delta: "-4%", down: true },
]}
/>
```

**Don't** - A hand-rolled row of Text and colored Views splits the anatomy, drifts from the type scale, and hides its share from assistive tech.

```tsx
<View style={{ borderRadius: 8, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, padding: 20, maxWidth: 420, gap: 8 }}>
  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
    <Text>/pricing</Text>
    <Text>18.4k</Text>
  </View>
  <View style={{ height: 3, backgroundColor: tokens.primary, width: "80%" }} />
</View>
```
