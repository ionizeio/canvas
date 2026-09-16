# ServiceHealthList

Per-service status rows: a status dot (down > degraded > operational), the service name, an optional right-aligned `detail` such as an uptime percentage, and, when the item carries `periods`, an embedded mini uptime strip on a second line. It shares its strip renderer with UptimeBar, so the two never drift. `onPressItem` turns rows into drill-in buttons; `compact` hides the strips and tightens the rows; `plain` strips the card surface for nesting.

## Usage

```tsx
<ServiceHealthList
title="System status"
items={[
  { label: "API", detail: "99.98%", periods: Array.from({ length: 45 }, () => ({})) },
  { label: "Dashboard", detail: "99.92%", periods: Array.from({ length: 45 }, (_, i) => (i === 30 ? { degraded: true } : {})), degraded: true },
  { label: "Webhooks", detail: "97.10%", periods: Array.from({ length: 45 }, (_, i) => (i > 40 ? { down: true } : {})), down: true },
]}
/>
```

## Variants

### Compact

```tsx
<ServiceHealthList
title="System status"
compact
items={[
  { label: "API", detail: "99.98%" },
  { label: "Dashboard", detail: "99.92%", degraded: true },
  { label: "Webhooks", detail: "97.10%", down: true },
]}
/>
```

### Drill-in rows

```tsx
<ServiceHealthList
title="System status"
onPressItem={() => {}}
items={[
  { label: "API", detail: "99.98%" },
  { label: "Search", detail: "99.95%" },
  { label: "Exports", detail: "99.80%", degraded: true },
]}
/>
```

### Plain, inside a card

```tsx
<Card padded>
  <ServiceHealthList
    plain
    compact
    items={[
      { label: "API", detail: "operational" },
      { label: "Dashboard", detail: "degraded", degraded: true },
    ]}
  />
</Card>
```

## Do & Don't

### ServiceHealthList

**Do** - One row per service, with the status carried by the dot, the composed accessible name, and the embedded strip.

```tsx
<ServiceHealthList
title="System status"
items={[
  { label: "API", detail: "99.98%" },
  { label: "Webhooks", detail: "97.10%", down: true },
]}
/>
```

**Don't** - A hand-rolled status row splits the tap target and loses the status from assistive tech.

```tsx
<View style={{ borderRadius: 8, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, padding: 20, maxWidth: 480, gap: 8 }}>
  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
    <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: "green" }} />
    <Text>API</Text>
  </View>
</View>
```
