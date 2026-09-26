# GridList

Tiled card grids for people directories, item collections, and image galleries.

The tiles are a list, as in Tailwind UI, and each tile is one of its items: a
screen reader announces the list with its number of tiles and moves through it
tile by tile. A tappable tile is a button inside its item.
The `label` prop names the list (for example "Team members").

A `virtualized` grid with a bounded height scrolls its tiles on its own. On the
web, while those tiles overflow, the grid is a keyboard tab stop (before the
tiles themselves when `onPressItem` or tile actions make them buttons), the
keyboard can scroll it, and while it has keyboard focus the grid, which has no
card around it, draws the theme's focus ring around itself. Only the tiles near
its viewport are mounted, and each says where it sits in the whole grid, so a
screen reader still counts every tile. Give a windowed grid a `label`: focused,
a list with no name is named in Chromium from the text of every tile it has
rendered, so the kit warns in development when it has none.

## Usage

Each tile action carries its own `onPress`, so every button on a card fires your handler.

```tsx
<GridList
  items={[
    { title: "Rachel Chen", subtitle: "Engineering Lead", avatar: "RC", badge: "Active", actions: [{ label: "Message", outline: true, onPress: () => {} }] },
    { title: "Ada Lovelace", subtitle: "Staff Engineer", avatar: "AL", badge: "Active", actions: [{ label: "Message", outline: true, onPress: () => {} }] },
    { title: "Kevin Turner", subtitle: "Product Designer", avatar: "KT", badge: "Away", actions: [{ label: "Message", outline: true, onPress: () => {} }] }
  ]}
/>
```

## Variants

### Gallery

```tsx
<GridList
  gallery
  cols3
  items={[
    { title: "hero-banner.png", subtitle: "1.2 MB", color: "primary" },
    { title: "icon-set.svg", subtitle: "340 KB", color: "blue-500" },
    { title: "product-shot.jpg", subtitle: "2.8 MB", color: "emerald-500" }
  ]}
/>
```

### Tappable

`onPressItem` makes every tile a button and reports the pressed index.

```tsx
<GridList
  onPressItem={() => {}}
  items={[
    { title: "Rachel Chen", subtitle: "Engineering Lead", avatar: "RC" },
    { title: "Ada Lovelace", subtitle: "Staff Engineer", avatar: "AL" },
    { title: "Kevin Turner", subtitle: "Product Designer", avatar: "KT" }
  ]}
/>
```

## Do & Don't

### People (card grid)

**Do** — Let auto-fill minmax columns size to the available width so cards wrap cleanly at any breakpoint.

```tsx
<GridList cols2 items={[
    { title: "Rachel Chen", subtitle: "Engineering Lead", avatar: "RC" },
    { title: "Ada Lovelace", subtitle: "Staff Engineer", avatar: "AL" },
    { title: "Kevin Turner", subtitle: "Product Designer", avatar: "KT" }
  ]} />
```

**Don't** — A fixed column count with hard-width cards overflows the row on narrow viewports instead of reflowing.

```tsx
<View style={{ flexDirection: "row", gap: 14 }}>
  <View style={{ width: 200, alignItems: "center", gap: 8, padding: 20, borderRadius: 8, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, ...shadow("sm") }}>
    <Avatar large name="Rachel Chen">RC</Avatar>
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "600", color: tokens["card-foreground"] }}>Rachel Chen</Text>
    <Text style={{ fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] }}>Engineering Lead</Text>
  </View>
  <View style={{ width: 200, alignItems: "center", gap: 8, padding: 20, borderRadius: 8, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, ...shadow("sm") }}>
    <Avatar large name="Ada Lovelace">AL</Avatar>
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "600", color: tokens["card-foreground"] }}>Ada Lovelace</Text>
    <Text style={{ fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] }}>Staff Engineer</Text>
  </View>
  <View style={{ width: 200, alignItems: "center", gap: 8, padding: 20, borderRadius: 8, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, ...shadow("sm") }}>
    <Avatar large name="Kevin Turner">KT</Avatar>
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "600", color: tokens["card-foreground"] }}>Kevin Turner</Text>
    <Text style={{ fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] }}>Product Designer</Text>
  </View>
</View>
```

### Image gallery

**Do** — Lock a consistent aspect ratio so the grid stays even and nothing reflows once thumbnails load.

```tsx
<GridList gallery cols3 items={[
    { title: "hero-banner.png", subtitle: "1.2 MB", color: "primary" },
    { title: "icon-set.svg", subtitle: "340 KB", color: "blue-500" },
    { title: "product-shot.jpg", subtitle: "2.8 MB", color: "emerald-500" },
    { title: "avatar-default.png", subtitle: "96 KB", color: "amber-500" }
  ]} />
```

**Don't** — Letting each thumbnail keep its intrinsic height makes a ragged grid and shifts the layout as images load.

```tsx
<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
  <View style={{ width: 140 }}>
    <View style={{ width: "100%", height: 96, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }} />
    <Text style={{ marginTop: 8, fontSize: 12.5, fontWeight: "500", color: tokens["card-foreground"] }}>hero-banner.png</Text>
  </View>
  <View style={{ width: 140 }}>
    <View style={{ width: "100%", height: 160, borderRadius: 6, backgroundColor: alpha(palette["blue-500"], 0.2) }} />
    <Text style={{ marginTop: 8, fontSize: 12.5, fontWeight: "500", color: tokens["card-foreground"] }}>icon-set.svg</Text>
  </View>
  <View style={{ width: 140 }}>
    <View style={{ width: "100%", height: 64, borderRadius: 6, backgroundColor: alpha(palette["emerald-500"], 0.2) }} />
    <Text style={{ marginTop: 8, fontSize: 12.5, fontWeight: "500", color: tokens["card-foreground"] }}>product-shot.jpg</Text>
  </View>
  <View style={{ width: 140 }}>
    <View style={{ width: "100%", height: 128, borderRadius: 6, backgroundColor: alpha(palette["amber-500"], 0.2) }} />
    <Text style={{ marginTop: 8, fontSize: 12.5, fontWeight: "500", color: tokens["card-foreground"] }}>avatar-default.png</Text>
  </View>
</View>
```
