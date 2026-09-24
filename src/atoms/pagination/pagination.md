# Pagination

Page-of-N navigation for tables and lists.

Neither iOS nor Android has a numbered pagination control, and Dark Factory has no
pager, so every platform shows one look built from Dark Factory's parts: the page
numbers are bare pills, the current page is the violet pill, Previous and Next are
hairline circles around chevrons, and the rows-per-page trigger is a hairline pill. A
resting page or arrow takes the hover wash at once; a disabled pager keeps its outlines
and mutes its numbers rather than fading. The cells are the Button's heights, so a pager
lines up with a Button beside it.

In glass mode the current page is a brand-tinted control-layer puck behind its number;
the other pages and the hairline arrows paint no surface, so they stay bare. Beyond
seven pages a page change also shifts the window (an ellipsis moves, a number appears or
drops out). Solid mode keeps the violet pill.

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
  <Pressable style={{ alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 9999, borderWidth: 1, borderColor: tokens.border }} accessibilityRole="button" accessibilityLabel="Previous page">
    <Icon chevronLeft size={16} />
  </Pressable>
  <Pressable style={{ alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 9999, borderWidth: 1, borderColor: tokens.border }} accessibilityRole="button" accessibilityLabel="Next page">
    <Icon chevronRight size={16} />
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
  <Pressable style={{ alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 9999, borderWidth: 1, borderColor: tokens.border }} accessibilityRole="button" accessibilityLabel="Previous page">
    <Icon chevronLeft muted size={16} />
  </Pressable>
  <Pressable style={{ alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 9999, backgroundColor: tokens.primary }} accessibilityRole="button" accessibilityLabel="Page 1">
    <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "700", color: tokens["primary-foreground"] }}>1</Text>
  </Pressable>
  <Pressable style={{ alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 9999 }} accessibilityRole="button" accessibilityLabel="Page 2">
    <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "700", color: tokens.foreground }}>2</Text>
  </Pressable>
  <Pressable style={{ alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 9999 }} accessibilityRole="button" accessibilityLabel="Page 3">
    <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "700", color: tokens.foreground }}>3</Text>
  </Pressable>
  <Pressable style={{ alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 9999 }} accessibilityRole="button" accessibilityLabel="Page 4">
    <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "700", color: tokens.foreground }}>4</Text>
  </Pressable>
  <Pressable style={{ alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 9999 }} accessibilityRole="button" accessibilityLabel="Page 5">
    <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "700", color: tokens.foreground }}>5</Text>
  </Pressable>
  <Pressable style={{ alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 9999 }} accessibilityRole="button" accessibilityLabel="Page 6">
    <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "700", color: tokens.foreground }}>6</Text>
  </Pressable>
  <Pressable style={{ alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 9999 }} accessibilityRole="button" accessibilityLabel="Page 7">
    <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "700", color: tokens.foreground }}>7</Text>
  </Pressable>
  <Pressable style={{ alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 9999 }} accessibilityRole="button" accessibilityLabel="Page 8">
    <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "700", color: tokens.foreground }}>8</Text>
  </Pressable>
  <Pressable style={{ alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 9999 }} accessibilityRole="button" accessibilityLabel="Page 9">
    <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "700", color: tokens.foreground }}>9</Text>
  </Pressable>
  <Pressable style={{ alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 9999 }} accessibilityRole="button" accessibilityLabel="Page 10">
    <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "700", color: tokens.foreground }}>10</Text>
  </Pressable>
  <Pressable style={{ alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 9999 }} accessibilityRole="button" accessibilityLabel="Page 11">
    <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "700", color: tokens.foreground }}>11</Text>
  </Pressable>
  <Pressable style={{ alignItems: "center", justifyContent: "center", height: 36, minWidth: 36, paddingHorizontal: 10, borderRadius: 9999 }} accessibilityRole="button" accessibilityLabel="Page 12">
    <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "700", color: tokens.foreground }}>12</Text>
  </Pressable>
  <Pressable style={{ alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 9999, borderWidth: 1, borderColor: tokens.border }} accessibilityRole="button" accessibilityLabel="Next page">
    <Icon chevronRight size={16} />
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
    <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "500", color: tokens["muted-foreground"] }}>Rows per page</Text>
    <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 36, paddingHorizontal: 12, borderRadius: 9999, borderWidth: 1, borderColor: tokens.border }} accessibilityRole="button" accessibilityLabel="Rows per page">
      <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "700", color: tokens.foreground }}>10</Text>
      <Icon chevronDown muted size={16} />
    </Pressable>
  </View>
  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
    <Pressable style={{ alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 9999, borderWidth: 1, borderColor: tokens.border }} accessibilityRole="button" accessibilityLabel="Previous page">
      <Icon chevronLeft muted size={16} />
    </Pressable>
    <Pressable style={{ alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 9999, borderWidth: 1, borderColor: tokens.border }} accessibilityRole="button" accessibilityLabel="Next page">
      <Icon chevronRight size={16} />
    </Pressable>
  </View>
</View>
```
