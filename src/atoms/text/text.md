# Text

Renders text. In React Native every string must live inside a Text element, so you cannot put a bare string in a View. For type scale and tone in app code, reach for `<Typography>` (e.g. `<Typography h3>`, `<Typography body>`, `<Typography tiny muted>`), which owns the kit's roles and colors; use the raw Text primitive for the primitive-level cases it does not cover: `numberOfLines` truncation and nested inline runs.

## Usage

```tsx
<Text style={{ color: tokens.foreground }}>The quick brown fox jumps over the lazy dog.</Text>
```

## Variants

### Truncation

```tsx
<Container xxs>
  <Text numberOfLines={1} style={{ color: tokens.foreground }}>
    This single line is clipped with an ellipsis when it overflows its container.
  </Text>
</Container>
```

### Nested runs

```tsx
<Text style={{ color: tokens.foreground }}>
  A run of text can carry an <Text style={{ fontWeight: "700" }}>inline emphasis</Text> that inherits everything else from its parent Text.
</Text>
```

## Do & Don't

### Styled type

**Do** — Reach for `Typography` for any styled type: it owns the kit's roles, sizes, and tones.

```tsx
<Column tight>
  <Typography h3>Heading</Typography>
  <Typography body>Body text</Typography>
  <Typography tiny muted>Muted caption</Typography>
</Column>
```

**Don't** — Hand-styling the raw Text primitive with literal font sizes and weights reinvents the type scale and drifts from the tokens.

```tsx
<View style={{ gap: 4 }}>
  <Text style={{ fontSize: 20, lineHeight: 28, fontWeight: "600", color: tokens.foreground }}>Heading</Text>
  <Text style={{ fontSize: 14, lineHeight: 20, color: tokens.foreground }}>Body text</Text>
  <Text style={{ fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] }}>Muted caption</Text>
</View>
```
