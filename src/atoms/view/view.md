# View

The layout primitive: a flex container that runs identically on iOS, Android, and the web. A View is a column by default. Reach for it directly only when no semantic primitive covers what you need: arrangement (direction, gap, alignment, padding) belongs to `Row` and `Column`, which are Views with that axis exposed as boolean props, and a bordered filled surface belongs to `Card`. Numbers are density-independent pixels.

## Usage

```tsx
<Row cozy alignCenter>
  <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: tokens.primary }} />
  <Typography semibold>Two Views in a row</Typography>
</Row>
```

## Variants

### Column

```tsx
<Column snug style={{ width: 220 }}>
  <View style={{ height: 28, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.15) }} />
  <View style={{ height: 28, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.15) }} />
  <View style={{ height: 28, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.15) }} />
</Column>
```

### Flex sizing

```tsx
<Row snug style={{ width: 260 }}>
  <View style={{ flex: 1, height: 32, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.15) }} />
  <View style={{ flex: 2, height: 32, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.3) }} />
</Row>
```

### Padding

```tsx
<Column pad style={{ width: 240, borderRadius: 10, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card }}>
  <Typography>A padded, bordered box</Typography>
</Column>
```

## Do & Don't

### Arrangement

**Do** — Row and Column carry direction, gap, alignment and padding as boolean props, so the arrangement reads as language and lands on the kit's spacing scale.

```tsx
<Row cozy alignCenter>
  <Emblem primary><Icon shield /></Emblem>
  <Typography semibold>Semantic arrangement</Typography>
</Row>
```

**Don't** — A hand-written flex style object restates what the primitives already name, drifts off the spacing scale, and has to be re-read to know what it does.

```tsx
<View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: alpha(tokens.primary, 0.12) }} />
  <Text style={{ color: tokens.foreground, fontWeight: "600" }}>Hand-rolled arrangement</Text>
</View>
```

### Surfaces

**Do** — A bordered, filled, padded surface is a Card; it carries the platform's own radius, hairline and elevation.

```tsx
<Container xxs>
  <Card>
    <Typography>A real surface</Typography>
  </Card>
</Container>
```

**Don't** — Rebuilding the same box out of a View and four style properties drifts from the platform skins the moment one of them changes.

```tsx
<View style={{ width: 240, padding: 16, borderRadius: 10, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card }}>
  <Text style={{ color: tokens.foreground }}>A look-alike surface</Text>
</View>
```
