# Emblem

A tinted rounded square (or circle) that holds a single `Icon` or a short
monogram, the recurring "icon on a soft background" used in cards, media objects,
empty states, and feeds. Emblem owns the surface and the icon color: pick a tone
and it tints the square and paints the glyph to match, so a call site never
hand-composes `borderRadius` + `backgroundColor` to build an icon background.

## Usage

```tsx
<Emblem>
  <Icon shield />
</Emblem>
```

## Variants

### Tones

```tsx
<Row snug>
  <Emblem primary><Icon shield /></Emblem>
  <Emblem success><Icon check /></Emblem>
  <Emblem warning><Icon circleAlert /></Emblem>
  <Emblem destructive><Icon trash /></Emblem>
  <Emblem muted><Icon bell /></Emblem>
</Row>
```

### Sizes

```tsx
<Row snug alignCenter>
  <Emblem small><Icon bell /></Emblem>
  <Emblem><Icon bell /></Emblem>
  <Emblem large><Icon bell /></Emblem>
</Row>
```

### Monogram

```tsx
<Emblem label="U" />
```

### Circle

```tsx
<Emblem circle>
  <Icon check />
</Emblem>
```

## Do & Don't

### Surface

**Do**: Use Emblem so the tint and icon color stay in sync from one tone prop.

```tsx
<Emblem primary>
  <Icon shield />
</Emblem>
```

**Don't**: Hand-compose the tinted square with raw `borderRadius`, `backgroundColor`, and padding.

```tsx
<View style={{ height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: "rgba(79,70,229,0.1)" }}>
  <Icon shield primary />
</View>
```
