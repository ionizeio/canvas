# ScrollView

A scrollable container for content larger than its bounds. Unlike a plain View (which clips overflow), a ScrollView lets its children exceed its size and scroll. Vertical by default; pass `horizontal` for a row. Style the frame with `style` and the inner content with `contentContainerStyle`.

## Usage

```tsx
<ScrollView style={{ height: 176, width: "100%", borderRadius: 10, borderWidth: 1, borderColor: tokens.border }} contentContainerStyle={{ padding: 12, gap: 12 }}>
  <View style={{ height: 36, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.15) }} />
  <View style={{ height: 36, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.15) }} />
  <View style={{ height: 36, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.15) }} />
  <View style={{ height: 36, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.15) }} />
  <View style={{ height: 36, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.15) }} />
</ScrollView>
```

## Variants

### Horizontal

```tsx
<ScrollView horizontal style={{ width: "100%", borderRadius: 10, borderWidth: 1, borderColor: tokens.border }} contentContainerStyle={{ padding: 12, gap: 12 }}>
  <View style={{ width: 200, height: 60, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.15) }} />
  <View style={{ width: 200, height: 60, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.15) }} />
  <View style={{ width: 200, height: 60, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.15) }} />
  <View style={{ width: 200, height: 60, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.15) }} />
  <View style={{ width: 200, height: 60, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.15) }} />
  <View style={{ width: 200, height: 60, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.15) }} />
</ScrollView>
```
