# Swatch

A color sample: a filled rounded block with the token's name and value beneath it,
the anatomy a design-system color sheet repeats down a page. Swatch owns the whole
lockup, so a sheet never sets a bare block next to a hand-built text column and drifts
row to row. Pass a live theme token as `color` and the sample follows the active
scheme; a hairline edge keeps a white or near-black sample visible on the surface
behind it.

## Usage

```tsx
<Swatch color={tokens.primary} value="--primary">
  primary
</Swatch>
```

## Variants

### Sizes

```tsx
<Row>
  <Swatch small color={tokens.primary}>primary</Swatch>
  <Swatch color={tokens.success}>success</Swatch>
  <Swatch large color={tokens.destructive}>destructive</Swatch>
</Row>
```

### Circle

```tsx
<Swatch circle color={tokens.primary}>primary</Swatch>
```

### Inline

```tsx
<Swatch inline color={tokens.primary}>primary</Swatch>
```

### Block

```tsx
<Swatch block color={tokens.primary}>primary</Swatch>
```

### Detail line

```tsx
<Swatch color={tokens.primary} value="--primary" detail="oklch(0.511 0.262 276.966)">
  primary
</Swatch>
```

## Do & Don't

### Anatomy

**Do**: Let Swatch carry the name and the value, so every row of a sheet keeps one lockup and one accessible name.

```tsx
<Swatch color={tokens.primary} value="--primary">
  primary
</Swatch>
```

**Don't**: Set a bare block beside a hand-composed text column: the spacing and the type scale drift row to row, and the sample ships as an unnamed block.

```tsx
<Row snug alignCenter>
  <View style={{ height: 56, width: 56, borderRadius: 8, backgroundColor: "#4f46e5" }} />
  <Column tight>
    <Typography small medium>primary</Typography>
    <Typography tiny subtle>--primary</Typography>
  </Column>
</Row>
```

### Color source

**Do**: Pass the live token, so the sample repaints when the scheme flips.

```tsx
<Swatch color={tokens.card} value="--card">
  card
</Swatch>
```

**Don't**: Hard-code the value a token resolves to; the sample keeps showing the light color after the scheme flips to dark.

```tsx
<Swatch color="#ffffff" value="#ffffff">
  card
</Swatch>
```
