# Pagination

Page-of-N navigation for tables and lists.

## Usage

```tsx
<Pagination defaultPage={2} total={12} />
```

## Variants

### With item range

```tsx
<Pagination compact defaultPage={2} total={12} itemCount={118} />
```

### With size

```tsx
<Pagination defaultPage={2} total={12} withSize defaultPageSize={10} pageSizes={[10, 25, 50]} />
```

### Sizes

```tsx
<Column relaxed>
  <Pagination small defaultPage={2} total={12} />
  <Pagination defaultPage={2} total={12} />
  <Pagination large defaultPage={2} total={12} />
</Column>
```

### First and last page

```tsx
<Column relaxed>
  <Pagination defaultPage={1} total={3} />
  <Pagination defaultPage={3} total={3} />
</Column>
```

## Do & Don't

### compact

**Do** — Pass `itemCount` so the buttons carry a "Showing X-Y of N" range and position and total are always visible.

```tsx
<Pagination compact defaultPage={2} total={12} itemCount={118} />
```

**Don't** — Bare Previous/Next with no range label leaves the user unable to tell where they are or how much is left.

```tsx
<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
  <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background }} accessibilityRole="button" accessibilityLabel="Previous page">
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>‹</Text>
  </Pressable>
  <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background }} accessibilityRole="button" accessibilityLabel="Next page">
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>›</Text>
  </Pressable>
</View>
```

### numbered

**Do** — Truncate the middle with an ellipsis; keep first, last, and a window around the current page.

```tsx
<Pagination defaultPage={2} total={12} />
```

**Don't** — Rendering every page number overflows and stops being scannable past a handful.

```tsx
<View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
  <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background, opacity: 0.5 }} accessibilityRole="button" accessibilityLabel="Previous page">
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>‹</Text>
  </Pressable>
  <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: tokens.primary, backgroundColor: tokens.primary }} accessibilityRole="button" accessibilityLabel="Page 1">
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens["primary-foreground"] }}>1</Text>
  </Pressable>
  <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background }} accessibilityRole="button" accessibilityLabel="Page 2">
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>2</Text>
  </Pressable>
  <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background }} accessibilityRole="button" accessibilityLabel="Page 3">
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>3</Text>
  </Pressable>
  <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background }} accessibilityRole="button" accessibilityLabel="Page 4">
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>4</Text>
  </Pressable>
  <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background }} accessibilityRole="button" accessibilityLabel="Page 5">
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>5</Text>
  </Pressable>
  <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background }} accessibilityRole="button" accessibilityLabel="Page 6">
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>6</Text>
  </Pressable>
  <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background }} accessibilityRole="button" accessibilityLabel="Page 7">
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>7</Text>
  </Pressable>
  <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background }} accessibilityRole="button" accessibilityLabel="Page 8">
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>8</Text>
  </Pressable>
  <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background }} accessibilityRole="button" accessibilityLabel="Page 9">
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>9</Text>
  </Pressable>
  <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background }} accessibilityRole="button" accessibilityLabel="Page 10">
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>10</Text>
  </Pressable>
  <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background }} accessibilityRole="button" accessibilityLabel="Page 11">
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>11</Text>
  </Pressable>
  <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background }} accessibilityRole="button" accessibilityLabel="Page 12">
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>12</Text>
  </Pressable>
  <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background }} accessibilityRole="button" accessibilityLabel="Next page">
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>›</Text>
  </Pressable>
</View>
```

### with-size

**Do** — Show "Page X of N" beside the size selector and reset to page 1 when the size changes.

```tsx
<Pagination withSize defaultPage={2} total={12} defaultPageSize={10} pageSizes={[10, 25, 50]} />
```

**Don't** — Offering a page-size selector without a page indicator hides which page the new size landed on.

```tsx
<View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
    <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] }}>Rows per page</Text>
    <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4, height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background }} accessibilityRole="button" accessibilityLabel="Rows per page">
      <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>10</Text>
      <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] }}>▾</Text>
    </Pressable>
  </View>
  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
    <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background, opacity: 0.5 }} accessibilityRole="button" accessibilityLabel="Previous page">
      <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>‹</Text>
    </Pressable>
    <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background }} accessibilityRole="button" accessibilityLabel="Next page">
      <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>›</Text>
    </Pressable>
  </View>
</View>
```
