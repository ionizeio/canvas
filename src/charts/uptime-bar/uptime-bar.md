# UptimeBar

The statuspage strip: a single row of per-period status pills, oldest on the left, colored operational green, degraded amber, down red, or unknown muted (precedence down > degraded > unknown; an unmarked period is operational). An optional `caption` summarizes the strip above it, and `startLabel`/`endLabel` caption the physical edges below. The strip is a time axis, so it keeps left-to-right ordering in every locale, and its accessible name tallies every status.

## Usage

```tsx
<UptimeBar
label="API uptime"
caption="99.98% uptime"
startLabel="90 days ago"
endLabel="Today"
periods={Array.from({ length: 90 }, (_, i) =>
  i === 61 ? { down: true } : i === 62 || i === 78 ? { degraded: true } : {},
)}
/>
```

## Variants

### Compact

```tsx
<UptimeBar
label="CDN uptime"
compact
periods={Array.from({ length: 60 }, (_, i) => (i === 40 ? { degraded: true } : {}))}
/>
```

### With unknown periods

```tsx
<UptimeBar
label="Worker uptime"
caption="Monitoring began mid-window"
startLabel="30 days ago"
endLabel="Today"
periods={Array.from({ length: 30 }, (_, i) => (i < 6 ? { unknown: true } : i === 21 ? { down: true } : {}))}
/>
```

## Do & Don't

### UptimeBar

**Do** - Let the strip carry the whole anatomy: pills, summary caption, and edge labels, with the status tally in its accessible name.

```tsx
<UptimeBar
label="API uptime"
caption="99.98% uptime"
startLabel="90 days ago"
endLabel="Today"
periods={Array.from({ length: 90 }, (_, i) => (i === 61 ? { down: true } : {}))}
/>
```

**Don't** - A hand-rolled row of colored Views has no accessible tally and no edge-caption anatomy.

```tsx
<View style={{ flexDirection: "row", gap: 2, maxWidth: 480 }}>
  {Array.from({ length: 90 }, (_, i) => (
    <View key={i} style={{ flex: 1, height: 24, borderRadius: 2, backgroundColor: i === 61 ? "red" : "green" }} />
  ))}
</View>
```
