# Badge

Two families on one Badge component, picked by boolean props. The metadata badge is a rectangular pill for labels like schema, role, or tag (tones: default, secondary, outline, destructive; add `mono` for token names). The status badge (`status`) is a rounded pill with a leading dot for live state like active, pending, or failed (tones: success, warning, error, info, neutral).

If more than one tone is passed, Badge resolves the highest-precedence one: `default` > `destructive` > `secondary` > `outline` for metadata (`secondary` when none is passed), and `success` > `error` > `warning` > `info` > `neutral` for status (`neutral` when none is passed).

Lay out a series of badges with `BadgeGroup`, a wrapping row that owns the gap (`tight` / `snug` / `cozy`, default `snug`) and centers its badges, so a call site never hand-rolls a flex row around them.

## Usage

```tsx
<Badge>admin</Badge>
```

## Variants

### Solid

```tsx
<Badge default>admin</Badge>
```

### Outline

```tsx
<Badge outline>admin</Badge>
```

### Destructive

```tsx
<Badge destructive>admin</Badge>
```

### Mono (token / event names)

```tsx
<Badge mono>refresh_token</Badge>
```

### Status

```tsx
<Badge status>pending</Badge>
```

### Status tones

```tsx
<BadgeGroup>
  <Badge status success>active</Badge>
  <Badge status warning>degraded</Badge>
  <Badge status error>failed</Badge>
  <Badge status info>syncing</Badge>
  <Badge status neutral>archived</Badge>
</BadgeGroup>
```

### Group

```tsx
<BadgeGroup>
  <Badge>employee</Badge>
  <Badge>engineering</Badge>
  <Badge status success>active</Badge>
</BadgeGroup>
```

## Do & Don't

### Grouping

**Do** — Reach for `BadgeGroup` to lay out a series of badges; it owns the wrap, the gap, and the vertical centering.

```tsx
<BadgeGroup>
  <Badge secondary>employee</Badge>
  <Badge secondary>engineering</Badge>
  <Badge secondary>remote</Badge>
</BadgeGroup>
```

**Don't** — Hand-rolling a flex row for a badge series re-invents the gap and wrap and drifts from the kit's spacing scale.

```tsx
<View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
  <Badge secondary>employee</Badge>
  <Badge secondary>engineering</Badge>
  <Badge secondary>remote</Badge>
</View>
```

### Metadata badge

**Do** — Neutral tags for metadata; reserve color and the status-badge dot for live state.

```tsx
<BadgeGroup>
  <Badge secondary>employee</Badge>
  <Badge secondary>engineering</Badge>
  <Badge secondary>remote</Badge>
  <Badge status success>active</Badge>
</BadgeGroup>
```

**Don't** — Borrowing status colors for plain metadata reads as severity that isn't there; a red tag looks like an error.

```tsx
<View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
  <Badge default>employee</Badge>
  <Badge destructive>engineering</Badge>
  <Badge default>remote</Badge>
  <Badge destructive>active</Badge>
</View>
```

### Status badge

**Do** — Always pair the dot with a word: active, pending, failed.

```tsx
<Badge status error>Failed</Badge>
```

**Don't** — A bare colored dot isn't a label and fails for color-blind users.

```tsx
<Badge status error />
```

### Identity row

**Do** — Show only the one or two badges relevant to this view.

```tsx
<Row wrap alignCenter snug>
  <Typography lead semibold>Rachel Chen</Typography>
  <BadgeGroup>
    <Badge status success>active</Badge>
    <Badge secondary>employee</Badge>
  </BadgeGroup>
</Row>
```

**Don't** — A wall of badges after a name buries the one that matters.

```tsx
<View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
  <Text style={{ fontSize: 15, fontWeight: "600", color: tokens.foreground }}>Rachel Chen</Text>
  <Badge status success>active</Badge>
  <Badge status info>Verified</Badge>
  <Badge secondary>employee</Badge>
  <Badge secondary>engineering</Badge>
  <Badge secondary>remote</Badge>
  <Badge secondary>admin</Badge>
</View>
```

### Token / code badge

**Do** — Use the mono variant for tokens, scopes, and event names.

```tsx
<BadgeGroup tight>
  <Badge secondary mono>authorization_code</Badge>
  <Badge secondary mono>refresh_token</Badge>
  <Badge secondary mono>client_credentials</Badge>
</BadgeGroup>
```

**Don't** — Proportional type makes identifiers hard to scan and compare.

```tsx
<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
  <Badge secondary>authorization_code</Badge>
  <Badge secondary>refresh_token</Badge>
  <Badge secondary>client_credentials</Badge>
</View>
```

### Default variant

**Do** — Reserve the default fill for the single tag you want noticed first; keep the rest secondary.

```tsx
<BadgeGroup>
  <Badge default>admin</Badge>
  <Badge secondary>engineering</Badge>
  <Badge secondary>remote</Badge>
</BadgeGroup>
```

**Don't** — The solid primary fill is the loudest badge; using it for every tag makes the whole row shout and nothing leads.

```tsx
<View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
  <Badge default>employee</Badge>
  <Badge default>engineering</Badge>
  <Badge default>remote</Badge>
  <Badge default>admin</Badge>
</View>
```

### Secondary variant

**Do** — Keep secondary for static metadata (role, team) and switch to the status-badge for anything live.

```tsx
<BadgeGroup>
  <Badge secondary>employee</Badge>
  <Badge secondary>engineering</Badge>
  <Badge status success>active</Badge>
</BadgeGroup>
```

**Don't** — A muted gray pill reads as static metadata, so live state shown as a secondary badge looks inert and goes unnoticed.

```tsx
<View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
  <Badge secondary>active</Badge>
  <Badge secondary>pending</Badge>
  <Badge secondary>failed</Badge>
</View>
```

### Outline variant

**Do** — Use outline on a plain surface where the quiet border has contrast, for low-priority secondary tags.

```tsx
<Card padded>
  <BadgeGroup>
    <Badge outline>draft</Badge>
    <Badge outline>internal</Badge>
  </BadgeGroup>
</Card>
```

**Don't** — The thin border is the whole badge; on a colored or busy surface it disappears and the label floats unboxed.

```tsx
<View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, borderRadius: 6, backgroundColor: tokens.primary, padding: 12 }}>
  <Badge outline>draft</Badge>
  <Badge outline>internal</Badge>
</View>
```

### Destructive variant

**Do** — Reserve destructive for genuinely destructive or error semantics like revoked or banned.

```tsx
<BadgeGroup>
  <Badge destructive>Revoked</Badge>
  <Badge destructive>Banned</Badge>
  <Badge secondary>marketing</Badge>
</BadgeGroup>
```

**Don't** — Solid red signals error or danger, so using it to color-code neutral categories raises a false alarm.

```tsx
<View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
  <Badge destructive>marketing</Badge>
  <Badge destructive>finance</Badge>
  <Badge destructive>legal</Badge>
</View>
```
