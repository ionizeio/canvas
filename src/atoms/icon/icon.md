# Icon

Lucide-style outline. 1.75 stroke width, rounded caps. The stroke defaults to the theme foreground token and tracks light and dark automatically; pick other hues with the semantic color booleans (`primary`, `destructive`, `success`, `warning`, `muted`).

## Usage

```tsx
<Icon shield />
```

## Variants

### Primary

```tsx
<Icon shield primary />
```

### Destructive

```tsx
<Icon shield destructive />
```

### Success

```tsx
<Icon circleCheck success />
```

### Warning

```tsx
<Icon alertTriangle warning />
```

### Muted

```tsx
<Icon shield muted />
```

### Gallery

```tsx
<IconGallery />
```

## Do & Don't

### Stroke coherence

**Do** — One outline style at 1.75 stroke across the whole set.

```tsx
<Row alignCenter relaxed>
  <Icon home size={28} />
  <Icon search size={28} />
  <Icon bell size={28} />
</Row>
```

**Don't** — Mixed stroke weights and a stray filled glyph make a set look incoherent.

```tsx
<View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
  <Icon home muted size={20} />
  <Icon search destructive size={34} />
  <Icon bell primary size={28} />
</View>
```

### foreground

**Do** — Leave the stroke at its default: it paints the theme foreground and follows light and dark on its own, no color prop needed.

```tsx
<Icon mail size={28} />
```

**Don't** — Hard-coding a hex stroke pins the icon to one theme; it stays black on a dark surface and disappears.

```tsx
<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 6, backgroundColor: tokens.foreground, padding: 12 }}>
  <Icon mail size={28} />
</View>
```

### primary

**Do** — Reserve text-primary for the one active or selected icon; keep the rest muted.

```tsx
<Row alignCenter relaxed>
  <Icon home muted size={22} />
  <Icon star primary size={22} />
  <Icon settings muted size={22} />
</Row>
```

**Don't** — Painting a whole toolbar primary spends the accent on everything, so nothing reads as emphasized.

```tsx
<View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
  <Icon home primary size={22} />
  <Icon search primary size={22} />
  <Icon settings primary size={22} />
</View>
```

### destructive

**Do** — Keep text-destructive for genuinely destructive actions like delete, so red always means consequence.

```tsx
<Icon trash destructive size={28} />
```

**Don't** — A red download icon implies danger on a perfectly safe action and trains users to ignore the warning color.

```tsx
<Icon download destructive size={28} />
```

### muted

**Do** — Use the muted tone for secondary, inline hint icons where its color matches the helper text.

```tsx
<Row alignCenter snug>
  <Icon info muted size={16} />
  <Typography small muted>Optional, used only for recovery</Typography>
</Row>
```

**Don't** — A muted icon inside a solid primary button reads as disabled and clashes with the high-contrast label.

```tsx
<Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 6, backgroundColor: tokens.primary, paddingHorizontal: 16, paddingVertical: 8 }}>
  <Icon plus muted size={16} />
  <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens["primary-foreground"] }}>New project</Text>
</Pressable>
```
