# TabBar

Bottom app navigation: a row of equal-width destinations, each an icon over a short label, with exactly one active. The mobile idiom (the iOS 26 floating tab bar / Material 3 navigation bar), rendered through the glass functional layer.

iOS and web share the iOS 26 anatomy: a capsule that floats above the content
(which scrolls beneath it), inset from the sides, with the safe-area inset kept
under the capsule, and the selected destination raised as a capsule covering its
whole cell. Android docks the Material 3 bar full-bleed with its 56 by 32 icon
pill. In glass mode the selection is a control-layer pane on the active
destination: the cell capsule on iOS and web, the icon pill on Android. Solid
mode retains the ordinary platform surface.

## Usage

```tsx
<TabBar
  items={[
    { key: "home", label: "Home", icon: (active) => <Icon home size={22} primary={active} muted={!active} /> },
    { key: "search", label: "Search", icon: (active) => <Icon search size={22} primary={active} muted={!active} /> },
    { key: "profile", label: "Profile", icon: (active) => <Icon user size={22} primary={active} muted={!active} /> }
  ]}
/>
```

## Variants

### Controlled

```tsx
<Stateful initial="home">
  {(active, setActive) => (
    <TabBar
      active={active}
      onSelect={setActive}
      items={[
        { key: "home", label: "Home", icon: (active) => <Icon home size={22} primary={active} muted={!active} /> },
        { key: "search", label: "Search", icon: (active) => <Icon search size={22} primary={active} muted={!active} /> },
        { key: "profile", label: "Profile", icon: (active) => <Icon user size={22} primary={active} muted={!active} /> }
      ]}
    />
  )}
</Stateful>
```

## Do & Don't

### Tab Bar

**Do** — Exactly one destination carries the primary tint on both its icon and label, over the raised cell capsule on iOS and web or Material 3's active-indicator pill on Android; the rest stay muted, so the current tab is always singular and unmistakable. On web the capsule is what lets a bar and a `Sidebar` in the same app shell mark the current destination the same way across the breakpoint that swaps them.

```tsx
<TabBar
  active="home"
  onSelect={() => {}}
  items={[
    { key: "home", label: "Home", icon: (active) => <Icon home size={22} primary={active} muted={!active} /> },
    { key: "search", label: "Search", icon: (active) => <Icon search size={22} primary={active} muted={!active} /> },
    { key: "profile", label: "Profile", icon: (active) => <Icon user size={22} primary={active} muted={!active} /> }
  ]}
/>
```

**Don't** — Tinting every destination primary erases the active indicator: nothing tells you which tab is current.

```tsx
<View style={{ flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, paddingTop: 6 }}>
  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 4 }}>
    <Icon home size={22} primary />
    <Text style={{ fontSize: 11, lineHeight: 14, fontWeight: "600", color: tokens.primary }}>Home</Text>
  </View>
  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 4 }}>
    <Icon search size={22} primary />
    <Text style={{ fontSize: 11, lineHeight: 14, fontWeight: "600", color: tokens.primary }}>Search</Text>
  </View>
  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 4 }}>
    <Icon user size={22} primary />
    <Text style={{ fontSize: 11, lineHeight: 14, fontWeight: "600", color: tokens.primary }}>Profile</Text>
  </View>
</View>
```
